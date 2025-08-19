export type WeeklyClimbSummary = {
  totalSession: string;
  totalSent: number;
  totalAttempted: number;
};

export type LastClimb = {
  location: string;
  climbDate: string;
  highestGrade: string;
  totalSent: number;
  totalAttempted: number;
};

export type HistoricalClimb = {
  sent: number;
  attempted: number;
  flashes: number;
  best: string;
  sentPct: string;
  climbDay: string;
  location?: string;
};
