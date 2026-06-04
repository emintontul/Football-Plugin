import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { LeaderboardEntry } from '@/types/domain';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useHippoUser } from '@/hooks/useHippoUser';
import { useTranslation } from '@/i18n/TranslationProvider';

type Period = 'all' | 'weekly' | 'monthly';

function accuracy(entry: LeaderboardEntry): string {
  if (!entry.predictionsCount) return '—';
  return Math.round((entry.correctPredictions / entry.predictionsCount) * 100) + '%';
}

const RANK_STYLES: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: '#FEF08A', text: '#854D0E', ring: '#EAB308' },
  2: { bg: '#E2E8F0', text: '#475569', ring: '#94A3B8' },
  3: { bg: '#FED7AA', text: '#9A3412', ring: '#F97316' },
};

function RankCell({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (style) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full text-[13px] font-bold tabular-nums flex-shrink-0"
        style={{
          width: 28, height: 28,
          background: style.bg,
          color: style.text,
          boxShadow: `0 0 0 1.5px ${style.ring}`,
        }}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="text-sm font-medium tabular-nums text-hippo-muted" style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
      {rank}
    </span>
  );
}

function Avatar({ name, isMe }: { name: string; isMe: boolean }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className={cn(
        'flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
        isMe ? 'bg-hippo-primary text-hippo-primary-fg' : 'bg-hippo-secondary text-hippo-secondary-fg',
      )}
    >
      {initials}
    </div>
  );
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const { data: leaderboardData, isLoading, isError, refetch, isFetching } = useLeaderboard(1, 50, period);
  const { data: currentUser } = useHippoUser();

  const entries = leaderboardData?.data ?? [];
  const myUserId = currentUser?.id;

  const me = myUserId ? entries.find((e) => e.userId === myUserId) : undefined;

  const filteredList = search.trim()
    ? entries.filter((e) => e.displayName.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const meLabel = t('leaderboard.me');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 flex flex-col gap-3 px-4 pb-4 pt-3.5 text-white"
        style={{ background: 'var(--hippo-primary)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-medium flex-shrink-0">{t('leaderboard.title')}</span>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            aria-label={t('leaderboard.refresh')}
          >
            <svg
              width="15" height="15" viewBox="0 0 15 15" fill="none"
              style={{ animation: isFetching ? 'spin 0.8s linear infinite' : undefined }}
            >
              <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2a5.48 5.48 0 0 1 3.89 1.61L13 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M13 2v3.5H9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div
            className="flex flex-1 items-center gap-1.5 h-8 rounded-full px-3"
            style={{ maxWidth: 200, background: 'rgba(255,255,255,0.18)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
              <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('leaderboard.search')}
              className="bg-transparent border-none outline-none text-xs font-normal text-white placeholder-white/60 w-full"
            />
          </div>
        </div>

        {/* Period toggle */}
        <div
          className="flex overflow-hidden rounded-full p-[2px]"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          {([
            ['all',     t('leaderboard.period.all')],
            ['weekly',  t('leaderboard.period.weekly')],
            ['monthly', t('leaderboard.period.monthly')],
          ] as Array<[Period, string]>).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={cn(
                'flex-1 h-[30px] rounded-full border-none text-xs font-medium text-white transition-all',
                period === k ? 'bg-white/25 opacity-100' : 'bg-transparent opacity-70',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
        {isLoading ? (
          <PageSkeleton />
        ) : isError ? (
          <p className="py-10 text-center text-sm text-hippo-error">{t('leaderboard.error')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* My rank card */}
            {me && (
              <div
                className="flex flex-col gap-2 rounded-xl p-3.5"
                style={{
                  border: '1.5px solid var(--hippo-primary)',
                  background: 'var(--hippo-primary-light)',
                }}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-hippo-primary" style={{ letterSpacing: '0.06em' }}>
                  {t('leaderboard.myRank')}
                </span>
                <div className="flex items-center gap-3">
                  <RankCell rank={me.rank} />
                  <Avatar name={meLabel} isMe={true} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-hippo-fg">{meLabel}</p>
                    <p className="text-[11px] text-hippo-muted">{t('leaderboard.accuracy')} {accuracy(me)}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[17px] font-medium tabular-nums text-hippo-primary">{me.totalPoints}</span>
                    <span className="text-[10px] text-hippo-muted">{t('leaderboard.points')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Column headers */}
            <div className="flex items-center px-3 py-2 text-[11px] font-medium uppercase text-hippo-muted" style={{ letterSpacing: '0.04em' }}>
              <span style={{ width: 28 }}>#</span>
              <span className="flex-1 pl-[46px]">{t('leaderboard.col.player')}</span>
              <span style={{ width: 48, textAlign: 'right' }}>{t('leaderboard.col.points')}</span>
              <span style={{ width: 56, textAlign: 'right' }}>{t('leaderboard.accuracyLabel')}</span>
            </div>

            {filteredList.length === 0 && search.trim() && (
              <p className="py-6 text-center text-sm text-hippo-muted">
                {t('leaderboard.noResults', { search })}
              </p>
            )}

            {filteredList.map((entry) => {
              const isMe = entry.userId === myUserId;
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5',
                    isMe
                      ? 'border border-hippo-primary bg-hippo-primary-light'
                      : 'border border-hippo-border bg-hippo-surface',
                  )}
                >
                  <RankCell rank={entry.rank} />
                  <Avatar name={isMe ? meLabel : entry.displayName} isMe={isMe} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-hippo-fg">
                      {isMe ? meLabel : entry.displayName}
                    </p>
                  </div>
                  <span className="flex-shrink-0 w-12 text-right text-[15px] font-medium tabular-nums text-hippo-fg">
                    {entry.totalPoints}
                  </span>
                  <span className="flex-shrink-0 w-14 text-right text-xs text-hippo-muted">
                    {accuracy(entry)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
