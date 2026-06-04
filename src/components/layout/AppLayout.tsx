import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, Trophy } from 'lucide-react';
import { useOnline } from '@/hooks/useOnline';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/TranslationProvider';
import type { LucideIcon } from 'lucide-react';

function SlidingIndicator({ tabs }: { tabs: Array<{ to: string }> }) {
  const { pathname } = useLocation();
  const idx = tabs.findIndex((tab) => pathname.startsWith(tab.to));
  if (idx < 0) return null;
  return (
    <span
      className="pointer-events-none absolute top-0 h-[2px] rounded-full bg-hippo-primary"
      style={{
        width: `${100 / tabs.length}%`,
        left: `${(idx * 100) / tabs.length}%`,
        transition: 'left 300ms cubic-bezier(.34,1.56,.64,1)',
      }}
    />
  );
}

export function AppLayout() {
  const online = useOnline();
  const { t } = useTranslation();

  const TABS: Array<{ to: string; label: string; Icon: LucideIcon }> = [
    { to: '/fixtures',    label: t('fixtures.title'),    Icon: CalendarDays },
    { to: '/leaderboard', label: t('leaderboard.title'), Icon: Trophy },
  ];

  return (
    <div className="flex h-screen flex-col bg-hippo-bg text-hippo-fg" style={{ fontFamily: 'var(--hippo-font)' }}>
      {!online && (
        <div className="flex items-center justify-center bg-hippo-error/10 px-4 py-1.5 text-xs font-medium text-hippo-error">
          {t('common.offline')}
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="relative border-t border-hippo-border bg-hippo-surface" style={{ flexShrink: 0 }}>
        <SlidingIndicator tabs={TABS} />
        <div className="flex">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{
                      transition: 'transform 280ms cubic-bezier(.34,1.56,.64,1), color 200ms ease',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      color: isActive ? 'var(--hippo-primary)' : 'var(--hippo-muted)',
                    }}
                  />
                  <span
                    style={{
                      transition: 'color 200ms ease',
                      color: isActive ? 'var(--hippo-primary)' : 'var(--hippo-muted)',
                    }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
