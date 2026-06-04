import { z } from 'zod';
import { apiClient } from './client';

const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  logoUrl: z.string().url().optional(),
});

const MatchSchema = z.object({
  id: z.string(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  kickoffAt: z.string().datetime(),
  status: z.enum(['scheduled', 'live', 'finished', 'postponed']),
  competition: z.string(),
  round: z.string().optional(),
  homeScore: z.number().int().optional(),
  awayScore: z.number().int().optional(),
  minute: z.number().int().optional(),
  injuryTime: z.number().int().optional(),
  halfTimeHome: z.number().int().optional(),
  halfTimeAway: z.number().int().optional(),
});

const H2HMatchSchema = z.object({
  date: z.string(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  homeScore: z.number().int(),
  awayScore: z.number().int(),
  competition: z.string(),
});

const HeadToHeadSchema = z.object({
  homeTeamWins: z.number().int(),
  awayTeamWins: z.number().int(),
  draws: z.number().int(),
  recentMatches: z.array(H2HMatchSchema),
});

const HeadToHeadResponseSchema = z.object({ data: HeadToHeadSchema });

const FixturesResponseSchema = z.object({
  data: z.array(MatchSchema),
});

const FixtureResponseSchema = z.object({
  data: MatchSchema,
});

export async function fetchFixtures() {
  const res = await apiClient.get('/fixtures');
  return FixturesResponseSchema.parse(res.data).data;
}

export async function fetchFixture(matchId: string) {
  const res = await apiClient.get(`/fixtures/${matchId}`);
  return FixtureResponseSchema.parse(res.data).data;
}

export async function fetchHeadToHead(matchId: string) {
  const res = await apiClient.get(`/fixtures/${matchId}/head2head`);
  return HeadToHeadResponseSchema.parse(res.data).data;
}
