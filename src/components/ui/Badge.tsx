import { cn } from '@/lib/utils';

type Tone = 'live' | 'neutral' | 'warn' | 'primary' | 'success';

type Props = { tone?: Tone; children: React.ReactNode; className?: string };

const toneClasses: Record<Tone, string> = {
  live: 'bg-hippo-live text-white',
  neutral: 'bg-hippo-secondary text-hippo-muted-fg',
  warn: 'bg-hippo-warn-bg text-hippo-warn-fg',
  primary: 'bg-hippo-primary-light text-hippo-primary',
  success: 'bg-hippo-success/15 text-hippo-success',
};

export function Badge({ tone = 'neutral', children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        toneClasses[tone],
        className,
      )}
    >
      {tone === 'live' && (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
      {children}
    </span>
  );
}
