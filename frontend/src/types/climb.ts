export type WeeklyClimbSummary = {
  highestGrade: string;
  location: string;
  attempts: number;
  sessions: number;
  routesSent: number;
};

export type LastClimb = {
  location: string;
  climbedOn: string;
  routesSent: number;
  attempts: number;
  highestGrade: string;
}

export type HistoricalClimb = {
    sent: number;
    attempted: number;
    flashes: number;
    best: string;
    sentPct: string;
    climbDay: string;
}
