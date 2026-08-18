import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Play, Pause, Square, Plus, Minus, CheckCircle, Clock, Target, FileText, Check, Zap, MapPin, ChevronRight, Trees, Search as SearchIcon, X, Calendar } from "lucide-react";
import { apiFetchGradeSystems, apiCommitClimbSession, apiFetchClimbLocations, apiFetchOutdoorClimbs, apiSaveOutdoorClimb, apiUpdateOutdoorClimb, apiDeleteOutdoorClimb } from "../lib/api";
import type { LocalSession, LocalRoute, GradeSystem, ClimbLocations, SelectedLocation, OutdoorRoute } from "../types/climb";

// --- Config / constants ----------------------------------------------------
const LS_KEYS = {
  CURRENT: "climb.currentSession",
  DEFAULT_GS: "climb.defaultGradeSystem",
  LOCATION: "climb.location",
  OUTDOOR_SESSION: "climb.outdoorSession",
  OUTDOOR_CONFIRMED: "climb.outdoorConfirmed",
} as const;

const CUSTOM_LOCATION_MAX_LENGTH = 75;
const OUTDOOR_STORAGE_KEYS = {
  SESSION: "climb.outdoorSession",
  CONFIRMED: "climb.outdoorConfirmed",
} as const;


// --- Helpers ---------------------------------------------------------------
function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveSession(ls: LocalSession | null) {
  if (!ls) localStorage.removeItem(LS_KEYS.CURRENT);
  else localStorage.setItem(LS_KEYS.CURRENT, JSON.stringify(ls));
}
function loadSession(): LocalSession | null {
  const raw = localStorage.getItem(LS_KEYS.CURRENT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

// --- Outdoor helpers ----------------------------------------------------------
function loadOutdoorSession(): OutdoorRoute[] {
  const raw = localStorage.getItem(OUTDOOR_STORAGE_KEYS.SESSION);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutdoorRoute[];
  } catch {
    return [];
  }
}

function saveOutdoorSession(routes: OutdoorRoute[]) {
  localStorage.setItem(OUTDOOR_STORAGE_KEYS.SESSION, JSON.stringify(routes));
}

function loadOutdoorConfirmed(): OutdoorRoute[] {
  const raw = localStorage.getItem(OUTDOOR_STORAGE_KEYS.CONFIRMED);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutdoorRoute[];
  } catch {
    return [];
  }
}

function saveOutdoorConfirmed(routes: OutdoorRoute[]) {
  localStorage.setItem(OUTDOOR_STORAGE_KEYS.CONFIRMED, JSON.stringify(routes));
}

function toDateInput(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

// --- Component -------------------------------------------------------------
export function ClimbTab() {
  // Session state
  const [session, setSession] = useState<LocalSession | null>(null);
  const [notes, setNotes] = useState("");

  // Timer
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const timerRef = useRef<number | null>(null);
  const runOriginRef = useRef<number | null>(null); // Date.now() - elapsed*1000 when running started
  const runningRef = useRef(false);


  // Goals
  const [timeGoalMin, setTimeGoalMin] = useState<number | string>(120);
  const [routeGoal, setRouteGoal] = useState<number | string>(8);

  // Location
  const [locations, setLocations] = useState<ClimbLocations>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [openLoc, setOpenLoc] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState("");

  // Grade systems from DB
  const [systems, setSystems] = useState<GradeSystem[]>([]);
  const byId = useMemo(() => {
    const m = new Map<number, GradeSystem>();
    systems.forEach(s => m.set(s.gradeId, s));
    return m;
  }, [systems]);


  // Add Route dialog state
  const [openAdd, setOpenAdd] = useState(false);
  const [gsId, setGsId] = useState<number | null>(null);
  const [customGs, setCustomGs] = useState("");
  const [grade, setGrade] = useState("");
  const [desc, setDesc] = useState("");

  // helper to render system name from id
  const renderSystemName = (r: LocalRoute) =>
    r.gradeSystem === 999
      ? (r.gradeSystemLabel || "Other")
      : (r.gradeSystem ? (byId.get(r.gradeSystem)?.gradeSystem ?? `System ${r.gradeSystem}`) : "System");

  // helper to render system name for outdoor routes
  const renderOutdoorSystemName = (r: OutdoorRoute) =>
    r.gradeSystem === 999
      ? (r.gradeSystemLabel || "Other")
      : (r.gradeSystem ? (byId.get(r.gradeSystem)?.gradeSystem ?? `System ${r.gradeSystem}`) : "System");

  // Helper to get available grades for a grade system
  const getAvailableGrades = (gradeSystemId: number | null): string[] => {
    if (gradeSystemId === null || gradeSystemId === 999) return [];
    return byId.get(gradeSystemId)?.grades?.split(",") ?? [];
  };

  // End Session dialog
  const [openEnd, setOpenEnd] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  // --- Outdoor state --------------------------------------------------------
  // Session routes (not yet confirmed)
  const [sessionRoutes, setSessionRoutes] = useState<OutdoorRoute[]>([]);
  // Confirmed routes (saved)
  const [confirmedRoutes, setConfirmedRoutes] = useState<OutdoorRoute[]>([]);
  // UI state
  const [outdoorTab, setOutdoorTab] = useState<"projecting" | "sent">("projecting");
  const [outdoorSearch, setOutdoorSearch] = useState("");
  // Track pending sends and dirty edits for confirmed routes
  const [activePendingSentIds, setActivePendingSentIds] = useState<string[]>([]);
  const [dirtyConfirmedIds, setDirtyConfirmedIds] = useState<string[]>([]);
  // Delete confirmation
  const [outdoorDeleteConfirmId, setOutdoorDeleteConfirmId] = useState<string | null>(null);
  // Add route dialog
  const [isAddOutdoorDialogOpen, setIsAddOutdoorDialogOpen] = useState(false);
  const [newOutdoorName, setNewOutdoorName] = useState("");
  const [newOutdoorLocation, setNewOutdoorLocation] = useState("");
  const [newOutdoorGradeSystem, setNewOutdoorGradeSystem] = useState<number | null>(null);
  const [newOutdoorGrade, setNewOutdoorGrade] = useState("");
  const [newOutdoorCustomGs, setNewOutdoorCustomGs] = useState("");
  const [newOutdoorDescription, setNewOutdoorDescription] = useState("");
  const [newOutdoorStartedAt, setNewOutdoorStartedAt] = useState("");

  // Mount: load session + systems + locations
  useEffect(() => {
    const ls = loadSession();
    if (ls) {
      setSession(ls);
      setNotes(ls.notes || "");
      if (ls.location) setLocation(ls.location);
      const started = new Date(ls.startedAt).getTime();
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - started) / 1000)));
      setRunning(true);
    } else {
      // No active session: restore the last picked location for convenience.
      const savedLoc = localStorage.getItem(LS_KEYS.LOCATION);
      if (savedLoc) {
        try { setLocation(JSON.parse(savedLoc) as SelectedLocation); } catch { /* ignore */ }
      }
    }
    (async () => {
      try {
        setSystems(await apiFetchGradeSystems());
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        setLocations(await apiFetchClimbLocations());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Persist session whenever it changes
  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  // Timer ticker
  useEffect(() => {
    runningRef.current = running;
    if (!running) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      runOriginRef.current = null;
      return;
    }
    // Record wall-clock origin so we can recover after backgrounding
    runOriginRef.current = Date.now() - elapsed * 1000;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      setElapsed((s) => s + dt / 1000);
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snap elapsed to wall-clock time when app comes back from background
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && runningRef.current && runOriginRef.current !== null) {
        setElapsed((Date.now() - runOriginRef.current) / 1000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const hhmmss = useMemo(() => {
    const s = Math.floor(elapsed);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [elapsed]);

  // --- Actions -------------------------------------------------------------
  function pickLocation(sel: SelectedLocation) {
    setLocation(sel);
    localStorage.setItem(LS_KEYS.LOCATION, JSON.stringify(sel));
    // If a session is already running, keep its captured location in sync.
    setSession((prev) => (prev ? { ...prev, location: sel } : prev));
    setShowCustomLocation(false);
    setCustomLocation("");
    setOpenLoc(false);
  }

  function updateCustomLocation(next: string) {
    setCustomLocation(next);
    const gym = next.trim();

    if (!gym) {
      if (location?.custom) {
        setLocation(null);
        localStorage.removeItem(LS_KEYS.LOCATION);
        setSession((prev) => (prev ? { ...prev, location: undefined } : prev));
      }
      return;
    }

    const sel: SelectedLocation = { country: "", city: "", gym, custom: true };
    setLocation(sel);
    localStorage.setItem(LS_KEYS.LOCATION, JSON.stringify(sel));
    setSession((prev) => (prev ? { ...prev, location: sel } : prev));
  }

  function startSession() {
    if (session) return; // already running
    const now = new Date().toISOString();
    const ls: LocalSession = { sessionId: uuid(), startedAt: now, notes, location: location ?? undefined, routes: [] };
    setSession(ls);
    saveSession(ls);
    setRunning(true);
  }
  function pauseResume() {
    setRunning((r) => !r);
  }
  function endSessionPrompt() {
    setOpenEnd(true);
  }

  function addRouteClick() {
    const saved = localStorage.getItem(LS_KEYS.DEFAULT_GS);
    const lastId = saved ? Number(saved) : (systems[0]?.gradeId ?? 999);
    setGsId(lastId);
    setCustomGs("");
    const preset = byId.get(lastId)?.grades ?? [];
    setGrade(preset[0] ?? "");
    setDesc("");
    setOpenAdd(true);
  }

  function pushRoute() {
    if (!session) return;
    if (!grade.trim()) return;

    const isOther = gsId === 999;
    if (!gsId) return;
    if (isOther && !customGs.trim()) return;


    const route: LocalRoute = {
      id: uuid(),                 // local-only
      gradeSystem: gsId,
      gradeSystemLabel: isOther ? customGs.trim() : undefined,
      gradeLabel: grade.trim(),
      description: desc.trim() || undefined,
      attempts: 0,
      sent: false,
    };

    setSession({ ...session, routes: [...session.routes, route] });
    setOpenAdd(false);
  }


  function incAttempt(id: string, delta = 1) {
    if (!session) return;
    setSession({
      ...session,
      routes: session.routes.map((r) =>
        r.id === id ? { ...r, attempts: Math.max(0, r.attempts + delta) } : r
      ),
    });
  }
  function toggleSent(id: string) {
    if (!session) return;
    const now = new Date().toISOString();
    setSession({
      ...session,
      routes: session.routes.map((r) =>
        r.id === id
          ? {
              ...r,
              sent: !r.sent,
              sentAt: !r.sent ? now : undefined,
              attempts: r.sent ? r.attempts : Math.max(1, r.attempts),
            }
          : r
      ),
    });
  }
  function removeRoute(id: string) {
    if (!session) return;
    setSession({ ...session, routes: session.routes.filter((r) => r.id !== id) });
  }

  async function commitSession() {
    if (!session) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const payload = {
        session: {
          started_at: session.startedAt,
          ended_at: new Date().toISOString(),
          notes,
          location: (session.location ?? location)?.gym,
        },
        routes: session.routes.map((r) => ({
          grade_system: r.gradeSystem ?? 999,
          grade_system_label: r.gradeSystem === 999 ? r.gradeSystemLabel : undefined,
          grade_label: r.gradeLabel,
          description: r.description,
          attempts: r.attempts,
          sent: r.sent,
          sent_at: r.sentAt,
        })),
      };
      const res = await apiCommitClimbSession(payload);
      if (!res.ok) throw new Error("Commit failed");
      setSession(null);
      saveSession(null);
      setRunning(false);
      setElapsed(0);
      setOpenEnd(false);
      setNotes("");
    } catch (e: any) {
      setCommitError(
        e?.message || "Failed to save session. Your data is still stored locally."
      );
    } finally {
      setCommitting(false);
    }
  }

  // --- Outdoor Actions --------------------------------------------------------
  // Load outdoor data on mount
  useEffect(() => {
    setSessionRoutes(loadOutdoorSession());
    setConfirmedRoutes(loadOutdoorConfirmed());
  }, []);

  // Save session routes whenever they change
  useEffect(() => {
    saveOutdoorSession(sessionRoutes);
  }, [sessionRoutes]);

  // Save confirmed routes whenever they change
  useEffect(() => {
    saveOutdoorConfirmed(confirmedRoutes);
  }, [confirmedRoutes]);

  function markConfirmedDirty(id: string) {
    setDirtyConfirmedIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }

  function toggleActivePendingSentIds(id: string) {
    setActivePendingSentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return Array.from(newSet);
    });
  }

  function addOutdoorRoute() {
    if (!newOutdoorName.trim() || !newOutdoorLocation.trim() || !newOutdoorGrade.trim() || (newOutdoorGradeSystem === 999 && !newOutdoorCustomGs.trim())) return;

    const isOther = newOutdoorGradeSystem === 999;

    const route: OutdoorRoute = {
      id: uuid(),
      name: newOutdoorName.trim(),
      location: newOutdoorLocation.trim(),
      gradeSystem: newOutdoorGradeSystem ?? 999,
      gradeSystemLabel: isOther ? newOutdoorCustomGs.trim() : undefined,
      grade: newOutdoorGrade,
      description: newOutdoorDescription.trim() || undefined,
      attempts: 0,
      isSent: false,
      startedAt: newOutdoorStartedAt || new Date().toISOString().split("T")[0],
      sentAt: undefined,
    };

    setSessionRoutes((prev) => [...prev, route]);
    setIsAddOutdoorDialogOpen(false);
    // Reset form
    setNewOutdoorName("");
    setNewOutdoorLocation("");
    setNewOutdoorGradeSystem(null);
    setNewOutdoorGrade("");
    setNewOutdoorCustomGs("");
    setNewOutdoorDescription("");
    setNewOutdoorStartedAt("");
  }

  function updateOutdoorAttempts(id: string, delta: number) {
    // Check if this is a confirmed route
    const isConfirmed = confirmedRoutes.some((r) => r.id === id);

    if (isConfirmed) {
      // For confirmed routes, only allow modification if not sent
      const route = confirmedRoutes.find((r) => r.id === id);
      if (route && !route.isSent) {
        setConfirmedRoutes((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, attempts: Math.max(0, r.attempts + delta) }
              : r
          )
        );
        markConfirmedDirty(id);
      }
    } else {
      // For session routes, allow modification
      setSessionRoutes((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, attempts: Math.max(0, r.attempts + delta) }
            : r
        )
      );
    }
  }

  function toggleOutdoorSent(id: string) {
    // Check if this is a confirmed route
    const isConfirmed = confirmedRoutes.some((r) => r.id === id);
    const confirmedRoute = confirmedRoutes.find((r) => r.id === id);

    if (isConfirmed && confirmedRoute) {
      // For confirmed routes that are already sent, do nothing
      if (confirmedRoute.isSent) {
        return;
      }
      // For confirmed routes: only toggle pending send status, don't immediately mark as sent
      setActivePendingSentIds((prev) => {
        const newPending = new Set(prev);
        if (newPending.has(id)) {
          newPending.delete(id);
        } else {
          newPending.add(id);
        }
        return Array.from(newPending);
      });
      // Mark as dirty since we're changing the send status
      markConfirmedDirty(id);
    } else {
      // For session routes: do nothing - they need to be confirmed first
      // Session routes cannot be marked as sent directly
      return;
    }
  }

  function updateOutdoorRoute(id: string, updater: (r: OutdoorRoute) => OutdoorRoute) {
    setConfirmedRoutes((prev) =>
      prev.map((r) => (r.id === id ? updater(r) : r))
    );
    markConfirmedDirty(id);
  }

  function removeOutdoorRoute(id: string) {
    setSessionRoutes((prev) => prev.filter((r) => r.id !== id));
    setConfirmedRoutes((prev) => prev.filter((r) => r.id !== id));
    setActivePendingSentIds((prev) => prev.filter((pid) => pid !== id));
    setDirtyConfirmedIds((prev) => prev.filter((did) => did !== id));
  }

  function executeDeleteOutdoor() {
    if (!outdoorDeleteConfirmId) return;
    removeOutdoorRoute(outdoorDeleteConfirmId);
    setOutdoorDeleteConfirmId(null);
  }

  function confirmSession() {
    setConfirmedRoutes((prev) => [...prev, ...sessionRoutes]);
    setSessionRoutes([]);
  }

  function confirmActiveProjects() {
    const now = new Date().toISOString().split("T")[0];
    setConfirmedRoutes((prev) =>
      prev.map((r) => {
        if (activePendingSentIds.includes(r.id)) {
          return {
            ...r,
            isSent: true,
            sentAt: now,
            attempts: Math.max(1, r.attempts),
          };
        }
        return r;
      })
    );
    setActivePendingSentIds([]);
    setDirtyConfirmedIds((prev) => prev.filter((id) => !activePendingSentIds.includes(id)));
  }

  function confirmSentEdits() {
    setDirtyConfirmedIds([]);
  }

  // Filter and search helper for outdoor routes
  const filterOutdoorRoutes = (routes: OutdoorRoute[], searchQuery: string): OutdoorRoute[] => {
    if (!searchQuery.trim()) return routes;
    const query = searchQuery.toLowerCase();
    return routes.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      r.location.toLowerCase().includes(query) ||
      r.grade.toLowerCase().includes(query) ||
      (r.description?.toLowerCase().includes(query) ?? false)
    );
  };

  // --- Sub-components ----------------------------------------------------------

  // ProjectingTab component
  interface ProjectingTabProps {
    sessionRoutes: OutdoorRoute[];
    confirmedRoutes: OutdoorRoute[];
    outdoorSearch: string;
    activePendingSentIds: string[];
    dirtyConfirmedIds: string[];
    renderOutdoorSystemName: (r: OutdoorRoute) => string;
    toDateInput: (dateStr: string | undefined) => string;
    updateOutdoorAttempts: (id: string, delta: number) => void;
    toggleOutdoorSent: (id: string) => void;
    updateOutdoorRoute: (id: string, updater: (r: OutdoorRoute) => OutdoorRoute) => void;
    removeOutdoorRoute: (id: string) => void;
    confirmSession: () => void;
    confirmActiveProjects: () => void;
    setIsAddOutdoorDialogOpen: (open: boolean) => void;
    setOutdoorDeleteConfirmId: (id: string | null) => void;
    setNewOutdoorStartedAt: (value: string) => void;
  }

  function ProjectingTab({
    sessionRoutes,
    confirmedRoutes,
    outdoorSearch,
    activePendingSentIds,
    dirtyConfirmedIds,
    renderOutdoorSystemName,
    toDateInput,
    updateOutdoorAttempts,
    toggleOutdoorSent,
    updateOutdoorRoute,
    removeOutdoorRoute,
    confirmSession,
    confirmActiveProjects,
    setIsAddOutdoorDialogOpen,
    setOutdoorDeleteConfirmId,
    setNewOutdoorStartedAt,
  }: ProjectingTabProps) {
    const hasPendingChanges = activePendingSentIds.length > 0 || dirtyConfirmedIds.length > 0;

    // Get unsent confirmed routes
    const unsentConfirmedRoutes = confirmedRoutes.filter((r) => !r.isSent);

    // Combine and filter
    const allProjectingRoutes = [...sessionRoutes, ...unsentConfirmedRoutes];
    const filteredRoutes = filterOutdoorRoutes(allProjectingRoutes, outdoorSearch);

    const isDirty = (id: string) => dirtyConfirmedIds.includes(id);
    const isPendingSent = (id: string) => activePendingSentIds.includes(id);

    // Check if a route is from confirmed (not session)
    // const isConfirmedRoute = (id: string) => confirmedRoutes.some((r) => r.id === id);

    const filteredSession = filterOutdoorRoutes(sessionRoutes, outdoorSearch);
    const q = outdoorSearch;

    return (
      <div className="space-y-4">
        {/* Current Session */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Session</span>
            <span className="text-xs text-muted-foreground">{sessionRoutes.length} route{sessionRoutes.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredSession.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              {q ? 'No matches.' : 'No routes added yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSession.map(route => (
                <OutdoorRouteCard
                  key={route.id}
                  route={route}
                  isSessionRoute={true}
                  isDirty={false}
                  isPendingSent={false}
                  renderOutdoorSystemName={renderOutdoorSystemName}
                  toDateInput={toDateInput}
                  updateOutdoorAttempts={updateOutdoorAttempts}
                  toggleOutdoorSent={toggleOutdoorSent}
                  updateOutdoorRoute={updateOutdoorRoute}
                  removeOutdoorRoute={removeOutdoorRoute}
                  setOutdoorDeleteConfirmId={setOutdoorDeleteConfirmId}
                />
              ))}
            </div>
          )}
          <Button onClick={() => { setNewOutdoorStartedAt(new Date().toISOString().split('T')[0]); setIsAddOutdoorDialogOpen(true); }} variant="outline" className="w-full mt-3">
            <Plus className="h-4 w-4 mr-2" />Add Project
          </Button>
          {sessionRoutes.length > 0 && (
            <Button onClick={confirmSession} className="w-full mt-2 bg-primary hover:bg-primary/90">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Save ({sessionRoutes.length} route{sessionRoutes.length !== 1 ? 's' : ''})
            </Button>
          )}
        </div>

        {/* Confirmed but unsent routes */}
        {unsentConfirmedRoutes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Confirmed ({unsentConfirmedRoutes.length})
              </Badge>
              {hasPendingChanges && (
                <Button
                  size="sm"
                  onClick={() => {
                    confirmActiveProjects();
                    confirmSentEdits();
                  }}
                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Confirm & Save
                </Button>
              )}
            </div>
            {filterOutdoorRoutes(unsentConfirmedRoutes, outdoorSearch).map((r) => (
              <OutdoorRouteCard
                key={r.id}
                route={r}
                isSessionRoute={false}
                isDirty={isDirty(r.id)}
                isPendingSent={isPendingSent(r.id)}
                renderOutdoorSystemName={renderOutdoorSystemName}
                toDateInput={toDateInput}
                updateOutdoorAttempts={updateOutdoorAttempts}
                toggleOutdoorSent={toggleOutdoorSent}
                updateOutdoorRoute={updateOutdoorRoute}
                removeOutdoorRoute={removeOutdoorRoute}
                setOutdoorDeleteConfirmId={setOutdoorDeleteConfirmId}
              />
            ))}
          </div>
        )}

        {sessionRoutes.length === 0 && unsentConfirmedRoutes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No projecting routes. Add your first outdoor project!
          </p>
        )}
      </div>
    );
  }

  // SentTab component
  interface SentTabProps {
    confirmedRoutes: OutdoorRoute[];
    outdoorSearch: string;
    dirtyConfirmedIds: string[];
    renderOutdoorSystemName: (r: OutdoorRoute) => string;
    toDateInput: (dateStr: string | undefined) => string;
    updateOutdoorRoute: (id: string, updater: (r: OutdoorRoute) => OutdoorRoute) => void;
    removeOutdoorRoute: (id: string) => void;
    confirmSentEdits: () => void;
    setOutdoorDeleteConfirmId: (id: string | null) => void;
  }

  function SentTab({
    confirmedRoutes,
    outdoorSearch,
    dirtyConfirmedIds,
    renderOutdoorSystemName,
    toDateInput,
    updateOutdoorRoute,
    removeOutdoorRoute,
    confirmSentEdits,
    setOutdoorDeleteConfirmId,
  }: SentTabProps) {
    const sentRoutes = confirmedRoutes.filter((r) => r.isSent);
    const filteredRoutes = filterOutdoorRoutes(sentRoutes, outdoorSearch);
    const hasDirtyRoutes = dirtyConfirmedIds.some((id) => sentRoutes.some((r) => r.id === id));

    return (
      <div className="space-y-3">
        {hasDirtyRoutes && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={confirmSentEdits}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              Confirm & Save
            </Button>
          </div>
        )}

        {filteredRoutes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sent routes yet. Send your first outdoor climb!
          </p>
        ) : (
          <div className="space-y-2">
            {filteredRoutes.map((r) => (
              <OutdoorRouteCard
                key={r.id}
                route={r}
                isSessionRoute={false}
                isDirty={dirtyConfirmedIds.includes(r.id)}
                isPendingSent={false}
                renderOutdoorSystemName={renderOutdoorSystemName}
                toDateInput={toDateInput}
                updateOutdoorAttempts={updateOutdoorAttempts}
                toggleOutdoorSent={toggleOutdoorSent}
                updateOutdoorRoute={updateOutdoorRoute}
                removeOutdoorRoute={removeOutdoorRoute}
                setOutdoorDeleteConfirmId={setOutdoorDeleteConfirmId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // OutdoorRouteCard component - shared between both tabs
  interface OutdoorRouteCardProps {
    route: OutdoorRoute;
    isSessionRoute: boolean;
    isDirty: boolean;
    isPendingSent: boolean;
    renderOutdoorSystemName: (r: OutdoorRoute) => string;
    toDateInput: (dateStr: string | undefined) => string;
    updateOutdoorAttempts: (id: string, delta: number) => void;
    toggleOutdoorSent: (id: string) => void;
    updateOutdoorRoute: (id: string, updater: (r: OutdoorRoute) => OutdoorRoute) => void;
    removeOutdoorRoute: (id: string) => void;
    setOutdoorDeleteConfirmId: (id: string | null) => void;
  }

  function OutdoorRouteCard({
    route,
    isSessionRoute,
    isDirty,
    isPendingSent,
    renderOutdoorSystemName,
    toDateInput,
    updateOutdoorAttempts,
    toggleOutdoorSent,
    updateOutdoorRoute,
    removeOutdoorRoute,
    setOutdoorDeleteConfirmId,
  }: OutdoorRouteCardProps) {
    const isSent = route.isSent;
    const isFlash = isSent && route.attempts === 1;
    const canDecreaseAttempts = isSessionRoute || !isSent;

    return (
      <div className={`p-4 bg-muted/30 rounded-xl border ${isDirty ? 'border-orange-400 ring-1 ring-orange-200' : 'border-border/50'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {route.grade}
              </Badge>
              <span className="font-medium text-sm">{renderOutdoorSystemName(route)}</span>
              {isPendingSent && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                  Pending send
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mt-2 text-lg">{route.name}</h3>
            {route.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{route.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs">Started: {toDateInput(route.startedAt) || 'N/A'}</span>
          </div>
          {isSent && route.sentAt && (
            <div className="flex items-center gap-3 flex-wrap">
              <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-green-600">Sent: {toDateInput(route.sentAt)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateOutdoorAttempts(route.id, -1)}
                className="h-5 w-5"
                disabled={route.isSent || route.attempts === 0}
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="text-center min-w-[52px]">
                <div className={`font-bold ${route.isSent ? 'text-green-700' : 'text-primary'}`}>{route.attempts}</div>
                <div className="text-xs text-muted-foreground">attempts</div>
              </div>
              <button
                type="button"
                onClick={() => updateOutdoorAttempts(route.id, 1)}
                className="h-5 w-5"
                disabled={route.isSent}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <Button
                size="sm"
                variant="default"
                onClick={() => toggleOutdoorSent(route.id)}
                disabled={isSessionRoute}
                className={
                  route.isSent
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : isPendingSent
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : isSessionRoute
                        ? "opacity-30 cursor-not-allowed"
                        : "opacity-40 hover:opacity-60"
                }
                title={isSessionRoute ? "Confirm route first to mark as sent" : undefined}
              >
                {route.isSent && route.attempts === 1 ? (
                    <Zap className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                    ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                )}
                {route.isSent ? "Sent!" : isPendingSent ? "Pending Sent" : isSessionRoute ? "Confirm First" : "Sent!"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOutdoorRoute(route.id)}
                className="text-destructive hover:text-destructive text-xs h-6 px-2"
              >
                Remove
              </Button>
            </div>
        </div>

            {/* Description */}
            {route.description && (
                <div className="text-sm text-muted-foreground text-wrap pt-2 border-t border-border/30">
                {route.description}
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- UI ------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-20">
      {/* Header: timer & quick stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" /> Session
            </span>
            <span className="font-mono text-lg tabular-nums">{hhmmss}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Location picker — visible before and during a session */}
          <button
            type="button"
            onClick={() => setOpenLoc(true)}
            className="mt-2 w-full flex items-center gap-3 rounded-2xl border p-4 text-left ring-1 ring-orange-200/60 bg-white hover:bg-orange-50 active:scale-[0.99] transition-all"
            aria-label="Choose location"
          >
            <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center ring-2 ring-orange-300/60 bg-orange-500/10">
              <MapPin className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">Location</div>
              <div className="font-semibold truncate">
                {location ? location.gym : "Select a gym"}
              </div>
              {location && (
                <div className="text-xs text-muted-foreground truncate">
                  {location.custom ? "Other" : `${location.city}, ${location.country}`}
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          {!session ? (
            // Idle → big full-width Start button
            <div className="mt-3">
              <Button
                onClick={startSession}
                className="w-full select-none rounded-2xl p-6 gap-4 ring-1 ring-orange-200/60 bg-gradient-to-b from-orange-50 to-white hover:from-orange-100 active:scale-[0.99] transition-all"
                aria-label="Start session"
              >
                <div className="h-14 w-14 rounded-full grid place-items-center ring-2 ring-orange-300/60 bg-orange-500/10">
                  <Play className="h-7 w-7 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold">Tap to start your session</div>
                </div>
              </Button>
            </div>
          ) : (
            // Running → Two big buttons side-by-side
            <div className="mt-2 grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                onClick={pauseResume}
                className="h-28 flex flex-col items-center justify-center rounded-2xl gap-3 ring-1 ring-orange-200/70 bg-yellow-50 hover:bg-yellow-100 active:scale-[0.99] transition-all"
                aria-label={running ? "Pause session" : "Resume session"}
              >
                <div className="h-12 w-12 rounded-full grid place-items-center ring-2 ring-yellow-200/60 bg-white">
                  {running ? (
                    <Pause className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Play className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
                <div className="font-semibold">{running ? "Pause" : "Resume"}</div>
              </Button>

              <Button
                variant="destructive"
                onClick={endSessionPrompt}
                className="h-28 flex flex-col items-center justify-center rounded-2xl gap-3 ring-1 ring-rose-200/70 bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition-all"
                aria-label="End"
              >
                <div className="h-12 w-12 rounded-full grid place-items-center ring-2 ring-rose-300/60 bg-white">
                  <Square className="h-6 w-6 text-rose-600" />
                </div>
                <div className="font-semibold">End</div>
              </Button>
            </div>
          )}
        </CardContent>

      </Card>

      {/* Today’s Goals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" /> Today's goals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Time goal (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={timeGoalMin}
              onChange={(e) => setTimeGoalMin(e.target.value)}
              onBlur={() => {
                if (timeGoalMin === "") setTimeGoalMin(0);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Route goal (count)</Label>
            <Input
              type="number"
              min={0}
              value={routeGoal}
              onChange={(e) => setRouteGoal(Number(e.target.value))}
              onBlur={() => {
                if (routeGoal === "") setRouteGoal(0);
              }}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs flex items-center gap-2">
              <FileText className="h-8 w-4 text-orange-500" /> Notes
            </Label>
            <Textarea
              rows={3}
              placeholder="Optional session notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* During session controls */}
      {session && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-500" /> Routes
              </span>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  Sent {session.routes.filter((r) => r.sent).length}
                </Badge>
                <Badge variant="secondary">
                  Attempts {session.routes.reduce((a, b) => a + b.attempts, 0)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={addRouteClick} className="gap-2 w-full">
              <Plus className="h-4 w-4 text-orange-500" /> Add route
            </Button>

            {session.routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Climb your first route!
              </p>
            ) : (
              <div className="space-y-2">
                {session.routes.map((r) => (
                  <div key={r.id} className="p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {r.gradeLabel}
                        </Badge>
                        <span className="font-medium text-sm">{renderSystemName(r)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => incAttempt(r.id, -1)}
                          disabled={(r.sent && r.attempts <= 1) || (!r.sent && r.attempts === 0)}
                          className={`h-5 w-5 ${(r.sent && r.attempts <= 1) || (!r.sent && r.attempts === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-primary'}`}
                          aria-label="Decrease attempts"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        <div className="text-center min-w-[60px]">
                          <div className="font-bold text-primary">{r.attempts}</div>
                          <div className="text-xs text-muted-foreground">attempts</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => incAttempt(r.id, 1)}
                          className="h-5 w-5 cursor-pointer hover:text-primary"
                          aria-label="Increase attempts"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => toggleSent(r.id)}
                          className={`transition-opacity ${
                            r.sent
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "opacity-40 hover:opacity-60"
                          }`}
                        >
                          {r.sent && r.attempts === 1 ? (
                            <Zap className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Sent!
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRoute(r.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    {r.description && (
                      <div className="text-sm text-muted-foreground text-wrap">
                        {r.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Outdoor Routes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trees className="h-5 w-5 text-primary" />
            Outdoor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Sub-tabs */}
          <div className="flex rounded-xl overflow-hidden border border-border/60">
            <button
              onClick={() => { setOutdoorTab("projecting"); setOutdoorSearch(""); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                outdoorTab === "projecting"
                  ? "bg-orange-500 text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Projecting
            </button>
            <button
              onClick={() => { setOutdoorTab("sent"); setOutdoorSearch(""); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                outdoorTab === "sent"
                  ? "bg-green-600 text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Sent
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={outdoorSearch}
              onChange={(e) => setOutdoorSearch(e.target.value)}
              placeholder="Search by name, location, or grade..."
              className="pl-9"
            />
            {outdoorSearch && (
              <button onClick={() => setOutdoorSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Projecting Tab */}
          {outdoorTab === "projecting" && (
            <ProjectingTab
              sessionRoutes={sessionRoutes}
              confirmedRoutes={confirmedRoutes}
              outdoorSearch={outdoorSearch}
              activePendingSentIds={activePendingSentIds}
              dirtyConfirmedIds={dirtyConfirmedIds}
              renderOutdoorSystemName={renderOutdoorSystemName}
              toDateInput={toDateInput}
              updateOutdoorAttempts={updateOutdoorAttempts}
              toggleOutdoorSent={toggleOutdoorSent}
              updateOutdoorRoute={updateOutdoorRoute}
              removeOutdoorRoute={removeOutdoorRoute}
              confirmSession={confirmSession}
              confirmActiveProjects={confirmActiveProjects}
              setNewOutdoorStartedAt={setNewOutdoorStartedAt}
              setIsAddOutdoorDialogOpen={setIsAddOutdoorDialogOpen}
              setOutdoorDeleteConfirmId={setOutdoorDeleteConfirmId}
            />
          )}

          {/* Sent Tab */}
          {outdoorTab === "sent" && (
            <SentTab
              confirmedRoutes={confirmedRoutes}
              outdoorSearch={outdoorSearch}
              dirtyConfirmedIds={dirtyConfirmedIds}
              renderOutdoorSystemName={renderOutdoorSystemName}
              toDateInput={toDateInput}
              updateOutdoorRoute={updateOutdoorRoute}
              removeOutdoorRoute={removeOutdoorRoute}
              confirmSentEdits={confirmSentEdits}
              setOutdoorDeleteConfirmId={setOutdoorDeleteConfirmId}
            />
          )}
        </CardContent>
      </Card>

      {/* Location picker dialog */}
      <Dialog open={openLoc} onOpenChange={setOpenLoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select location</DialogTitle>
            <DialogDescription>Choose the gym where you're climbing.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-xl border">
            <ScrollArea className="max-h-80">
              {locations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No locations available.
                </div>
              ) : (
                <div className="divide-y">
                  {locations.flatMap((countryObj) =>
                    Object.entries(countryObj).map(([country, cities]) => (
                      <div key={country} className="p-2">
                        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {country}
                        </div>
                        {Object.entries(cities).map(([city, gyms]) => (
                          <div key={city} className="mt-1">
                            <div className="px-2 py-1 text-sm font-medium">{city}</div>
                            <div className="space-y-1">
                              {gyms.map((gym) => {
                                const selected =
                                  location?.gym === gym &&
                                  location?.city === city &&
                                  location?.country === country;
                                return (
                                  <button
                                    key={gym}
                                    type="button"
                                    onClick={() => pickLocation({ country, city, gym })}
                                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                      selected
                                        ? "bg-orange-100 text-orange-700"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <span className="truncate">{gym}</span>
                                    {selected && <Check className="h-4 w-4 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                setShowCustomLocation(true);
                setCustomLocation(location?.custom ? location.gym : "");
              }}
            >
              Other
            </Button>
            {showCustomLocation && (
              <div className="space-y-2 rounded-xl border p-3">
                <Label htmlFor="custom-climb-location" className="text-xs">
                  Gym location
                </Label>
                <Input
                  id="custom-climb-location"
                  placeholder="Type gym location"
                  value={customLocation}
                  onChange={(e) => updateCustomLocation(e.target.value)}
                  maxLength={CUSTOM_LOCATION_MAX_LENGTH}
                />
                <div className="text-xs text-muted-foreground">
                  {customLocation.length}/{CUSTOM_LOCATION_MAX_LENGTH}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {location && (
              <Button
                variant="secondary"
                onClick={() => {
                  setLocation(null);
                  localStorage.removeItem(LS_KEYS.LOCATION);
                  setSession((prev) => (prev ? { ...prev, location: undefined } : prev));
                  setShowCustomLocation(false);
                  setCustomLocation("");
                  setOpenLoc(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button variant="secondary" onClick={() => setOpenLoc(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Route dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Grade System</Label>
                <Select
                  value={gsId != null ? String(gsId) : undefined}
                  onValueChange={(v) => {
                    const next = Number(v);
                    setGsId(next);
                    localStorage.setItem(LS_KEYS.DEFAULT_GS, String(next));
                    if (next !== 999) setCustomGs("");
                    const preset = byId.get(next)?.grades ?? [];
                    setGrade(preset[0] ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade system" />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((s) => (
                      <SelectItem key={s.gradeId} value={String(s.gradeId)}>
                        {s.gradeSystem}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="999">Other</SelectItem>
                  </SelectContent>
                </Select>

                {gsId === 999 && (
                  <Input
                    placeholder="Enter custom system name (e.g. Local Gym)"
                    value={customGs}
                    onChange={(e) => setCustomGs(e.target.value)}
                    maxLength={12}
                  />
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Grade</Label>
                {gsId !== 999 && (byId.get(gsId!)?.grades?.length ?? 0) > 0 ? (
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {((byId.get(gsId!)?.grades ?? []) as string[]).map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Type grade label (e.g. L10)"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    maxLength={8}
                  />
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Route color, wall, etc."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={25}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={pushRoute}
              disabled={!grade || (gsId === 999 && !customGs.trim())}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session dialog (lists ALL attempted routes) */}
      <Dialog open={openEnd} onOpenChange={setOpenEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End session?</DialogTitle>
            <DialogDescription>
              This will save your session with all routes (sent or not) and clear local data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border">
              <ScrollArea className="max-h-64">
                <div className="divide-y">
                  {session?.routes.map((r) => (
                    <div key={r.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {renderSystemName(r)} {r.gradeLabel}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">Attempts {r.attempts}</Badge>
                          <Badge variant={r.sent ? "default" : "secondary"}>
                            {r.sent ? "Sent" : "Not sent"}
                          </Badge>
                        </div>
                      </div>
                      {r.description && (
                        <div className="text-muted-foreground mt-1">{r.description}</div>
                      )}
                    </div>
                  ))}
                  {session?.routes.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">
                      No routes in this session.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            {commitError && <div className="text-sm text-destructive">{commitError}</div>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenEnd(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={commitSession} disabled={committing}>
              {committing ? "Saving..." : "Save & end"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Outdoor Route dialog */}
      <Dialog open={isAddOutdoorDialogOpen} onOpenChange={setIsAddOutdoorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Outdoor Project</DialogTitle>
            <DialogDescription>
              Add a new outdoor climbing route to your session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Route Name *</Label>
              <Input
                placeholder="Route name (e.g. The Nose)"
                value={newOutdoorName}
                onChange={(e) => setNewOutdoorName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Location *</Label>
              <Input
                placeholder="Location (e.g. Yosemite, CA)"
                value={newOutdoorLocation}
                onChange={(e) => setNewOutdoorLocation(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Grade System</Label>
              <Select
                value={newOutdoorGradeSystem != null ? String(newOutdoorGradeSystem) : undefined}
                onValueChange={(v) => {
                  const next = Number(v);
                  setNewOutdoorGradeSystem(next);
                  localStorage.setItem(LS_KEYS.DEFAULT_GS, String(next));
                  if (next !== 999) setNewOutdoorCustomGs("");
                  const preset = byId.get(next)?.grades ?? [];
                  setNewOutdoorGrade(preset[0] ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s) => (
                    <SelectItem key={s.gradeId} value={String(s.gradeId)}>
                      {s.gradeSystem}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="999">Other</SelectItem>
                </SelectContent>
              </Select>

              {newOutdoorGradeSystem === 999 && (
                <Input
                  placeholder="Enter custom system name (e.g. Local Gym)"
                  value={newOutdoorCustomGs}
                  onChange={(e) => setNewOutdoorCustomGs(e.target.value)}
                  maxLength={12}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Grade *</Label>
              {newOutdoorGradeSystem !== 999 && (byId.get(newOutdoorGradeSystem!)?.grades?.length ?? 0) > 0 ? (
                <Select value={newOutdoorGrade} onValueChange={setNewOutdoorGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {((byId.get(newOutdoorGradeSystem!)?.grades ?? []) as string[]).map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Type grade label (e.g. L10)"
                  value={newOutdoorGrade}
                  onChange={(e) => setNewOutdoorGrade(e.target.value)}
                  maxLength={8}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Start Date *</Label>
              <Input
                type="date"
                value={newOutdoorStartedAt}
                onChange={(e) => setNewOutdoorStartedAt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Route description, beta notes, etc."
                value={newOutdoorDescription}
                onChange={(e) => setNewOutdoorDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={addOutdoorRoute}
              disabled={!newOutdoorName.trim() || !newOutdoorLocation.trim() || !newOutdoorGrade.trim() || (newOutdoorGradeSystem === 999 && !newOutdoorCustomGs.trim())}
            >
              Add Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation dialog */}
      <Dialog open={outdoorDeleteConfirmId !== null} onOpenChange={() => setOutdoorDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The route will be permanently deleted from your collection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOutdoorDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDeleteOutdoor}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
