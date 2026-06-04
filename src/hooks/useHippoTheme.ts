import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBridge } from '@/bridge';

export function useHippoTheme() {
  const { bridge } = useBridge();

  const query = useQuery({
    queryKey: ['hippo', 'theme'],
    queryFn: () => bridge.getTheme(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!query.data) return;

    const root = document.documentElement;
    Object.entries(query.data.tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (query.data.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [query.data]);

  useEffect(() => {
    return bridge.on<{ mode: 'light' | 'dark'; tokens: Record<string, string> }>(
      'THEME_CHANGE',
      (payload) => {
        const root = document.documentElement;
        root.classList.add('theme-changing');
        Object.entries(payload.tokens).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
        if (payload.mode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        setTimeout(() => root.classList.remove('theme-changing'), 450);
      },
    );
  }, [bridge]);

  return query;
}
