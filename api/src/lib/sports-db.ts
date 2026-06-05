const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export const LEAGUES = ['4328', '4335', '4332', '4331', '4480'] as const;

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

export async function fetchUpcomingForLeague(leagueId: string): Promise<TheSportsDBEvent[]> {
  return fetchEvents(`${BASE}/eventsnextleague.php?id=${encodeURIComponent(leagueId)}`);
}

export async function fetchPastForLeague(leagueId: string): Promise<TheSportsDBEvent[]> {
  return fetchEvents(`${BASE}/eventspastleague.php?id=${encodeURIComponent(leagueId)}`);
}

export async function fetchEvent(eventId: string): Promise<TheSportsDBEvent | null> {
  const events = await fetchEvents(`${BASE}/lookupevent.php?id=${encodeURIComponent(eventId)}`);
  return events[0] ?? null;
}
