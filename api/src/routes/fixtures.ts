import { Hono } from 'hono';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import type { Fixture } from '@prisma/client';

type Vars = { Variables: { userId: string; userName: string | null } };

const app = new Hono<Vars>();

app.use('*', requireAuth);

function shortName(team: string): string {
  // crude short name: first word, or first 3 letters uppercased
  const trimmed = team.trim();
  if (!trimmed) return team;
  const first = trimmed.split(/\s+/)[0]!;
  return first.length <= 4 ? first.toUpperCase() : first.slice(0, 3).toUpperCase();
}

function serializeFixture(fx: Fixture) {
  return {
    id: fx.id,
    homeTeam: {
      id: `${fx.id}-h`,
      name: fx.homeTeam,
      shortName: shortName(fx.homeTeam),
      ...(fx.homeBadge ? { logoUrl: fx.homeBadge } : {}),
    },
    awayTeam: {
      id: `${fx.id}-a`,
      name: fx.awayTeam,
      shortName: shortName(fx.awayTeam),
      ...(fx.awayBadge ? { logoUrl: fx.awayBadge } : {}),
    },
    kickoffAt: fx.kickoff.toISOString(),
    status: fx.status as 'scheduled' | 'live' | 'finished' | 'postponed',
    competition: fx.leagueName,
    ...(fx.homeScore !== null ? { homeScore: fx.homeScore } : {}),
    ...(fx.awayScore !== null ? { awayScore: fx.awayScore } : {}),
    ...(fx.minute !== null ? { minute: fx.minute } : {}),
    ...(fx.halftimeHome !== null ? { halfTimeHome: fx.halftimeHome } : {}),
    ...(fx.halftimeAway !== null ? { halfTimeAway: fx.halftimeAway } : {}),
  };
}

app.get('/', async (c) => {
  const fixtures = await prisma.fixture.findMany({
    orderBy: { kickoff: 'asc' },
  });
  return c.json({ data: fixtures.map(serializeFixture) });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const fixture = await prisma.fixture.findUnique({ where: { id } });
  if (!fixture) {
    return c.json({ error: 'Fixture not found' }, 404);
  }
  return c.json({ data: serializeFixture(fixture) });
});

app.get('/:id/head2head', async (c) => {
  return c.json({
    data: {
      homeTeamWins: 0,
      awayTeamWins: 0,
      draws: 0,
      recentMatches: [],
    },
  });
});

export default app;
