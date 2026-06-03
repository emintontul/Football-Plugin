import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useOnline } from '@/hooks/useOnline';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function AppLayout() {
  const online = useOnline();

  return (
    <div className="flex h-screen flex-col bg-hippo-bg text-hippo-fg">
      {!online && (
        <div className="flex items-center justify-center bg-hippo-error/10 px-4 py-1.5 text-xs font-medium text-hippo-error">
          You are offline — predictions may not save
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="border-t border-hippo-border bg-hippo-surface">
        <div className="flex">
          <NavItem to="/fixtures" label="Fixtures" icon="⚽" />
          <NavItem to="/leaderboard" label="Leaderboard" icon="🏆" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
          isActive ? 'text-hippo-primary' : 'text-hippo-muted',
        )
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </NavLink>
  );
}
