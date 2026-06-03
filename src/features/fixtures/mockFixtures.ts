import type { Match } from '@/types/domain';

const now = new Date();
const d = (offsetHours: number) =>
  new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();

export const MOCK_FIXTURES: Match[] = [
  {
    id: 'match-1',
    competition: 'Premier League',
    round: 'Matchday 34',
    status: 'live',
    kickoffAt: d(-1),
    homeTeam: { id: 't1', name: 'Arsenal', shortName: 'ARS' },
    awayTeam: { id: 't2', name: 'Manchester City', shortName: 'MCI' },
    homeScore: 1,
    awayScore: 1,
  },
  {
    id: 'match-2',
    competition: 'Premier League',
    round: 'Matchday 34',
    status: 'scheduled',
    kickoffAt: d(2),
    homeTeam: { id: 't3', name: 'Liverpool', shortName: 'LIV' },
    awayTeam: { id: 't4', name: 'Chelsea', shortName: 'CHE' },
  },
  {
    id: 'match-3',
    competition: 'Premier League',
    round: 'Matchday 34',
    status: 'scheduled',
    kickoffAt: d(5),
    homeTeam: { id: 't5', name: 'Tottenham', shortName: 'TOT' },
    awayTeam: { id: 't6', name: 'Manchester United', shortName: 'MUN' },
  },
  {
    id: 'match-4',
    competition: 'La Liga',
    round: 'Jornada 33',
    status: 'finished',
    kickoffAt: d(-26),
    homeTeam: { id: 't7', name: 'Real Madrid', shortName: 'RMA' },
    awayTeam: { id: 't8', name: 'FC Barcelona', shortName: 'BAR' },
    homeScore: 2,
    awayScore: 3,
  },
  {
    id: 'match-5',
    competition: 'La Liga',
    round: 'Jornada 33',
    status: 'finished',
    kickoffAt: d(-24),
    homeTeam: { id: 't9', name: 'Atletico Madrid', shortName: 'ATM' },
    awayTeam: { id: 't10', name: 'Sevilla', shortName: 'SEV' },
    homeScore: 1,
    awayScore: 0,
  },
  {
    id: 'match-6',
    competition: 'Bundesliga',
    round: 'Spieltag 31',
    status: 'scheduled',
    kickoffAt: d(28),
    homeTeam: { id: 't11', name: 'Bayern Munich', shortName: 'BAY' },
    awayTeam: { id: 't12', name: 'Borussia Dortmund', shortName: 'BVB' },
  },
  {
    id: 'match-7',
    competition: 'Serie A',
    round: 'Giornata 35',
    status: 'postponed',
    kickoffAt: d(50),
    homeTeam: { id: 't13', name: 'Juventus', shortName: 'JUV' },
    awayTeam: { id: 't14', name: 'AC Milan', shortName: 'MIL' },
  },
];
