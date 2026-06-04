import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { FixturesPage } from '@/features/fixtures/FixturesPage';
import { PredictPage } from '@/features/predictions/PredictPage';
import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/fixtures" replace /> },
      { path: 'fixtures', element: <FixturesPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'predict/:matchId', element: <PredictPage /> },
    ],
  },
]);
