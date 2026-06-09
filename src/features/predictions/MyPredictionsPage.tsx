import { TeamLogo } from '@/components/ui/TeamLogo';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/TranslationProvider';
import { usePredictions } from './hooks/usePredictions';
import type { Prediction } from '@/api/predictions';

function shortName(name?: string): string {
  if (!name) return '?';
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length <= 4 ? first.toUpperCase() : first.slice(0, 3).toUpperCase();
}

function PointsPill({ points }: { points: number }) {
  const color = points >= 3 ? '#22c55e' : points === 1 ? 'var(--hippo-primary)' : 'var(--hippo-error)';
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ background: color }}
    >
      +{points}
    </span>
  );
}

function PredictionCard({ p }: { p: Prediction }) {
  const { t } = useTranslation();
  const finished = p.status === 'finished' && p.finalHome != null && p.finalAway != null;
  const statusLabel = finished
    ? t('fixtures.status.finished')
    : p.status === 'live'
      ? t('fixtures.badge.live')
      : t('fixtures.pending');

  return (
    <div className="rounded-xl border border-hippo-border bg-hippo-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase text-hippo-muted" style={{ letterSpacing: '0.04em' }}>
          {p.competition ?? ''}
        </span>
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            background: p.status === 'live' ? 'var(--hippo-live)' : 'var(--hippo-secondary)',
            color: p.status === 'live' ? '#fff' : 'var(--hippo-secondary-fg)',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamLogo shortName={shortName(p.homeTeam?.name)} logoUrl={p.homeTeam?.logoUrl} size={32} />
          <span className="truncate text-[13px] font-medium text-hippo-fg">{p.homeTeam?.name ?? '?'}</span>
        </div>

        <div className="flex flex-col items-center px-3" style={{ minWidth: 76 }}>
          <span className="text-[20px] font-semibold tabular-nums text-hippo-fg">
            {p.homeScore ?? 0} - {p.awayScore ?? 0}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-hippo-muted">{t('mypredictions.predicted')}</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
          <span className="truncate text-right text-[13px] font-medium text-hippo-fg">{p.awayTeam?.name ?? '?'}</span>
          <TeamLogo shortName={shortName(p.awayTeam?.name)} logoUrl={p.awayTeam?.logoUrl} size={32} />
        </div>
      </div>

      {finished && (
        <div className="mt-2 flex items-center justify-between border-t border-hippo-border pt-2">
          <span className="text-[12px] text-hippo-muted">
            {t('mypredictions.result')}{' '}
            <span className="font-medium tabular-nums text-hippo-fg">
              {p.finalHome} - {p.finalAway}
            </span>
          </span>
          {typeof p.points === 'number' && <PointsPill points={p.points} />}
        </div>
      )}
    </div>
  );
}

export function MyPredictionsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = usePredictions();
  const list = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 pb-4 pt-3.5 text-white"
        style={{ background: 'var(--hippo-primary)' }}
      >
        <span className="text-lg font-medium">{t('mypredictions.title')}</span>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.18)' }}
          aria-label={t('leaderboard.refresh')}
        >
          <svg
            width="15" height="15" viewBox="0 0 15 15" fill="none"
            style={{ animation: isFetching ? 'spin 0.8s linear infinite' : undefined }}
          >
            <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2a5.48 5.48 0 0 1 3.89 1.61L13 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13 2v3.5H9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
        {isLoading ? (
          <PageSkeleton />
        ) : isError ? (
          <p className="py-10 text-center text-sm text-hippo-error">{t('mypredictions.error')}</p>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-hippo-muted">{t('mypredictions.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((p) => (
              <PredictionCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
