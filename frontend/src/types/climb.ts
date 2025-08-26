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
  grades: string;
}

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
  routes: LocalRoute[];
}

export type CommitSessionPayload = {
  session: {
    started_at: string;
    ended_at: string;
    notes?: string;
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

const OTHER_ID = 999;
export function toCommitPayload(ls: LocalSession): CommitSessionPayload {
  return {
    session: {
      started_at: ls.startedAt,
      ended_at: ls.endedAt ?? new Date().toISOString(),
      notes: ls.notes,
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
