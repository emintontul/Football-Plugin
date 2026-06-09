import { useState, useRef, useEffect } from 'react';
import { CalendarX2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { Match, Prediction } from '@/types/domain';
import { useFixtures } from './hooks/useFixtures';
import { usePredictions } from '@/features/predictions/hooks/usePredictions';
import { useTranslation } from '@/i18n/TranslationProvider';
import type { TFn } from '@/i18n/index';

function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

type FilterKey = 'today' | 'week' | 'all';

function passesFilter(match: Match, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const t = new Date(match.kickoffAt).getTime();
  const now = Date.now();
  if (filter === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    return t >= start.getTime() && t <= end.getTime();
  }
  const weekMs = 7 * 24 * 3_600_000;
  return t >= now - 3_600_000 && t <= now + weekMs;
}

function predictionLabel(pred: Prediction, t: TFn): string {
  if (pred.homeScore != null && pred.awayScore != null) {
    return `${pred.homeScore} – ${pred.awayScore}`;
  }
  return t(`fixtures.outcome.${pred.outcome}`);
}

function calcPotentialPoints(pred: Prediction, liveHome: number, liveAway: number): number {
  const outcome = liveHome > liveAway ? 'home' : liveAway > liveHome ? 'away' : 'draw';
  if (pred.homeScore === liveHome && pred.awayScore === liveAway) return 3;
  if (pred.outcome === outcome) return 1;
  return 0;
}

function groupByDate(matches: Match[]): Array<[string, Match[]]> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = new Date(m.kickoffAt).toDateString();
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries());
}

function formatDateLabel(dateStr: string, locale: string, t: TFn): string {
  const date  = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((date.setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  const dayStr =
    diff === 0  ? t('fixtures.date.today')    :
    diff === 1  ? t('fixtures.date.tomorrow') :
    diff === -1 ? t('fixtures.date.yesterday'):
    date.toLocaleDateString(locale, { weekday: 'long' });
  const dateFormatted = new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  return `${dayStr} · ${dateFormatted}`;
}

type MatchCardProps = {
  match: Match;
  prediction?: Prediction;
  onPredict: (id: string) => void;
};

function MatchCard({ match, prediction, onPredict }: MatchCardProps) {
  const { t, locale } = useTranslation();
  const canPredict = match.status === 'scheduled' && !prediction;
  const isLive     = match.status === 'live';
  const isFinished = match.status === 'finished';

  const statusNode = (() => {
    if (isLive) {
      if (prediction && match.homeScore != null && match.awayScore != null) {
        const pts = calcPotentialPoints(prediction, match.homeScore, match.awayScore);
        const tone = pts === 3 ? 'success' : pts === 1 ? 'warn' : 'neutral';
        return <Badge tone={tone}>{t('fixtures.badge.expectedPoints', { pts })}</Badge>;
      }
      return <Badge tone="live">{t('fixtures.badge.live')}</Badge>;
    }
    if (isFinished && prediction) {
      const pts = prediction.points ?? 0;
      return (
        <span className={cn(
          'inline-flex items-center rounded-lg px-3 py-1.5 text-[12px] font-semibold tracking-wide',
          pts === 3 ? 'bg-hippo-success/15 text-hippo-success ring-1 ring-hippo-success/30' :
          pts === 1 ? 'bg-hippo-warn-bg text-hippo-warn-fg ring-1 ring-hippo-warn-fg/25' :
                      'bg-hippo-secondary text-hippo-muted-fg ring-1 ring-hippo-border',
        )}>
          {t('fixtures.badge.points', { pts })}
        </span>
      );
    }
    if (prediction) return <Badge tone="primary">{t('fixtures.badge.predicted')}</Badge>;
    if (canPredict) return <span className="text-[12px] text-hippo-muted-fg">{t('fixtures.badge.notPredicted')}</span>;
    return null;
  })();

  return (
    <Card
      padding="none"
      className={cn('overflow-hidden transition-transform active:scale-[0.975]', canPredict && 'cursor-pointer')}
      onClick={canPredict ? () => onPredict(match.id) : undefined}
    >
      <div className="flex items-center justify-between border-b border-hippo-border px-4 py-2.5">
        <span className="text-[13px] text-hippo-muted">
          {isLive
            ? match.minute != null
              ? `'${match.minute}${match.injuryTime ? `+${match.injuryTime}` : ''}`
              : `${match.homeScore ?? 0} – ${match.awayScore ?? 0}`
            : isFinished
            ? t('fixtures.status.finished')
            : formatTime(match.kickoffAt, locale)}
        </span>
        {statusNode}
      </div>

      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
          <TeamLogo shortName={match.homeTeam.shortName} logoUrl={match.homeTeam.logoUrl} size={48} />
          <span className="text-center text-[13px] font-medium leading-tight text-hippo-fg break-words">
            {match.homeTeam.name}
          </span>
        </div>

        <div className="flex flex-col items-center px-1" style={{ minWidth: 96 }}>
          {isLive || isFinished ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[28px] font-medium tabular-nums text-hippo-fg" style={{ letterSpacing: '0.04em' }}>
                {match.homeScore ?? 0} – {match.awayScore ?? 0}
              </span>
              {isFinished && match.halfTimeHome != null && match.halfTimeAway != null && (
                <span className="text-[11px] text-hippo-muted tabular-nums">
                  {t('fixtures.halfTime', { home: match.halfTimeHome, away: match.halfTimeAway })}
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onPredict(match.id); }}
              className="h-[40px] px-4 rounded-full bg-hippo-primary text-hippo-primary-fg text-[14px] font-medium transition-opacity hover:opacity-90 active:opacity-80"
            >
              {t('fixtures.predictBtn')}
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
          <TeamLogo shortName={match.awayTeam.shortName} logoUrl={match.awayTeam.logoUrl} size={48} />
          <span className="text-center text-[13px] font-medium leading-tight text-hippo-fg break-words">
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      {prediction && (() => {
        const label = predictionLabel(prediction, t);

        if (isLive && match.homeScore != null && match.awayScore != null) {
          const pts = calcPotentialPoints(prediction, match.homeScore, match.awayScore);
          const [bg, border, text] =
            pts === 3 ? ['bg-hippo-success/10', 'border-hippo-success/30', 'text-hippo-success'] :
            pts === 1 ? ['bg-hippo-warn-bg',    'border-hippo-warn-fg/25', 'text-hippo-warn-fg'] :
                        ['bg-hippo-secondary',  'border-hippo-border',     'text-hippo-muted'];
          return (
            <div className={cn('flex items-center border-t px-4 py-2.5', bg, border)}>
              <span className={cn('text-[12px] font-medium', text)}>
                {t('fixtures.myPrediction', { label })}
              </span>
            </div>
          );
        }

        if (isFinished) {
          return (
            <div className="flex items-center border-t border-hippo-border bg-hippo-secondary px-4 py-2.5">
              <span className="text-[12px] text-hippo-muted">
                {t('fixtures.myPrediction', { label })}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-between border-t border-hippo-primary/20 bg-hippo-primary-light px-4 py-2.5">
            <span className="text-[12px] font-medium text-hippo-primary">
              {t('fixtures.myPrediction', { label })}
            </span>
            <span className="rounded-full border border-hippo-primary/30 bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold text-hippo-primary">
              {t('fixtures.pending')}
            </span>
          </div>
        );
      })()}
    </Card>
  );
}

export function FixturesPage() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [league, setLeague]         = useState<string>('all');
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);

  const { data: fixtures = [], isLoading, isError, refetch, isFetching } = useFixtures();
  const { data: myPredictions = [] } = usePredictions();
  const predictionsMap = new Map(myPredictions.map((p) => [p.matchId, p]));

  const competitions = [...new Set(fixtures.map((m) => m.competition))];

  const filtered = fixtures
    .filter((m) => league === 'all' || m.competition === league)
    .filter((m) => passesFilter(m, filter));

  const groups = groupByDate(filtered);
  const leagueLabel = league === 'all' ? t('fixtures.allLeagues') : league;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!leagueOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLeagueOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [leagueOpen]);

  const handlePredict = (matchId: string) => {
    navigate(`/predict/${matchId}`);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex-shrink-0 bg-hippo-primary px-4 py-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-medium flex-shrink-0">{t('fixtures.title')}</span>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.18)', flexShrink: 0 }}
            aria-label={t('fixtures.refresh')}
          >
            <svg
              width="15" height="15" viewBox="0 0 15 15" fill="none"
              style={{ animation: isFetching ? 'spin 0.8s linear infinite' : undefined }}
            >
              <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2a5.48 5.48 0 0 1 3.89 1.61L13 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M13 2v3.5H9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setLeagueOpen((v) => !v)}
              className="flex items-center gap-1.5 h-[30px] px-3 rounded-full text-xs font-medium text-white"
              style={{
                background: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.35)',
                maxWidth: 160,
              }}
            >
              <span className="truncate">{leagueLabel}</span>
              <svg
                width="10" height="6" viewBox="0 0 10 6" fill="none"
                style={{ flexShrink: 0, transform: leagueOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
              >
                <path d="M1 1l4 4 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {leagueOpen && (
              <div className="animate-dropdown-in absolute right-0 top-full mt-1 z-50 overflow-hidden rounded-xl border border-hippo-border bg-hippo-surface shadow-sm" style={{ minWidth: 180 }}>
                {([['all', t('fixtures.allLeagues')]] as Array<[string, string]>)
                  .concat(competitions.map((c) => [c, c]))
                  .map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setLeague(key); setLeagueOpen(false); }}
                      className={cn(
                        'flex w-full items-center px-3.5 py-2.5 text-[13px] border-b border-hippo-border last:border-b-0 transition-colors',
                        league === key
                          ? 'font-medium text-hippo-primary bg-hippo-primary-light'
                          : 'text-hippo-fg hover:bg-hippo-secondary',
                      )}
                    >
                      {label}
                      {league === key && <span className="ml-auto text-hippo-primary text-sm">✓</span>}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className={cn('flex-shrink-0 flex gap-2 px-4 py-3 border-b border-hippo-border bg-hippo-bg transition-shadow duration-300', scrolled && 'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]')}>
        {([
          ['all',   t('fixtures.filter.all')],
          ['today', t('fixtures.filter.today')],
          ['week',  t('fixtures.filter.week')],
        ] as Array<[FilterKey, string]>).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap',
              filter === key
                ? 'bg-hippo-primary text-hippo-primary-fg'
                : 'bg-hippo-secondary text-hippo-secondary-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 pb-6">
        {isLoading ? (
          <PageSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm text-hippo-error font-medium">{t('fixtures.error')}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <CalendarX2 size={36} strokeWidth={1.4} className="text-hippo-muted" />
            <p className="text-sm text-hippo-muted font-medium">{t('fixtures.empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(([dateKey, matches], gi) => (
              <section
                key={dateKey}
                className="flex flex-col gap-2 animate-fade-slide-up"
                style={{ animationDelay: `${gi * 70}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-hippo-primary uppercase tracking-wide" style={{ letterSpacing: '0.06em' }}>
                    {formatDateLabel(dateKey, locale, t)}
                  </span>
                  <div className="flex-1 h-px bg-hippo-border" />
                </div>
                {matches.map((m, mi) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-0.5 animate-fade-slide-up"
                    style={{ animationDelay: `${gi * 70 + mi * 45 + 40}ms` }}
                  >
                    <span className="text-[11px] text-hippo-muted px-0.5">{m.competition}</span>
                    <MatchCard
                      match={m}
                      prediction={predictionsMap.get(m.id)}
                      onPredict={handlePredict}
                    />
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
