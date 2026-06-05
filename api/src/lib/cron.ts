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

export async function settleMatch(matchId: string): Promise<{ settled: number }> {
  const fixture = await prisma.fixture.findUnique({ where: { id: matchId } });
  if (!fixture || fixture.status !== 'finished' || fixture.homeScore === null || fixture.awayScore === null) {
    return { settled: 0 };
  }
  const predictions = await prisma.prediction.findMany({
    where: { matchId, settledAt: null },
  });
  let settled = 0;
  for (const p of predictions) {
    const points = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore, outcome: p.outcome },
      { homeScore: fixture.homeScore, awayScore: fixture.awayScore },
    );
    await prisma.prediction.update({
      where: { id: p.id },
      data: { points, settledAt: new Date() },
    });
    settled += 1;
  }
  return { settled };
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
        const { settled } = await settleMatch(fx.id);
        settledTotal += settled;
      }
    } catch (err) {
      console.error(`[live] fixture ${fx.id} failed:`, err);
    }
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
