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

export async function fetchLeaderboard(page = 1, limit = 50) {
  const res = await apiClient.get('/leaderboard', { params: { page, limit } });
  return LeaderboardResponseSchema.parse(res.data);
}
