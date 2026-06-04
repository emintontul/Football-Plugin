import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPrediction } from '@/api/predictions';

export function useCreatePrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrediction,
    onSuccess: (_data, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: ['predictions'] });
      void queryClient.invalidateQueries({ queryKey: ['fixtures', matchId] });
    },
  });
}
