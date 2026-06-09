import cron from 'node-cron';
import { prisma } from '../db.js';
import {
  LEAGUES,
  fetchEvent,
  fetchUpcomingForLeague,
  normalizeEvent,
  type NormalizedFixture,
} from './sports-db.js';
import { computePoints } from './scoring.js';

async function upsertFixture(f: NormalizedFixture): Promise<void> {
  await prisma.fixture.upsert({
    where: { id: f.id },
    create: {
      id: f.id,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      homeBadge: f.homeBadge,
      awayBadge: f.awayBadge,
      leagueId: f.leagueId,
      leagueName: f.leagueName,
      kickoff: f.kickoff,
      status: f.status,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      halftimeHome: f.halftimeHome,
      halftimeAway: f.halftimeAway,
      minute: f.minute,
      syncedAt: new Date(),
    },
    update: {
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      homeBadge: f.homeBadge,
      awayBadge: f.awayBadge,
      leagueId: f.leagueId,
      leagueName: f.leagueName,
      kickoff: f.kickoff,
      status: f.status,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      halftimeHome: f.halftimeHome,
      halftimeAway: f.halftimeAway,
      minute: f.minute,
      syncedAt: new Date(),
    },
  });
}

export async function syncAllFixtures(): Promise<{ upserted: number }> {
  // The free TheSportsDB endpoint is per-date, so a single call already
  // pulls every league in the LEAGUES allowlist for the next 7 days — no
  // need to fan out per league anymore. LEAGUES is referenced so the
  // legacy import stays useful.
  void LEAGUES;
  let upserted = 0;
  try {
    const events = await fetchUpcomingForLeague('');
    for (const ev of events) {
      const norm = normalizeEvent(ev);
      if (!norm) continue;
      await upsertFixture(norm);
      upserted += 1;
    }
  } catch (err) {
    console.error('[sync] window fetch failed:', err);
  }
  return { upserted };
}

export type SettledResult = {
  userId: string;
  home: string;
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  homeScore: number;
  awayScore: number;
  predHome: number;
  predAway: number;
  points: number;
  correct: boolean;
};

export async function settleMatch(matchId: string): Promise<{ settled: number; results: SettledResult[] }> {
  const fixture = await prisma.fixture.findUnique({ where: { id: matchId } });
  if (!fixture || fixture.status !== 'finished' || fixture.homeScore === null || fixture.awayScore === null) {
    return { settled: 0, results: [] };
  }
  const predictions = await prisma.prediction.findMany({
    where: { matchId, settledAt: null },
  });
  const results: SettledResult[] = [];
  for (const p of predictions) {
    const points = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore, outcome: p.outcome },
      { homeScore: fixture.homeScore, awayScore: fixture.awayScore },
    );
    await prisma.prediction.update({
      where: { id: p.id },
      data: { points, settledAt: new Date() },
    });
    results.push({
      userId: p.userId,
      home: fixture.homeTeam,
      away: fixture.awayTeam,
      homeBadge: fixture.homeBadge,
      awayBadge: fixture.awayBadge,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      predHome: p.homeScore,
      predAway: p.awayScore,
      points,
      correct: points > 0,
    });
  }
  return { settled: results.length, results };
}

// After a cron tick settles matches, notify hippo-backend so it can push each
// user a "result + standing" message. Grouped per user → one message per tick.
async function notifySettlements(results: SettledResult[]): Promise<void> {
  const baseUrl = process.env.HIPPO_BACKEND_URL;
  const secret = process.env.HIPPO_INTERNAL_SECRET;
  if (!baseUrl || !secret || results.length === 0) return;

  // All-time standings snapshot: total points per user + rank.
  const settledRows = await prisma.prediction.findMany({
    where: { settledAt: { not: null } },
    select: { userId: true, points: true },
  });
  const totals = new Map<string, number>();
  for (const r of settledRows) totals.set(r.userId, (totals.get(r.userId) || 0) + (r.points || 0));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const rankOf = (uid: string) => {
    const idx = ranked.findIndex(([u]) => u === uid);
    return idx >= 0 ? idx + 1 : null;
  };

  const byUser = new Map<string, SettledResult[]>();
  for (const r of results) {
    const arr = byUser.get(r.userId) || [];
    arr.push(r);
    byUser.set(r.userId, arr);
  }

  for (const [userId, matches] of byUser) {
    const tickId = `${matches.map((m) => `${m.home}${m.homeScore}${m.awayScore}`).join('_')}`.slice(0, 70);
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/football/settled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
        body: JSON.stringify({
          hippoUserId: userId,
          matches: matches.map((m) => ({
            home: m.home, away: m.away,
            homeBadge: m.homeBadge, awayBadge: m.awayBadge,
            homeScore: m.homeScore, awayScore: m.awayScore,
            predHome: m.predHome, predAway: m.predAway,
            points: m.points, correct: m.correct,
          })),
          totalPoints: totals.get(userId) || 0,
          rank: rankOf(userId),
          tickId,
        }),
      });
      if (!res.ok) console.error(`[notify] ${userId} → HTTP ${res.status}`);
    } catch (err) {
      console.error(`[notify] ${userId} failed:`, err);
    }
  }
}

export async function refreshLiveFixtures(): Promise<{ refreshed: number; settled: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const candidates = await prisma.fixture.findMany({
    where: {
      OR: [
        { status: 'live' },
        { AND: [{ status: { not: 'finished' } }, { status: { not: 'postponed' } }, { kickoff: { gte: windowStart, lte: now } }] },
      ],
    },
  });
  let refreshed = 0;
  let settledTotal = 0;
  const tickResults: SettledResult[] = [];
  for (const fx of candidates) {
    try {
      const ev = await fetchEvent(fx.id);
      if (!ev) continue;
      const norm = normalizeEvent(ev);
      if (!norm) continue;
      const wasFinished = fx.status === 'finished';
      await upsertFixture(norm);
      refreshed += 1;
      if (!wasFinished && norm.status === 'finished') {
        const { settled, results } = await settleMatch(fx.id);
        settledTotal += settled;
        tickResults.push(...results);
      }
    } catch (err) {
      console.error(`[live] fixture ${fx.id} failed:`, err);
    }
  }
  // Notify hippo-backend once for everything settled in this tick (per user).
  if (tickResults.length > 0) {
    await notifySettlements(tickResults).catch((err) => console.error('[notify] tick failed:', err));
  }
  return { refreshed, settled: settledTotal };
}

export async function startCron(): Promise<void> {
  // Boot sync (best-effort)
  syncAllFixtures()
    .then((r) => console.log(`[cron] boot sync upserted ${r.upserted} fixtures`))
    .catch((err) => console.error('[cron] boot sync failed:', err));

  // Every 6 hours: refresh upcoming fixtures
  cron.schedule('0 */6 * * *', () => {
    syncAllFixtures()
      .then((r) => console.log(`[cron] 6h sync upserted ${r.upserted} fixtures`))
      .catch((err) => console.error('[cron] 6h sync failed:', err));
  });

  // Every 2 minutes: refresh live/in-window fixtures and settle finished ones
  cron.schedule('*/2 * * * *', () => {
    refreshLiveFixtures()
      .then((r) => {
        if (r.refreshed > 0 || r.settled > 0) {
          console.log(`[cron] live refresh: ${r.refreshed} updated, ${r.settled} predictions settled`);
        }
      })
      .catch((err) => console.error('[cron] live refresh failed:', err));
  });
}
