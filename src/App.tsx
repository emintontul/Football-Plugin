import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes/router';
import { useBridge } from './bridge';
import { setBridgeForClient } from './api/client';
import { useHippoTheme } from './hooks/useHippoTheme';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';
import { TranslationProvider } from './i18n/TranslationProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function BridgeHandshake({ children }: { children: React.ReactNode }) {
  const { bridge } = useBridge();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHippoTheme();

  useEffect(() => {
    setBridgeForClient(bridge);
    bridge
      .isReady()
      .then(() => setReady(true))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Bridge handshake failed';
        setError(msg);
      });
  }, [bridge]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-hippo-bg p-6 text-center">
        <p className="text-sm text-hippo-error">{error}</p>
        <button
          className="rounded-lg bg-hippo-primary px-4 py-2 text-sm font-medium text-hippo-primary-fg"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-hippo-bg">
        <Spinner size="lg" />
        <p className="text-sm text-hippo-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BridgeHandshake>
          <TranslationProvider>
            <RouterProvider router={router} />
          </TranslationProvider>
        </BridgeHandshake>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
