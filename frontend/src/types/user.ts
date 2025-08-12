export type SignUpData = {
  username: string;
  password: string;
  confirmPassword: string;
  startedClimbing: string;
  name?: string
  age?: string;
  sex?: string;
  homeCity?: string;
  homeGym?: string;
  email?: string;
};

export type UserProfile = {
  username: string;
  demography?: {
    startedClimbing: string;
    name?: string;
    age?: string;
    sex?: string;
    homeCity?: string;
    homeGym?: string;
    email?: string;
  };
  measurements?: {
    height?: string;
    weight?: string;
    gripStrength?: string;
    apeIndex?: string;
  };
};

export type SentSummaryWeek = {
    username: string;
    totalRoutesSent?: number;
}

export type SentSummary = {
    username: string;
    totalRoutesSent?: number;
    highestGrade?: string;
}
