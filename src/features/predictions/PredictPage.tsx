import { useParams } from 'react-router-dom';

export function PredictPage() {
  const { matchId } = useParams<{ matchId: string }>();
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <p className="text-lg font-medium text-hippo-muted">
        Predict Page — placeholder (matchId: {matchId})
      </p>
    </div>
  );
}
