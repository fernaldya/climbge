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
import { apiFetchGradeSystems, apiCommitClimbSession, apiFetchClimbLocations, apiFetchOutdoorClimbs, apiSaveOutdoorClimbs, apiUpdateOutdoorClimbs, apiDeleteOutdoorClimb } from "../lib/api";
import type { LocalSession, LocalRoute, GradeSystem, ClimbLocations, SelectedLocation, OutdoorRoute, OutdoorLabelCache, OutdoorUpdatePayload } from "../types/climb";
import { fromOutdoorRow, toOutdoorCreatePayload } from "../types/climb";

// --- Config / constants ----------------------------------------------------
const LS_KEYS = {
  CURRENT: "climb.currentSession",
  DEFAULT_GS: "climb.defaultGradeSystem",
  DEFAULT_OUTDOOR_GS: "climb.defaultOutdoorGradeSystem",
  LOCATION: "climb.location",
} as const;

const CUSTOM_LOCATION_MAX_LENGTH = 75;
const OTHER_GRADE_SYSTEM_ID = 999;

const OUTDOOR_STORAGE_KEYS = {
  /** Routes added this session that have not been saved to the server yet. */
  SESSION: "climb.outdoorSession",
  /** Last known server state, so the list paints before the fetch resolves. */
  CACHE: "climb.outdoorCache",
  /** Edits to server-side routes awaiting a "Confirm & Save". */
  PENDING: "climb.outdoorPendingEdits",
  /** route_id -> custom grade system name; the server has nowhere to keep it. */
  LABELS: "climb.outdoorLabels",
} as const;

/** Pre-DB storage key; cleared on load so old local rows don't show up as phantoms. */
const LEGACY_OUTDOOR_CONFIRMED = "climb.outdoorConfirmed";

/** The subset of an outdoor route the user can change after it has been saved. */
type OutdoorEdit = Partial<Pick<OutdoorRoute, "attempts" | "isSent" | "sentAt" | "startedAt">>;
type PendingEdits = Record<string, OutdoorEdit>;


// --- Helpers ---------------------------------------------------------------
function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Today as YYYY-MM-DD in the user's own timezone (toISOString would give the UTC day). */
function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
function readStored<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Dates round-trip as plain YYYY-MM-DD, so only trim anything longer. */
function toDateInput(dateStr: string | undefined): string {
  return dateStr ? dateStr.slice(0, 10) : "";
}

function filterOutdoorRoutes(routes: OutdoorRoute[], searchQuery: string): OutdoorRoute[] {
  if (!searchQuery.trim()) return routes;
  const query = searchQuery.toLowerCase();
  return routes.filter((r) =>
    r.name.toLowerCase().includes(query) ||
    r.location.toLowerCase().includes(query) ||
    r.grade.toLowerCase().includes(query) ||
    (r.description?.toLowerCase().includes(query) ?? false)
  );
}

/** A sent route always has at least one attempt; an unsent one can go down to zero. */
function attemptsFloor(isSent: boolean): number {
  return isSent ? 1 : 0;
}

function toUpdatePayload(routeId: string, edit: OutdoorEdit): OutdoorUpdatePayload {
  return {
    route_id: routeId,
    attempts: edit.attempts,
    sent: edit.isSent,
    sent_at: edit.sentAt,
    first_climb_date: edit.startedAt,
  };
}

// --- Outdoor sub-components ---------------------------------------------------
// Declared at module scope: nesting them inside ClimbTab makes React see a brand new
// component type on every render, remounting the whole subtree (and dropping focus in
// the search box) on each keystroke.

interface OutdoorRouteCardProps {
  route: OutdoorRoute;
  /** True while the route only exists in localStorage, before Confirm & Save. */
  isSessionRoute: boolean;
  isDirty: boolean;
  /** The send status has an unconfirmed change; shows a "Pending" badge. */
  isPendingSendChange: boolean;
  renderSystemName: (r: OutdoorRoute) => string;
  onAttempts: (id: string, delta: number) => void;
  onToggleSent: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

function OutdoorRouteCard({
  route,
  isSessionRoute,
  isDirty,
  isPendingSendChange,
  renderSystemName,
  onAttempts,
  onToggleSent,
  onRequestDelete,
}: OutdoorRouteCardProps) {
  const atFloor = route.attempts <= attemptsFloor(route.isSent);

  return (
    <div className={`p-4 bg-muted/30 rounded-xl border ${isDirty ? 'border-orange-400 ring-1 ring-orange-200' : 'border-border/50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {route.grade}
            </Badge>
            <span className="font-medium text-sm">{renderSystemName(route)}</span>
            {isSessionRoute && (
              <Badge variant="outline" className="text-xs">Unsaved</Badge>
            )}
            {isPendingSendChange && (
              <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                Pending
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
        {route.isSent && route.sentAt && (
          <div className="flex items-center gap-3 flex-wrap">
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-green-600">Sent: {toDateInput(route.sentAt)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onAttempts(route.id, -1)}
              disabled={atFloor}
              className={`h-5 w-5 ${atFloor ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-primary'}`}
              aria-label="Decrease attempts"
            >
              <Minus className="h-3 w-3" />
            </button>
            <div className="text-center min-w-[52px]">
              <div className={`font-bold ${route.isSent ? 'text-green-700' : 'text-primary'}`}>{route.attempts}</div>
              <div className="text-xs text-muted-foreground">attempts</div>
            </div>
            <button
              type="button"
              onClick={() => onAttempts(route.id, 1)}
              className="h-5 w-5 cursor-pointer hover:text-primary"
              aria-label="Increase attempts"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <Button
              size="sm"
              variant="default"
              onClick={() => onToggleSent(route.id)}
              className={
                route.isSent
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "opacity-40 hover:opacity-60"
              }
              title={route.isSent ? "Tap to mark as not sent" : "Tap to mark as sent"}
            >
              {route.isSent && route.attempts === 1 ? (
                <Zap className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Sent!
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRequestDelete(route.id)}
              className="text-destructive hover:text-destructive text-xs h-6 px-2"
            >
              Remove
            </Button>
          </div>
        </div>

        {route.description && (
          <div className="text-sm text-muted-foreground text-wrap pt-2 border-t border-border/30">
            {route.description}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectingTabProps {
  /** Unsaved routes from this session (localStorage only). */
  sessionRoutes: OutdoorRoute[];
  /** Saved-but-unsent routes (the DB copy, with any pending edits applied). */
  activeRoutes: OutdoorRoute[];
  outdoorSearch: string;
  busy: boolean;
  activePendingCount: number;
  isDirty: (id: string) => boolean;
  isPendingSendChange: (id: string) => boolean;
  renderSystemName: (r: OutdoorRoute) => string;
  onAttempts: (id: string, delta: number) => void;
  onToggleSent: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onAddClick: () => void;
  onConfirmSession: () => void;
  onSaveActive: () => void;
}

function ProjectingTab({
  sessionRoutes,
  activeRoutes,
  outdoorSearch,
  busy,
  activePendingCount,
  isDirty,
  isPendingSendChange,
  renderSystemName,
  onAttempts,
  onToggleSent,
  onRequestDelete,
  onAddClick,
  onConfirmSession,
  onSaveActive,
}: ProjectingTabProps) {
  const filteredSession = filterOutdoorRoutes(sessionRoutes, outdoorSearch);
  const filteredActive = filterOutdoorRoutes(activeRoutes, outdoorSearch);

  return (
    <div className="space-y-5">
      {/* Current Session — lives in localStorage until Confirm & Save */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Session</span>
          <span className="text-xs text-muted-foreground">{sessionRoutes.length} route{sessionRoutes.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredSession.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            {outdoorSearch ? 'No matches.' : 'No routes added yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSession.map((route) => (
              <OutdoorRouteCard
                key={route.id}
                route={route}
                isSessionRoute
                isDirty={false}
                isPendingSendChange={false}
                renderSystemName={renderSystemName}
                onAttempts={onAttempts}
                onToggleSent={onToggleSent}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </div>
        )}
        <Button onClick={onAddClick} variant="outline" className="w-full mt-3">
          <Plus className="h-4 w-4 mr-2" />Add Project
        </Button>
        {sessionRoutes.length > 0 && (
          <Button onClick={onConfirmSession} disabled={busy} className="w-full mt-2 bg-primary hover:bg-primary/90">
            <CheckCircle className="h-4 w-4 mr-2" />
            {busy
              ? 'Saving…'
              : `Confirm & Save (${sessionRoutes.length} route${sessionRoutes.length !== 1 ? 's' : ''})`}
          </Button>
        )}
      </div>

      {/* Active Project — already saved to the server, not sent yet */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Project</span>
          <span className="text-xs text-muted-foreground">{activeRoutes.length} route{activeRoutes.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredActive.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            {outdoorSearch ? 'No matches.' : 'Nothing saved yet — confirm a session route to start a project.'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredActive.map((r) => (
              <OutdoorRouteCard
                key={r.id}
                route={r}
                isSessionRoute={false}
                isDirty={isDirty(r.id)}
                isPendingSendChange={isPendingSendChange(r.id)}
                renderSystemName={renderSystemName}
                onAttempts={onAttempts}
                onToggleSent={onToggleSent}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </div>
        )}
        {activePendingCount > 0 && (
          <Button
            onClick={onSaveActive}
            disabled={busy}
            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {busy ? 'Saving…' : `Confirm & Save (${activePendingCount} change${activePendingCount !== 1 ? 's' : ''})`}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SentTabProps {
  sentRoutes: OutdoorRoute[];
  outdoorSearch: string;
  busy: boolean;
  pendingCount: number;
  isDirty: (id: string) => boolean;
  isPendingSendChange: (id: string) => boolean;
  renderSystemName: (r: OutdoorRoute) => string;
  onAttempts: (id: string, delta: number) => void;
  onToggleSent: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onSave: () => void;
}

function SentTab({
  sentRoutes,
  outdoorSearch,
  busy,
  pendingCount,
  isDirty,
  isPendingSendChange,
  renderSystemName,
  onAttempts,
  onToggleSent,
  onRequestDelete,
  onSave,
}: SentTabProps) {
  const filteredRoutes = filterOutdoorRoutes(sentRoutes, outdoorSearch);

  return (
    <div className="space-y-3">
      {pendingCount > 0 && (
        <Button
          onClick={onSave}
          disabled={busy}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {busy ? 'Saving…' : `Confirm & Save (${pendingCount} change${pendingCount !== 1 ? 's' : ''})`}
        </Button>
      )}

      {filteredRoutes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {outdoorSearch ? 'No matches.' : 'No sent routes yet. Send your first outdoor climb!'}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredRoutes.map((r) => (
            <OutdoorRouteCard
              key={r.id}
              route={r}
              isSessionRoute={false}
              isDirty={isDirty(r.id)}
              isPendingSendChange={isPendingSendChange(r.id)}
              renderSystemName={renderSystemName}
              onAttempts={onAttempts}
              onToggleSent={onToggleSent}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
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

  // Outdoor grade systems
  const [outdoorSystems, setOutdoorSystems] = useState<GradeSystem[]>([]);
  const outdoorById = useMemo(() => {
    const m = new Map<number, GradeSystem>();
    outdoorSystems.forEach(s => m.set(s.gradeId, s));
    return m;
  }, [outdoorSystems]);


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
    r.gradeSystem === OTHER_GRADE_SYSTEM_ID
      ? (r.gradeSystemLabel || "Other")
      : (r.gradeSystem ? (outdoorById.get(r.gradeSystem)?.gradeSystem ?? `System ${r.gradeSystem}`) : "System");

  // End Session dialog
  const [openEnd, setOpenEnd] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  // --- Outdoor state --------------------------------------------------------
  // Routes added this session; localStorage only until "Confirm & Save" posts them.
  const [sessionRoutes, setSessionRoutes] = useState<OutdoorRoute[]>(
    () => readStored<OutdoorRoute[]>(OUTDOOR_STORAGE_KEYS.SESSION, [])
  );
  // Server-side routes. Seeded from the cache so the list paints before the fetch lands.
  const [dbRoutes, setDbRoutes] = useState<OutdoorRoute[]>(
    () => readStored<OutdoorRoute[]>(OUTDOOR_STORAGE_KEYS.CACHE, [])
  );
  // Edits to server-side routes awaiting confirmation, keyed by route id.
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>(
    () => readStored<PendingEdits>(OUTDOOR_STORAGE_KEYS.PENDING, {})
  );
  // UI state
  const [outdoorTab, setOutdoorTab] = useState<"projecting" | "sent">("projecting");
  const [outdoorSearch, setOutdoorSearch] = useState("");
  const [outdoorBusy, setOutdoorBusy] = useState(false);
  const [outdoorError, setOutdoorError] = useState<string | null>(null);
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
  const [newOutdoorSentAt, setNewOutdoorSentAt] = useState("");

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
    // Fetched on mount, not on dialog open: the route cards need these names to render.
    (async () => {
      try {
        setOutdoorSystems(await apiFetchGradeSystems(true));
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
  // What the user sees: the server copy with any unconfirmed edits laid over the top.
  const effectiveRoutes = useMemo(
    () => dbRoutes.map((r) => ({ ...r, ...pendingEdits[r.id] })),
    [dbRoutes, pendingEdits]
  );
  // Which tab a route belongs to is decided by the *server* status, not the pending one:
  // marking an active project as sent leaves it in Active Project (badged "Pending") and it
  // only moves across once "Confirm & Save" has persisted the change.
  const activeRoutes = useMemo(
    () => dbRoutes.filter((r) => !r.isSent).map((r) => ({ ...r, ...pendingEdits[r.id] })),
    [dbRoutes, pendingEdits]
  );
  const sentRoutes = useMemo(
    () => dbRoutes.filter((r) => r.isSent).map((r) => ({ ...r, ...pendingEdits[r.id] })),
    [dbRoutes, pendingEdits]
  );

  const isDirty = (id: string) => Boolean(pendingEdits[id]);
  /** The send status has an unconfirmed change, in either direction. */
  const isPendingSendChange = (id: string) => pendingEdits[id]?.isSent !== undefined;
  const activePendingIds = useMemo(
    () => activeRoutes.filter((r) => pendingEdits[r.id]).map((r) => r.id),
    [activeRoutes, pendingEdits]
  );
  const sentPendingIds = useMemo(
    () => sentRoutes.filter((r) => pendingEdits[r.id]).map((r) => r.id),
    [sentRoutes, pendingEdits]
  );

  // Pull the server list and refresh the cache. Leaves the cache alone if the request
  // fails, so a flaky connection never looks like "all your routes disappeared".
  async function refreshOutdoor() {
    const rows = await apiFetchOutdoorClimbs();
    if (!rows) {
      setOutdoorError("Couldn't reach the server — showing your last saved copy.");
      return false;
    }
    setOutdoorError(null);
    const labels = readStored<OutdoorLabelCache>(OUTDOOR_STORAGE_KEYS.LABELS, {});
    const mapped = rows.map((row) => fromOutdoorRow(row, labels));
    setDbRoutes(mapped);
    writeStored(OUTDOOR_STORAGE_KEYS.CACHE, mapped);
    // Drop edits for routes that no longer exist server-side.
    const live = new Set(mapped.map((r) => r.id));
    setPendingEdits((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => live.has(id)))
    );
    return true;
  }

  useEffect(() => {
    localStorage.removeItem(LEGACY_OUTDOOR_CONFIRMED);
    refreshOutdoor();
  }, []);

  useEffect(() => {
    writeStored(OUTDOOR_STORAGE_KEYS.SESSION, sessionRoutes);
  }, [sessionRoutes]);

  useEffect(() => {
    writeStored(OUTDOOR_STORAGE_KEYS.PENDING, pendingEdits);
  }, [pendingEdits]);

  // Merge a change into the pending map, dropping fields that match the server value
  // again so a route stops showing as dirty once it's been edited back.
  function setPendingEdit(id: string, patch: OutdoorEdit) {
    setPendingEdits((prev) => {
      const base = dbRoutes.find((r) => r.id === id);
      const merged: OutdoorEdit = { ...prev[id], ...patch };
      if (base) {
        (Object.keys(merged) as (keyof OutdoorEdit)[]).forEach((k) => {
          if (merged[k] === base[k]) delete merged[k];
        });
      }
      const next = { ...prev };
      if (Object.keys(merged).length === 0) delete next[id];
      else next[id] = merged;
      return next;
    });
  }

  function openAddOutdoorDialog() {
    const saved = localStorage.getItem(LS_KEYS.DEFAULT_OUTDOOR_GS);
    const lastId = saved ? Number(saved) : (outdoorSystems[0]?.gradeId ?? OTHER_GRADE_SYSTEM_ID);
    setNewOutdoorGradeSystem(lastId);
    setNewOutdoorGrade(outdoorById.get(lastId)?.grades?.[0] ?? "");
    setNewOutdoorCustomGs("");
    setNewOutdoorName("");
    setNewOutdoorLocation("");
    setNewOutdoorDescription("");
    setNewOutdoorStartedAt(todayLocal());
    setNewOutdoorSentAt("");
    setIsAddOutdoorDialogOpen(true);
  }

  // The sent date is optional, but a route can't be sent before it was first tried.
  const sentBeforeStart = Boolean(
    newOutdoorSentAt && newOutdoorStartedAt && newOutdoorSentAt < newOutdoorStartedAt
  );
  const canAddOutdoorRoute =
    Boolean(newOutdoorName.trim()) &&
    Boolean(newOutdoorLocation.trim()) &&
    Boolean(newOutdoorGrade.trim()) &&
    !(newOutdoorGradeSystem === OTHER_GRADE_SYSTEM_ID && !newOutdoorCustomGs.trim()) &&
    !sentBeforeStart;

  function addOutdoorRoute() {
    if (!canAddOutdoorRoute) return;

    const isOther = newOutdoorGradeSystem === OTHER_GRADE_SYSTEM_ID;
    const startedAt = newOutdoorStartedAt || todayLocal();
    // A sent date means the route was already climbed: show it as sent with one attempt
    // so the user only has to bump the count up to however many it actually took.
    const sentAt = newOutdoorSentAt || undefined;

    const route: OutdoorRoute = {
      id: uuid(),
      name: newOutdoorName.trim(),
      location: newOutdoorLocation.trim(),
      gradeSystem: newOutdoorGradeSystem ?? OTHER_GRADE_SYSTEM_ID,
      gradeSystemLabel: isOther ? newOutdoorCustomGs.trim() : undefined,
      grade: newOutdoorGrade,
      description: newOutdoorDescription.trim() || undefined,
      attempts: sentAt ? 1 : 0,
      isSent: Boolean(sentAt),
      startedAt,
      sentAt,
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
    setNewOutdoorSentAt("");
  }

  function updateOutdoorAttempts(id: string, delta: number) {
    const sessionRoute = sessionRoutes.find((r) => r.id === id);
    if (sessionRoute) {
      setSessionRoutes((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, attempts: Math.max(attemptsFloor(r.isSent), r.attempts + delta) }
            : r
        )
      );
      return;
    }

    const route = effectiveRoutes.find((r) => r.id === id);
    if (!route) return;
    const attempts = Math.max(attemptsFloor(route.isSent), route.attempts + delta);
    if (attempts === route.attempts) return;
    setPendingEdit(id, { attempts });
  }

  function toggleOutdoorSent(id: string) {
    const sessionRoute = sessionRoutes.find((r) => r.id === id);
    if (sessionRoute) {
      setSessionRoutes((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          return r.isSent
            ? { ...r, isSent: false, sentAt: undefined }
            : { ...r, isSent: true, sentAt: todayLocal(), attempts: Math.max(1, r.attempts) };
        })
      );
      return;
    }

    const route = effectiveRoutes.find((r) => r.id === id);
    if (!route) return;
    setPendingEdit(
      id,
      route.isSent
        ? { isSent: false, sentAt: undefined }
        : { isSent: true, sentAt: todayLocal(), attempts: Math.max(1, route.attempts) }
    );
  }

  async function executeDeleteOutdoor() {
    const id = outdoorDeleteConfirmId;
    if (!id) return;
    setOutdoorDeleteConfirmId(null);

    if (sessionRoutes.some((r) => r.id === id)) {
      setSessionRoutes((prev) => prev.filter((r) => r.id !== id));
      return;
    }

    setOutdoorBusy(true);
    setOutdoorError(null);
    let deleteError: string | null = null;
    try {
      const res = await apiDeleteOutdoorClimb(id);
      if (!res.ok) deleteError = "Failed to delete the route.";
    } catch {
      deleteError = "Failed to delete the route.";
    }
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await refreshOutdoor();
    if (deleteError) setOutdoorError(deleteError);
    setOutdoorBusy(false);
  }

  // Push the current session's routes to the server as one batch. The server stores all
  // of them or none, so on failure the whole list stays put and the user can retry.
  async function confirmSession() {
    if (!sessionRoutes.length || outdoorBusy) return;
    setOutdoorBusy(true);
    setOutdoorError(null);

    const batch = sessionRoutes;
    let error: string | null = null;

    try {
      const res = await apiSaveOutdoorClimbs(batch.map(toOutdoorCreatePayload));
      if (res.ok && res.routes) {
        // Routes come back in the order they were sent, so custom grade-system labels
        // can be filed against the ids the server just assigned.
        const labels = readStored<OutdoorLabelCache>(OUTDOOR_STORAGE_KEYS.LABELS, {});
        res.routes.forEach((row, i) => {
          const source = batch[i];
          if (source?.gradeSystem === OTHER_GRADE_SYSTEM_ID && source.gradeSystemLabel) {
            labels[row.route_id] = source.gradeSystemLabel;
          }
        });
        writeStored(OUTDOOR_STORAGE_KEYS.LABELS, labels);
        setSessionRoutes([]);
      } else {
        error = res.error || "Couldn't save these routes.";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't save these routes.";
    }

    await refreshOutdoor();
    if (error) setOutdoorError(`${error} Your routes are still listed under Current Session.`);
    setOutdoorBusy(false);
  }

  // Commit pending edits as one batch; the server applies them all or rejects them all.
  async function savePendingEdits(ids: string[]) {
    if (!ids.length || outdoorBusy) return;
    setOutdoorBusy(true);
    setOutdoorError(null);

    const batch = ids
      .filter((id) => pendingEdits[id])
      .map((id) => toUpdatePayload(id, pendingEdits[id]));
    let error: string | null = null;

    try {
      const res = await apiUpdateOutdoorClimbs(batch);
      if (res.ok) {
        setPendingEdits((prev) => {
          const next = { ...prev };
          ids.forEach((id) => delete next[id]);
          return next;
        });
      } else {
        error = res.error || "Couldn't save these changes.";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't save these changes.";
    }

    // Refreshing also prunes edits for routes deleted elsewhere, so a retry after a
    // "some routes no longer exist" rejection goes through.
    await refreshOutdoor();
    if (error) setOutdoorError(error);
    setOutdoorBusy(false);
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

          {outdoorError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {outdoorError}
            </div>
          )}

          {/* Projecting Tab */}
          {outdoorTab === "projecting" && (
            <ProjectingTab
              sessionRoutes={sessionRoutes}
              activeRoutes={activeRoutes}
              outdoorSearch={outdoorSearch}
              busy={outdoorBusy}
              activePendingCount={activePendingIds.length}
              isDirty={isDirty}
              isPendingSendChange={isPendingSendChange}
              renderSystemName={renderOutdoorSystemName}
              onAttempts={updateOutdoorAttempts}
              onToggleSent={toggleOutdoorSent}
              onRequestDelete={setOutdoorDeleteConfirmId}
              onAddClick={openAddOutdoorDialog}
              onConfirmSession={confirmSession}
              onSaveActive={() => savePendingEdits(activePendingIds)}
            />
          )}

          {/* Sent Tab */}
          {outdoorTab === "sent" && (
            <SentTab
              sentRoutes={sentRoutes}
              outdoorSearch={outdoorSearch}
              busy={outdoorBusy}
              pendingCount={sentPendingIds.length}
              isDirty={isDirty}
              isPendingSendChange={isPendingSendChange}
              renderSystemName={renderOutdoorSystemName}
              onAttempts={updateOutdoorAttempts}
              onToggleSent={toggleOutdoorSent}
              onRequestDelete={setOutdoorDeleteConfirmId}
              onSave={() => savePendingEdits(sentPendingIds)}
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
                  localStorage.setItem(LS_KEYS.DEFAULT_OUTDOOR_GS, String(next));
                  if (next !== OTHER_GRADE_SYSTEM_ID) setNewOutdoorCustomGs("");
                  const preset = outdoorById.get(next)?.grades ?? [];
                  setNewOutdoorGrade(preset[0] ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade system" />
                </SelectTrigger>
                <SelectContent>
                  {outdoorSystems.map((s) => (
                    <SelectItem key={s.gradeId} value={String(s.gradeId)}>
                      {s.gradeSystem}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="999">Other</SelectItem>
                </SelectContent>
              </Select>

              {newOutdoorGradeSystem === OTHER_GRADE_SYSTEM_ID && (
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
              {newOutdoorGradeSystem !== OTHER_GRADE_SYSTEM_ID && (outdoorById.get(newOutdoorGradeSystem!)?.grades?.length ?? 0) > 0 ? (
                <Select value={newOutdoorGrade} onValueChange={setNewOutdoorGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(outdoorById.get(newOutdoorGradeSystem!)?.grades ?? []).map((g) => (
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
                max={newOutdoorSentAt || undefined}
                onChange={(e) => setNewOutdoorStartedAt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Sent Date (optional)</Label>
                {newOutdoorSentAt && (
                  <button
                    type="button"
                    onClick={() => setNewOutdoorSentAt("")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                type="date"
                value={newOutdoorSentAt}
                min={newOutdoorStartedAt || undefined}
                onChange={(e) => setNewOutdoorSentAt(e.target.value)}
              />
              <p className={`text-xs ${sentBeforeStart ? 'text-destructive' : 'text-muted-foreground'}`}>
                {sentBeforeStart
                  ? "Sent date can't be earlier than the start date."
                  : "Fill this in if you already sent it — the route starts at 1 attempt, adjust with + / −."}
              </p>
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
            <Button onClick={addOutdoorRoute} disabled={!canAddOutdoorRoute}>
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
