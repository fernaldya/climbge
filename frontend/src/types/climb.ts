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

export type GradeSystem = {
  gradeId: number;
  gradeSystem: string;
  /** /api/grades returns this as a JSON array, not a comma-separated string. */
  grades: string[];
}

// Approval queue items mirror the backend view columns (snake_case).
export type PendingGradeSystem = {
  grade_id: number;
  grade_system: string;
  grades: string[];
  climb_type: string;
};

export type PendingGymLocation = {
  id: number;
  gym_name: string;
  gym_chain: string | null;
  location: string;
  country: string;
};

export type ApprovalQueue = {
  grade_queue: PendingGradeSystem[];
  climb_queue: PendingGymLocation[];
};

export type ApprovalDecision = {
  itemType: 'grade' | 'location';
  itemId: number;
  action: 'approve' | 'reject';
};

// Climb locations are returned grouped by country, then city, then gym names:
// [ { "Indonesia": { "Jakarta": ["Alpine Outpost", "Indoclimb Kemang"] } } ]
export type ClimbLocationTree = Record<string, Record<string, string[]>>;
export type ClimbLocations = ClimbLocationTree[];

export type SelectedLocation = {
  country: string;
  city: string;
  gym: string;
  custom?: boolean;
};

export interface LocalRoute {
  id: string;
  gradeSystem?: number;
  gradeSystemLabel?: string;
  gradeLabel: string;
  description?: string;
  attempts: number;
  sent: boolean;
  sentAt?: string;
}

export interface LocalSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
  location?: SelectedLocation;
  routes: LocalRoute[];
}

export type CommitSessionPayload = {
  session: {
    started_at: string;
    ended_at: string;
    notes?: string;
    location?: string;
  };
  routes: Array<{
    grade_system: number | null;
    grade_system_label?: string;
    grade_label: string;
    description?: string;
    attempts: number;
    sent: boolean;
    sent_at?: string;
  }>;
};

export type CommitSessionResponse =
  | { ok: true; session_id: string }
  | { ok?: false; error: string };

// Outdoor climbing types
export type OutdoorRouteStatus = 'projecting' | 'sent';

export interface OutdoorRoute {
  id: string;
  route_id?: string;
  user_id?: string;
  name: string;
  location: string;
  gradeSystem: number;
  gradeSystemLabel?: string;
  grade: string;
  description?: string;
  attempts: number;
  isSent: boolean;
  startedAt: string;
  sentAt?: string;
  route_seq?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
}

export interface OutdoorSession {
  routes: OutdoorRoute[];
}

// Shape returned by GET/POST/PUT /api/outdoor-climbs (snake_case, straight from the view).
export interface OutdoorClimbRow {
  user_id: string;
  route_id: string;
  grade_system: number;
  grade_label: string;
  route_name: string;
  description: string | null;
  location: string;
  attempts: number;
  is_sent: boolean;
  sent_at: string | null;
  first_climb_date: string | null;
  route_seq?: number;
}

// Body accepted by POST /api/outdoor-climbs.
export type OutdoorCreatePayload = {
  route_name: string;
  location: string;
  grade_system: number;
  grade_system_label?: string;
  grade_label: string;
  description?: string;
  attempts: number;
  sent: boolean;
  sent_at?: string;
  first_climb_date: string;
};

// One entry in the PUT /api/outdoor-climbs batch. Omitted keys are left untouched.
export type OutdoorUpdatePayload = {
  route_id: string;
  attempts?: number;
  sent?: boolean;
  sent_at?: string;
  first_climb_date?: string;
};

/**
 * The server has nowhere to store the label of a user-supplied ("Other", id 999) grade
 * system, so we remember it client-side keyed by route_id. See gradeSystemLabel below.
 */
export type OutdoorLabelCache = Record<string, string>;

export function fromOutdoorRow(row: OutdoorClimbRow, labels: OutdoorLabelCache = {}): OutdoorRoute {
  return {
    id: row.route_id,
    route_id: row.route_id,
    user_id: row.user_id,
    name: row.route_name,
    location: row.location,
    gradeSystem: row.grade_system,
    gradeSystemLabel: labels[row.route_id],
    grade: row.grade_label,
    description: row.description ?? undefined,
    attempts: row.attempts,
    isSent: row.is_sent,
    startedAt: row.first_climb_date ?? '',
    sentAt: row.sent_at ?? undefined,
    route_seq: row.route_seq,
  };
}

export function toOutdoorCreatePayload(r: OutdoorRoute): OutdoorCreatePayload {
  return {
    route_name: r.name,
    location: r.location,
    grade_system: r.gradeSystem,
    grade_system_label: r.gradeSystem === OTHER_ID ? (r.gradeSystemLabel || 'Other') : undefined,
    grade_label: r.grade,
    description: r.description,
    attempts: r.attempts,
    sent: r.isSent,
    sent_at: r.sentAt,
    first_climb_date: r.startedAt,
  };
}

const OTHER_ID = 999;
export function toCommitPayload(ls: LocalSession): CommitSessionPayload {
  return {
    session: {
      started_at: ls.startedAt,
      ended_at: ls.endedAt ?? new Date().toISOString(),
      notes: ls.notes,
      location: ls.location?.gym,
    },
    routes: ls.routes.map(r => {
      const grade_system =
        typeof r.gradeSystem === "number" ? r.gradeSystem : OTHER_ID;

      return {
        grade_system,
        grade_system_label:
          grade_system === OTHER_ID ? (r.gradeSystemLabel || "Other") : undefined,
        grade_label: r.gradeLabel,
        description: r.description,
        attempts: r.attempts,
        sent: r.sent,
        sent_at: r.sentAt,
      };
    }),
  };
}
