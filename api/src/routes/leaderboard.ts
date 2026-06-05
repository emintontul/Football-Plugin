import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

type Vars = { Variables: { userId: string; userName: string | null } };

const app = new Hono<Vars>();

app.use('*', requireAuth);

const querySchema = z.object({
  period: z.enum(['all', 'week', 'weekly', 'month', 'monthly']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function startOfWeekUTC(now: Date): Date {
  // Monday 00:00:00 UTC
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function startOfMonthUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

type Row = {
  userId: string;
  name: string | null;
  points: number;
  predictionsCount: number;
  correctPredictions: number;
};

app.get('/', async (c) => {
  const userId = c.get('userId');
  const parsed = querySchema.safeParse({
    period: c.req.query('period'),
    limit: c.req.query('limit'),
  });
  if (!parsed.success) {
    return c.json({ error: 'Invalid query', details: parsed.error.flatten() }, 400);
  }
  const periodRaw = parsed.data.period ?? 'all';
  const limit = parsed.data.limit ?? 50;

  const now = new Date();
  let settledSince: Date | null = null;
  if (periodRaw === 'week' || periodRaw === 'weekly') settledSince = startOfWeekUTC(now);
  else if (periodRaw === 'month' || periodRaw === 'monthly') settledSince = startOfMonthUTC(now);

  // Aggregate per user. Only settled predictions count toward points.
  const settledWhere = {
    settledAt: settledSince ? { gte: settledSince } : { not: null },
  } as const;

  const grouped = await prisma.prediction.groupBy({
    by: ['userId'],
    where: settledWhere,
    _sum: { points: true },
    _count: { _all: true },
  });

  const correctGrouped = await prisma.prediction.groupBy({
    by: ['userId'],
    where: { ...settledWhere, points: { gt: 0 } },
    _count: { _all: true },
  });
  const correctByUser = new Map<string, number>();
  for (const g of correctGrouped) correctByUser.set(g.userId, g._count._all);

  const userIds = grouped.map((g) => g.userId);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const nameByUser = new Map(users.map((u) => [u.id, u.name]));

  const rows: Row[] = grouped.map((g) => ({
    userId: g.userId,
    name: nameByUser.get(g.userId) ?? null,
    points: g._sum.points ?? 0,
    predictionsCount: g._count._all,
    correctPredictions: correctByUser.get(g.userId) ?? 0,
  }));
  rows.sort((a, b) => b.points - a.points || b.correctPredictions - a.correctPredictions);

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  const top = ranked.slice(0, limit);

  // Build entries in the frontend's expected shape
  const entries = top.map((r) => ({
    rank: r.rank,
    userId: r.userId,
    displayName: r.name ?? `Player ${r.userId.slice(0, 6)}`,
    totalPoints: r.points,
    predictionsCount: r.predictionsCount,
    correctPredictions: r.correctPredictions,
  }));

  // me: current user's row, regardless of inclusion in top
  let me: (typeof entries)[number] | null = null;
  const meRow = ranked.find((r) => r.userId === userId);
  if (meRow) {
    me = {
      rank: meRow.rank,
      userId: meRow.userId,
      displayName: meRow.name ?? `Player ${meRow.userId.slice(0, 6)}`,
      totalPoints: meRow.points,
      predictionsCount: meRow.predictionsCount,
      correctPredictions: meRow.correctPredictions,
    };
  }

  return c.json({
    data: entries,
    total: ranked.length,
    me,
  });
});

export default app;
