import { z } from 'zod';
import { apiClient } from './client';

const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  totalPoints: z.number(),
  predictionsCount: z.number().int(),
  correctPredictions: z.number().int(),
});

const LeaderboardResponseSchema = z.object({
  data: z.array(LeaderboardEntrySchema),
  total: z.number().int(),
});

export type LeaderboardPeriod = 'all' | 'weekly' | 'monthly';

export async function fetchLeaderboard(page = 1, limit = 50, period: LeaderboardPeriod = 'all') {
  const params: Record<string, unknown> = { page, limit };
  if (period !== 'all') params['period'] = period;
  const res = await apiClient.get('/leaderboard', { params });
  return LeaderboardResponseSchema.parse(res.data);
}
