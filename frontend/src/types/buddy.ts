export type BuddyRole = 'owner' | 'viewer';

export type BuddySummary = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  your_role: BuddyRole;
};

export type BuddyMember = {
  user_id: string;
  username: string;
  name: string | null;
  role: BuddyRole;
  joined_at: string;
};

export type BuddyDetail = {
  id: string;
  name: string;
  created_at: string;
  your_role: BuddyRole;
  members: BuddyMember[];
};

export type BuddyInvite = {
  id: string;
  buddy_id: string;
  group_name: string;
  invited_by_username: string;
  invited_by_name: string | null;
  created_at: string;
};

export type PlannedClimb = {
  id: string;
  gym: string;
  city: string | null;
  country: string | null;
  planned_date: string;
  planned_time: string | null;
  buddy_ids?: string[];
};

export type LastClimbInfo = {
  location: string | null;
  climb_date: string;
};

export type BuddyFeedItem = {
  user_id: string;
  username: string;
  name: string | null;
  last_climb: LastClimbInfo | null;
  planned_climbs: PlannedClimb[];
};
