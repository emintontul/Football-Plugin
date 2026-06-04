import { useQuery } from '@tanstack/react-query';
import { fetchPredictions } from '@/api/predictions';

export function usePredictions() {
  return useQuery({
    queryKey: ['predictions'],
    queryFn: fetchPredictions,
    staleTime: 60_000,
  });
}
