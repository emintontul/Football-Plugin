import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Match, MatchStatus } from '@/types/domain';
import { MOCK_FIXTURES } from './mockFixtures';

const STATUS_LABEL: Record<MatchStatus, string> = {
  live: 'LIVE',
  scheduled: 'Upcoming',
  finished: 'FT',
  postponed: 'Postponed',
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  live: 'bg-red-500 text-white',
  scheduled: 'bg-hippo-secondary text-hippo-muted-fg',
  finished: 'bg-hippo-secondary text-hippo-muted-fg',
  postponed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function groupByCompetition(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const list = map.get(m.competition) ?? [];
    list.push(m);
    map.set(m.competition, list);
  }
  return map;
}

function MatchCard({ match }: { match: Match }) {
  const navigate = useNavigate();
  const canPredict = match.status === 'scheduled';

  return (
    <Card
      padding="none"
      className={cn('overflow-hidden', canPredict && 'cursor-pointer active:opacity-80')}
      onClick={canPredict ? () => navigate(`/predict/${match.id}`) : undefined}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home team */}
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <span className="text-2xl leading-none">🏟️</span>
          <span className="text-xs font-semibold text-hippo-fg">{match.homeTeam.shortName}</span>
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center gap-1 px-4">
          {match.status === 'live' || match.status === 'finished' ? (
            <span className="text-xl font-bold tabular-nums text-hippo-fg">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-xs text-hippo-muted">{formatKickoff(match.kickoffAt)}</span>
          )}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              STATUS_COLOR[match.status],
            )}
          >
            {STATUS_LABEL[match.status]}
          </span>
        </div>

        {/* Away team */}
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <span className="text-2xl leading-none">✈️</span>
          <span className="text-xs font-semibold text-hippo-fg">{match.awayTeam.shortName}</span>
        </div>
      </div>

      {canPredict && (
        <div className="border-t border-hippo-border bg-hippo-primary/5 px-4 py-1.5 text-center text-[11px] font-medium text-hippo-primary">
          Tap to predict →
        </div>
      )}
    </Card>
  );
}

export function FixturesPage() {
  const groups = groupByCompetition(MOCK_FIXTURES);

  return (
    <div className="flex flex-col gap-6 p-4 pb-6">
      <h1 className="text-xl font-bold text-hippo-fg">Fixtures</h1>

      {Array.from(groups.entries()).map(([competition, matches]) => (
        <section key={competition} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-hippo-muted">
            {competition}
          </h2>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>
      ))}
    </div>
  );
}
