// api.ts
import type { UserProfile } from '../types/user';
import type { LastClimb, WeeklyClimbSummary, HistoricalClimb, GradeSystem,
    CommitSessionPayload, CommitSessionResponse
 } from '../types/climb';
import { joinURL } from "./url.ts";

type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
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
  if (res.status === 401 || res.status === 403) {
    return new ApiError('INVALID_CREDENTIALS', 'Invalid username or password.', res.status);
  }
  if (res.status >= 500) {
    return new ApiError('SERVER_ERROR', 'Server error. Please try again in a moment.', res.status);
  }
  if (res.status === 404) {
    return new ApiError('NOT_FOUND', 'Resource not found.', res.status);
  }
  const msg = (payload && payload.error) || 'Request failed.';
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
