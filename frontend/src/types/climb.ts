export type WeeklyClimbSummary = {
  highestGrade: string;
  location: string;
  attempts: number;
  sessions: number;
  routesSent: number;
};

export type LastClimb = {
  location: string;
  climbDate: string;
  highestGrade: string;
  totalSent: number;
  totalAttempted: number;
};

export type HistoricalClimb = {
  totalSession: number;
  totalSent: number;
  totalAttempted: number;
};
