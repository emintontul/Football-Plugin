import { useQuery } from '@tanstack/react-query';
import { fetchFixtures, fetchFixture, fetchHeadToHead } from '@/api/fixtures';
import type { Match, HeadToHead } from '@/types/domain';

export function useFixtures() {
  return useQuery<Match[]>({
    queryKey: ['fixtures'],
    queryFn: fetchFixtures,
    staleTime: 30_000,
  });
}

export function useFixture(matchId: string) {
  return useQuery<Match>({
    queryKey: ['fixtures', matchId],
    enabled: !!matchId,
    queryFn: () => fetchFixture(matchId),
    staleTime: 30_000,
  });
}

export function useHeadToHead(matchId: string) {
  return useQuery<HeadToHead>({
    queryKey: ['h2h', matchId],
    enabled: !!matchId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchHeadToHead(matchId),
  });
}
