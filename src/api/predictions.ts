import { z } from 'zod';
import { apiClient } from './client';

const PredictionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  userId: z.string(),
  outcome: z.enum(['home', 'draw', 'away']),
  homeScore: z.number().int().optional(),
  awayScore: z.number().int().optional(),
  points: z.number().optional(),
  createdAt: z.string().datetime(),
});

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
