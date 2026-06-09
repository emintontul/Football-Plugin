const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// Allowlist of leagues the marketplace surfaces. Popular international /
// top-European competitions plus German lower divisions (4BRO is German-
// focused). When none of these have matches in the window, the cron falls
// back to any Soccer event so the UI is never empty.
export const LEAGUES = [
  // International / popular tournaments
  '4429', // FIFA World Cup
  '4503', // FIFA Club World Cup
  '4502', // UEFA Euro
  '4480', // UEFA Champions League
  '4481', // UEFA Europa League
  // Top European leagues
  '4328', // English Premier League
  '4335', // Spanish La Liga
  '4332', // Italian Serie A
  '4334', // French Ligue 1
  '4339', // Turkish Süper Lig
  // German football (top + lower divisions)
  '4331', // German Bundesliga
  '4399', // German 2. Bundesliga
  '4485', // DFB-Pokal
  '4748', // German Regionalliga Bayern
  '4749', // German Regionalliga Nordost
] as const;

export type TheSportsDBEvent = {
  idEvent: string;
  strEvent?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  idLeague?: string | null;
  strLeague?: string | null;
  strSeason?: string | null;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strStatus?: string | null;
  strProgress?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  intHomeScoreHT?: string | null;
  intAwayScoreHT?: string | null;
};

export type NormalizedFixture = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string | null;
  awayBadge: string | null;
  leagueId: string;
  leagueName: string;
  kickoff: Date;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeScore: number | null;
  awayScore: number | null;
  halftimeHome: number | null;
  halftimeAway: number | null;
  minute: number | null;
};

function toInt(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapStatus(raw: string | null | undefined, progress: string | null | undefined): NormalizedFixture['status'] {
  const s = `${raw ?? ''} ${progress ?? ''}`.toLowerCase();
  if (!s.trim()) return 'scheduled';
  if (s.includes('postponed') || s.includes('cancelled') || s.includes('canceled')) return 'postponed';
  if (s.includes('finished') || s.includes('ft') || s.includes('full time') || s.includes('aet') || s.includes('pen.')) return 'finished';
  if (s.includes('1h') || s.includes('2h') || s.includes('halftime') || s.includes('ht') || s.includes('live') || /\b\d{1,3}'\b/.test(s)) return 'live';
  if (s.includes('not started') || s.includes('scheduled') || s.includes('ns')) return 'scheduled';
  return 'scheduled';
}

function parseMinute(progress: string | null | undefined): number | null {
  if (!progress) return null;
  const m = /(\d{1,3})/.exec(progress);
  return m ? parseInt(m[1]!, 10) : null;
}

function parseKickoff(ev: TheSportsDBEvent): Date | null {
  if (ev.strTimestamp) {
    const d = new Date(ev.strTimestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (ev.dateEvent) {
    const time = ev.strTime && ev.strTime.length >= 5 ? ev.strTime : '00:00:00';
    const iso = `${ev.dateEvent}T${time.length === 5 ? `${time}:00` : time}Z`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function normalizeEvent(ev: TheSportsDBEvent): NormalizedFixture | null {
  if (!ev.idEvent || !ev.strHomeTeam || !ev.strAwayTeam) return null;
  const kickoff = parseKickoff(ev);
  if (!kickoff) return null;
  const status = mapStatus(ev.strStatus, ev.strProgress);
  return {
    id: ev.idEvent,
    homeTeam: ev.strHomeTeam,
    awayTeam: ev.strAwayTeam,
    homeBadge: ev.strHomeTeamBadge ?? null,
    awayBadge: ev.strAwayTeamBadge ?? null,
    leagueId: ev.idLeague ?? '',
    leagueName: ev.strLeague ?? '',
    kickoff,
    status,
    homeScore: toInt(ev.intHomeScore),
    awayScore: toInt(ev.intAwayScore),
    halftimeHome: toInt(ev.intHomeScoreHT),
    halftimeAway: toInt(ev.intAwayScoreHT),
    minute: status === 'live' ? parseMinute(ev.strProgress) : null,
  };
}

async function fetchEvents(url: string): Promise<TheSportsDBEvent[]> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`TheSportsDB request failed: ${res.status} ${url}`);
  }
  const body = (await res.json()) as { events: TheSportsDBEvent[] | null };
  return body.events ?? [];
}

// eventsnextleague / eventspastleague require a paid TheSportsDB key. The
// free /3/ key only exposes per-day queries, so we walk a date window. The
// LEAGUES allowlist (top-5 European) is honored when those leagues have
// active matches; otherwise (off-season summer window) we surface whatever
// Soccer events the day returns so the marketplace UI isn't empty.
const LEAGUE_SET = new Set<string>(LEAGUES);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchEventsForDate(date: string): Promise<TheSportsDBEvent[]> {
  return fetchEvents(`${BASE}/eventsday.php?d=${date}&s=Soccer`);
}

async function fetchEventsInWindow(startDays: number, endDays: number): Promise<TheSportsDBEvent[]> {
  const matched: TheSportsDBEvent[] = [];
  const fallback: TheSportsDBEvent[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = startDays; i <= endDays; i++) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() + i);
    const events = await fetchEventsForDate(isoDate(day));
    for (const ev of events) {
      if (ev.idLeague && LEAGUE_SET.has(ev.idLeague)) matched.push(ev);
      else fallback.push(ev);
    }
  }
  return matched.length > 0 ? matched : fallback;
}

export async function fetchUpcomingForLeague(_leagueId: string): Promise<TheSportsDBEvent[]> {
  // Kept signature-compatible with the cron's old per-league fan-out, but
  // collapsed to a single window fetch — we filter client-side anyway.
  return fetchEventsInWindow(0, 7);
}

export async function fetchPastForLeague(_leagueId: string): Promise<TheSportsDBEvent[]> {
  return fetchEventsInWindow(-3, 0);
}

export async function fetchEvent(eventId: string): Promise<TheSportsDBEvent | null> {
  const events = await fetchEvents(`${BASE}/lookupevent.php?id=${encodeURIComponent(eventId)}`);
  return events[0] ?? null;
}
