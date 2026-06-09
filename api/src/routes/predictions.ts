import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { deriveOutcome } from '../lib/scoring.js';
import type { Prediction, Fixture } from '@prisma/client';

type Vars = { Variables: { userId: string; userName: string | null } };

const app = new Hono<Vars>();

app.use('*', requireAuth);

const createSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(15),
  awayScore: z.number().int().min(0).max(15),
});

function serialize(p: Prediction & { fixture?: Fixture | null }) {
  return {
    id: p.id,
    matchId: p.matchId,
    userId: p.userId,
    outcome: p.outcome as 'home' | 'draw' | 'away',
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    ...(p.points !== null ? { points: p.points } : {}),
    createdAt: p.createdAt.toISOString(),
    ...(p.fixture
      ? {
          homeTeam: {
            name: p.fixture.homeTeam,
            ...(p.fixture.homeBadge ? { logoUrl: p.fixture.homeBadge } : {}),
          },
          awayTeam: {
            name: p.fixture.awayTeam,
            ...(p.fixture.awayBadge ? { logoUrl: p.fixture.awayBadge } : {}),
          },
        }
      : {}),
  };
}

app.get('/', async (c) => {
  const userId = c.get('userId');
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { fixture: true },
  });
  return c.json({ data: predictions.map(serialize) });
});

app.post('/', async (c) => {
  const userId = c.get('userId');
  const userName = c.get('userName');

  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { matchId, homeScore, awayScore } = parsed.data;

  const fixture = await prisma.fixture.findUnique({ where: { id: matchId } });
  if (!fixture) {
    return c.json({ error: 'Fixture not found' }, 404);
  }
  if (fixture.kickoff.getTime() <= Date.now()) {
    return c.json({ error: 'Match already started' }, 400);
  }

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, name: userName },
    update: userName ? { name: userName } : {},
  });

  const outcome = deriveOutcome(homeScore, awayScore);

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: {
      userId,
      matchId,
      homeScore,
      awayScore,
      outcome,
    },
    update: {
      homeScore,
      awayScore,
      outcome,
      // resetting points if user re-predicts before kickoff
      points: null,
      settledAt: null,
    },
    include: { fixture: true },
  });

  return c.json(serialize(prediction));
});

export default app;
