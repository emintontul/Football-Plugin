import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useFixture, useHeadToHead } from '@/features/fixtures/hooks/useFixtures';
import { usePredictions } from './hooks/usePredictions';
import { useCreatePrediction } from './hooks/useCreatePrediction';
import { useTranslation } from '@/i18n/TranslationProvider';
import type { HeadToHead, PredictionOutcome } from '@/types/domain';

function H2HSection({ h2h, homeTeamName, awayTeamName, locale, recentLabel }: {
  h2h: HeadToHead;
  homeTeamName: string;
  awayTeamName: string;
  locale: string;
  recentLabel: string;
}) {
  const total = h2h.homeTeamWins + h2h.awayTeamWins + h2h.draws;
  const homeW = total ? Math.round((h2h.homeTeamWins / total) * 100) : 0;
  const drawW = total ? Math.round((h2h.draws / total) * 100) : 0;
  const awayW = total ? 100 - homeW - drawW : 0;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-hippo-border bg-hippo-surface p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-hippo-muted">{recentLabel}</span>

      <div className="flex flex-col gap-1.5">
        <div className="flex overflow-hidden rounded-full" style={{ height: 6 }}>
          <div className="bg-hippo-primary transition-all" style={{ width: `${homeW}%` }} />
          <div className="bg-hippo-border transition-all" style={{ width: `${drawW}%` }} />
          <div className="bg-hippo-muted transition-all" style={{ width: `${awayW}%` }} />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-hippo-primary font-medium">{h2h.homeTeamWins}G</span>
          <span className="text-hippo-muted">{h2h.draws}B</span>
          <span className="text-hippo-muted font-medium">{h2h.awayTeamWins}G</span>
        </div>
        <div className="flex justify-between text-[10px] text-hippo-muted">
          <span className="truncate max-w-[40%]">{homeTeamName}</span>
          <span className="truncate max-w-[40%] text-right">{awayTeamName}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {h2h.recentMatches.map((m, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-hippo-secondary px-2.5 py-1.5">
            <span className="text-[10px] text-hippo-muted w-[72px] flex-shrink-0">
              {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(m.date))}
            </span>
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-medium text-hippo-fg truncate">{m.homeTeamName}</span>
              <span className="text-[11px] font-semibold tabular-nums text-hippo-fg flex-shrink-0">
                {m.homeScore}–{m.awayScore}
              </span>
              <span className="text-[11px] font-medium text-hippo-fg truncate">{m.awayTeamName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function scoreToOutcome(home: number, away: number): PredictionOutcome {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const atMin = value <= 0;
  const atMax = value >= 15;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[12px] font-semibold text-hippo-muted text-center max-w-[90px] leading-tight">{label}</span>
      <div
        className="flex flex-col items-center overflow-hidden border-2 border-hippo-primary/20 bg-hippo-surface shadow-sm"
        style={{ width: 88, borderRadius: 20 }}
      >
        <button
          onClick={() => onChange(Math.min(15, value + 1))}
          disabled={atMax}
          className={cn(
            'flex w-full items-center justify-center border-b border-hippo-border/60 transition-all',
            atMax ? 'opacity-25 cursor-not-allowed' : 'hover:bg-hippo-primary/5 active:bg-hippo-primary/10',
          )}
          style={{ height: 38, background: 'transparent' }}
        >
          <svg width="18" height="11" viewBox="0 0 16 10" fill="none">
            <path
              d="M2 8l6-6 6 6"
              stroke={atMax ? 'var(--hippo-muted-fg)' : 'var(--hippo-primary)'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex items-center justify-center" style={{ height: 64, width: '100%' }}>
          <span key={value} className="animate-score-bump text-[38px] font-bold tabular-nums text-hippo-fg">{value}</span>
        </div>

        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={atMin}
          className={cn(
            'flex w-full items-center justify-center border-t border-hippo-border/60 transition-all',
            atMin ? 'opacity-25 cursor-not-allowed' : 'hover:bg-hippo-primary/5 active:bg-hippo-primary/10',
          )}
          style={{ height: 38, background: 'transparent' }}
        >
          <svg width="18" height="11" viewBox="0 0 16 10" fill="none">
            <path
              d="M2 2l6 6 6-6"
              stroke={atMin ? 'var(--hippo-muted-fg)' : 'var(--hippo-primary)'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PredictPage() {
  const { matchId = '' } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  const { data: match, isLoading, isError } = useFixture(matchId);
  const { data: h2h, isLoading: h2hLoading, isError: h2hError } = useHeadToHead(matchId);
  const { data: allPredictions = [], isLoading: predictionsLoading } = usePredictions();
  const { mutate, isPending } = useCreatePrediction();

  const [showToast, setShowToast] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Mevcut tahmin varsa state'e yükle (sadece bir kez)
  const seeded = useRef(false);
  useEffect(() => {
    if (predictionsLoading || seeded.current) return;
    seeded.current = true;
    const existing = allPredictions.find((p) => p.matchId === matchId);
    if (!existing) return;
    setHomeScore(existing.homeScore ?? 0);
    setAwayScore(existing.awayScore ?? 0);
  }, [predictionsLoading, allPredictions, matchId]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !match) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm font-medium text-hippo-muted">{t('predict.notFound')}</p>
      </div>
    );
  }

  const existingPrediction = allPredictions.find((p) => p.matchId === matchId);

  const handleSave = () => {
    mutate(
      { matchId: match.id, outcome: scoreToOutcome(homeScore, awayScore), homeScore, awayScore },
      {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => navigate('/fixtures'), 1400);
        },
      },
    );
  };

  const kickoffFormatted = new Intl.DateTimeFormat(locale, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(match.kickoffAt));

  return (
    <div className="flex flex-col h-full bg-hippo-bg animate-slide-in-right relative">
      {/* Header */}
      <div
        className="flex flex-shrink-0 items-center gap-1 px-2 py-2.5 text-white"
        style={{ background: 'var(--hippo-primary)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center text-white transition-opacity hover:opacity-80"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M8.5 1.5L1.5 8.5l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-base font-medium">{t('predict.title')}</span>
      </div>

      {/* Hero */}
      <div
        className="flex flex-shrink-0 flex-col items-center gap-3 px-4 pb-6 pt-4 text-white"
        style={{ background: 'var(--hippo-primary)' }}
      >
        <div className="flex w-full items-center justify-center gap-5">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo shortName={match.homeTeam.shortName} size={48} />
            <span className="text-center text-[13px] font-medium leading-tight opacity-95">
              {match.homeTeam.name}
            </span>
          </div>
          <span className="flex-shrink-0 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-widest opacity-80">VS</span>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo shortName={match.awayTeam.shortName} size={48} />
            <span className="text-center text-[13px] font-medium leading-tight opacity-95">
              {match.awayTeam.name}
            </span>
          </div>
        </div>
        <p className="text-center text-xs opacity-70">
          {match.competition} · {kickoffFormatted}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 flex flex-col gap-5">
        {/* Score inputs */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-hippo-primary/25 bg-gradient-to-b from-hippo-primary/[0.07] to-transparent px-5 py-5 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <ScoreInput label={match.homeTeam.name} value={homeScore} onChange={setHomeScore} />
            <span className="text-[26px] font-light text-hippo-muted/60 select-none" style={{ marginTop: 30 }}>–</span>
            <ScoreInput label={match.awayTeam.name} value={awayScore} onChange={setAwayScore} />
          </div>
        </div>

        {/* Head to head */}
        {h2hLoading && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-hippo-border bg-hippo-surface p-4 animate-pulse">
            <div className="h-3 w-32 rounded bg-hippo-secondary" />
            <div className="h-2 w-full rounded-full bg-hippo-secondary" />
            <div className="flex flex-col gap-1">
              {[0, 1, 2].map((i) => <div key={i} className="h-7 rounded-lg bg-hippo-secondary" />)}
            </div>
          </div>
        )}
        {!h2hLoading && h2hError && (
          <div className="rounded-[14px] border border-hippo-border bg-hippo-surface px-4 py-3">
            <p className="text-[12px] text-hippo-muted">{t('predict.recentMatches')} — {t('predict.h2hUnavailable')}</p>
          </div>
        )}
        {h2h && h2h.recentMatches.length > 0 && (
          <H2HSection
            h2h={h2h}
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
            locale={locale}
            recentLabel={t('predict.recentMatches')}
          />
        )}

        {/* Scoring info */}
        <div className="flex flex-col gap-2.5 rounded-[16px] border border-hippo-border bg-hippo-surface px-4 py-3.5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-hippo-muted" style={{ letterSpacing: '0.07em' }}>{t('predict.scoringTitle')}</span>
          <div className="flex overflow-hidden rounded-[12px]" style={{ gap: 1, background: 'var(--hippo-border)' }}>
            {([
              ['3', t('predict.scoring.exact')],
              ['1', t('predict.scoring.winner')],
              ['0', t('predict.scoring.wrong')],
            ] as const).map(([pts, text], i) => (
              <div
                key={pts}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3.5',
                  i === 0 ? 'bg-hippo-success/8' : i === 1 ? 'bg-hippo-warn-bg/60' : 'bg-hippo-surface',
                )}
              >
                <span className={cn(
                  'text-[22px] font-bold tabular-nums',
                  i === 0 ? 'text-hippo-success' : i === 1 ? 'text-hippo-warn-fg' : 'text-hippo-muted',
                )}>{pts}</span>
                <span className="text-[11px] text-hippo-muted text-center px-1 leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showToast && <Toast message={t('predict.toast')} />}

      {/* Save button */}
      <div className="flex-shrink-0 border-t border-hippo-border bg-hippo-bg px-4 py-3 flex flex-col items-center gap-2">
        <Button
          size="lg"
          loading={isPending}
          disabled={isPending}
          onClick={handleSave}
          className="w-full"
        >
          {isPending ? t('predict.saving') : existingPrediction ? t('predict.update') : t('predict.save')}
        </Button>
        <span className="text-center text-[11px] text-hippo-muted">
          {t('predict.disclaimer')}
        </span>
      </div>
    </div>
  );
}
