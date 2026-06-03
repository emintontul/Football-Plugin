import { useQuery } from '@tanstack/react-query';
import { useBridge } from '@/bridge';

export function useHippoUser() {
  const { bridge } = useBridge();
  return useQuery({
    queryKey: ['hippo', 'user'],
    queryFn: () => bridge.getUser(),
    staleTime: Infinity,
  });
}
