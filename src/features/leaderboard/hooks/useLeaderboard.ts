import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, type LeaderboardPeriod } from '@/api/leaderboard';
import type { LeaderboardEntry } from '@/types/domain';

type LeaderboardResult = { data: LeaderboardEntry[]; total: number };

export function useLeaderboard(page = 1, limit = 50, period: LeaderboardPeriod = 'all') {
  return useQuery<LeaderboardResult>({
    queryKey: ['leaderboard', page, limit, period],
    queryFn: () => fetchLeaderboard(page, limit, period),
    staleTime: 30_000,
  });
}
