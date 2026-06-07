// api.ts
import type { UserProfile } from '../types/user';
import type { LastClimb, WeeklyClimbSummary, HistoricalClimb, GradeSystem,
    CommitSessionPayload, CommitSessionResponse, ClimbLocations,
    ApprovalQueue, ApprovalDecision
 } from '../types/climb';
import type { NewsPost } from '../types/news';
import type {
  BuddySummary, BuddyDetail, BuddyInvite, BuddyFeedItem, PlannedClimb,
} from '../types/buddy';
import { joinURL } from "./url.ts";

type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

type HistoryResp = HistoricalClimb[] | { history: HistoricalClimb[] };

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function parseJsonSafe(res: Response) {
  try { return await res.json(); } catch { return null; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResponseToError(res: Response, payload: any): ApiError {
  // Use status to decide the friendly message
  if (res.status === 401) {
    const msg = payload?.error?.message || 'Your session has expired. Please log in again.';
    return new ApiError('UNAUTHORIZED', msg, res.status);
  }
  if (res.status === 403) {
    const msg = payload?.error?.message || "You don't have permission to do this.";
    return new ApiError('FORBIDDEN', msg, res.status);
  }
  if (res.status >= 500) {
    return new ApiError('SERVER_ERROR', 'Server error. Please try again in a moment.', res.status);
  }
  if (res.status === 404) {
    return new ApiError('NOT_FOUND', 'Resource not found.', res.status);
  }
  const msg = payload?.error?.message || 'Request failed.';
  return new ApiError('UNKNOWN', msg, res.status);
}

async function json<T>(res: Response): Promise<T> {
  const data = await parseJsonSafe(res);
  if (!res.ok) throw mapResponseToError(res, data);
  return data as T;
}

function mapNetworkError(e: unknown): never {
  // fetch throws TypeError on network issues
  const msg = 'Unable to reach the server. Check your connection and try again.' + e;
  throw new ApiError('NETWORK_ERROR', msg);
}

export async function apiMe() {
  try {
    const res = await fetch(joinURL('/api/me'), { credentials: 'include' });
    return json<{ authenticated: boolean; profile?: UserProfile }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiLogin(username: string, password: string) {
  try {
    const res = await fetch(joinURL('/api/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return json<{ ok: boolean; profile: UserProfile }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiSignup(
  username: string,
  password: string,
  startedClimbing: string,
  extras?: Partial<{
    email: string; name: string; age: string; sex: string; homeCity: string; homeGym: string;
  }>
) {
  try {
    const res = await fetch(joinURL('/api/signup'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, startedClimbing, ...extras }),
    });
    return json<{ ok: boolean; profile: UserProfile }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiLogout() {
  try {
    const res = await fetch(joinURL('/api/logout'), { method: 'POST', credentials: 'include' });
    return json<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiFeedback(feedback: string) {
  const res = await fetch(joinURL('/api/feedback'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Failed to submit feedback');
  }

  return res.json();
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  const res = await fetch(joinURL(url), { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

// ===== API helpers =====
export function apiWeeklySummary() {
  return fetchJSON<WeeklyClimbSummary>("/api/weekly-summary");
}

export function apiLastClimb() {
  return fetchJSON<LastClimb>("/api/last-climb");
}

export async function apiHistoricalClimb(): Promise<HistoricalClimb[]> {
  const json = await fetchJSON<HistoryResp>("/api/history");
  const data: any = json ?? {};
  return Array.isArray(data) ? data : (data.history ?? []);
}

export async function apiNews(): Promise<NewsPost[]> {
  const json = await fetchJSON<{ news: NewsPost[] }>("/api/news");
  return json?.news ?? [];
}

export async function apiSaveMeasurementsMetric(payload: {
  unitOfMeasurement: 'metric';
  height?: number | null;
  weight?: number | null;
  apeIndex?: number | null;
  gripStrength?: number | null;
}) {
  const res = await fetch(joinURL('/api/user-measurements'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to save measurements');
  }
}

export async function apiFetchGradeSystems(): Promise<GradeSystem[]> {
  try {
    const res = await fetch(joinURL("/api/grades"), { credentials: "include" });
    if (!res.ok) return [];
    return (await res.json()) as GradeSystem[];
  } catch {
    return [];
  }
}

export async function apiFetchClimbLocations(): Promise<ClimbLocations> {
  try {
    const res = await fetch(joinURL("/api/climb-locations"), { credentials: "include" });
    if (!res.ok) return [];
    const body = await res.json();
    // Backend may serialize the tree as a JSON string; tolerate both shapes.
    const data = typeof body === "string" ? JSON.parse(body) : body;
    return Array.isArray(data) ? (data as ClimbLocations) : [];
  } catch {
    return [];
  }
}

export async function apiForgotPassword(email: string, username: string) {
  try {
    const res = await fetch(joinURL('/api/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email || undefined,
        username: username || undefined,
      }),
    });
    return json<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiResetPassword(token: string, newPassword: string) {
  try {
    const res = await fetch(joinURL('/api/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return json<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiSubmitNewLocation(payload: {
  gymName: string;
  gymChain?: string;
  gymLocation: string;
  country: string;
}) {
  try {
    const res = await fetch(joinURL('/api/climb-location'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newLocation: payload }),
    });
    return await json<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiSubmitNewGradeSystem(payload: {
  gradeSystemName: string;
  climbType: string;
  grades: string[];
}) {
  try {
    const res = await fetch(joinURL('/api/grade-system'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newGradeSystem: payload }),
    });
    return await json<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiFetchApprovalQueue(): Promise<ApprovalQueue> {
  try {
    const res = await fetch(joinURL('/api/approval-queue'), { credentials: 'include' });
    return await json<ApprovalQueue>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiSubmitApprovalDecision(decisions: ApprovalDecision[]) {
  try {
    const res = await fetch(joinURL('/api/approval-decision'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });
    return await json<{
      ok: boolean;
      results: Array<{ itemType: string | null; itemId: number | null; ok: boolean; action?: string; error?: string }>;
    }>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiCommitClimbSession(
  payload: CommitSessionPayload
): Promise<CommitSessionResponse> {
  const res = await fetch(joinURL("/api/commit-session"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let body: unknown = null;
  try { body = await res.json(); } catch {}

  if (!res.ok) {
    return (body as CommitSessionResponse) ?? { ok: false, error: "Request failed" };
  }
  return body as CommitSessionResponse;
}

// ===== Buddy Hub =====
async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  try {
    const res = await fetch(joinURL(path), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return json<T>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    mapNetworkError(e);
  }
}

export async function apiListBuddies() {
  const data = await request<{ buddies: BuddySummary[] }>('/api/buddies');
  return data.buddies;
}

export function apiGetBuddy(id: string) {
  return request<BuddyDetail>(`/api/buddies/${id}`);
}

export function apiCreateBuddy(name: string) {
  return request<BuddySummary>('/api/buddies', 'POST', { name });
}

export function apiRenameBuddy(id: string, name: string) {
  return request<{ ok: boolean; name: string }>(`/api/buddies/${id}`, 'PUT', { name });
}

export function apiLeaveBuddy(id: string) {
  return request<{ ok: boolean }>(`/api/buddies/${id}/leave`, 'POST');
}

export function apiRemoveBuddyMember(id: string, targetUserId: string) {
  return request<{ ok: boolean }>(`/api/buddies/${id}/members/${targetUserId}`, 'DELETE');
}

export function apiInviteBuddy(id: string, username: string) {
  return request<BuddyInvite>(`/api/buddies/${id}/invites`, 'POST', { username });
}

export async function apiListBuddyInvites() {
  const data = await request<{ invites: BuddyInvite[] }>('/api/buddy-invites');
  return data.invites;
}

export function apiAcceptInvite(inviteId: string) {
  return request<{ ok: boolean; buddy_id: string }>(`/api/buddy-invites/${inviteId}/accept`, 'POST');
}

export function apiDeclineInvite(inviteId: string) {
  return request<{ ok: boolean }>(`/api/buddy-invites/${inviteId}/decline`, 'POST');
}

export async function apiBuddyFeed() {
  const data = await request<{ buddies: BuddyFeedItem[] }>('/api/buddies/feed');
  return data.buddies;
}

export async function apiListPlannedClimbs() {
  const data = await request<{ plans: PlannedClimb[] }>('/api/planned-climbs');
  return data.plans;
}

export function apiCreatePlannedClimb(payload: {
  gym: string;
  city?: string;
  country?: string;
  planned_date: string;
  planned_time?: string;
  share_all: boolean;
  buddy_ids: string[];
}) {
  return request<PlannedClimb>('/api/planned-climbs', 'POST', payload);
}

export function apiCancelPlannedClimb(planId: string) {
  return request<{ ok: boolean }>(`/api/planned-climbs/${planId}`, 'DELETE');
}
