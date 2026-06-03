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
});

const FixturesResponseSchema = z.object({
  data: z.array(MatchSchema),
});

export async function fetchFixtures() {
  const res = await apiClient.get('/fixtures');
  return FixturesResponseSchema.parse(res.data).data;
}
