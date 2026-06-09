import { z } from 'zod';
import { apiClient } from './client';

const PredictionTeamSchema = z.object({
  name: z.string(),
  logoUrl: z.string().url().optional(),
});

const PredictionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  userId: z.string(),
  outcome: z.enum(['home', 'draw', 'away']),
  homeScore: z.number().int().optional(),
  awayScore: z.number().int().optional(),
  points: z.number().optional(),
  createdAt: z.string().datetime(),
  homeTeam: PredictionTeamSchema.optional(),
  awayTeam: PredictionTeamSchema.optional(),
  kickoffAt: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'live', 'finished', 'postponed']).optional(),
  competition: z.string().optional(),
  finalHome: z.number().int().optional(),
  finalAway: z.number().int().optional(),
});

export type Prediction = z.infer<typeof PredictionSchema>;

const PredictionsResponseSchema = z.object({
  data: z.array(PredictionSchema),
});

export type CreatePredictionInput = {
  matchId: string;
  outcome: 'home' | 'draw' | 'away';
  homeScore?: number;
  awayScore?: number;
};

export async function fetchPredictions() {
  const res = await apiClient.get('/predictions');
  return PredictionsResponseSchema.parse(res.data).data;
}

export async function createPrediction(input: CreatePredictionInput) {
  const res = await apiClient.post('/predictions', input);
  return PredictionSchema.parse(res.data);
}
