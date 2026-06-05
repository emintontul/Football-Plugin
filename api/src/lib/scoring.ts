export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  outcome: string;
};

export type ResultInput = {
  homeScore: number;
  awayScore: number;
};

export function computePoints(pred: PredictionInput, result: ResultInput): number {
  if (pred.homeScore === result.homeScore && pred.awayScore === result.awayScore) {
    return 3;
  }
  const actualOutcome =
    result.homeScore > result.awayScore
      ? 'home'
      : result.homeScore < result.awayScore
        ? 'away'
        : 'draw';
  if (pred.outcome === actualOutcome) return 1;
  return 0;
}

export function deriveOutcome(homeScore: number, awayScore: number): 'home' | 'draw' | 'away' {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}
