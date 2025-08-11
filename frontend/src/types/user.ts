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
  startedClimbing: string; // ISO date
  joinDate: string;        // ISO date
};
