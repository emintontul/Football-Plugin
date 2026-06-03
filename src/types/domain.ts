export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoffAt: string;
  status: MatchStatus;
  competition: string;
  round?: string;
  homeScore?: number;
  awayScore?: number;
}

export type PredictionOutcome = 'home' | 'draw' | 'away';

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  outcome: PredictionOutcome;
  homeScore?: number;
  awayScore?: number;
  points?: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  predictionsCount: number;
  correctPredictions: number;
}
