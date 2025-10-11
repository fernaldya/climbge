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
import { Play, Pause, Square, Plus, Minus, CheckCircle, Clock, Target, FileText, Trash2, Check, Zap } from "lucide-react";
import { apiFetchGradeSystems, apiCommitClimbSession } from "../lib/api";
import type { LocalSession, LocalRoute, GradeSystem } from "../types/climb";

// --- Config / constants ----------------------------------------------------
const LS_KEYS = {
  CURRENT: "climb.currentSession",
  DEFAULT_GS: "climb.defaultGradeSystem",
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

// --- Component -------------------------------------------------------------
export function ClimbTab() {
  // Session state
  const [session, setSession] = useState<LocalSession | null>(null);
  const [notes, setNotes] = useState("");

  // Timer
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const timerRef = useRef<number | null>(null);

  // Goals
  const [timeGoalMin, setTimeGoalMin] = useState<number | string>(120);
  const [routeGoal, setRouteGoal] = useState<number>(15);

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

  // End Session dialog
  const [openEnd, setOpenEnd] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Mount: load session + systems
  useEffect(() => {
    const ls = loadSession();
    if (ls) {
      setSession(ls);
      setNotes(ls.notes || "");
      const started = new Date(ls.startedAt).getTime();
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - started) / 1000)));
      setRunning(true);
    }
    (async () => {
      try {
        setSystems(await apiFetchGradeSystems());
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
    if (!running) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }
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
  }, [running]);

  const hhmmss = useMemo(() => {
    const s = Math.floor(elapsed);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [elapsed]);

  // --- Actions -------------------------------------------------------------
  function startSession() {
    if (session) return; // already running
    const now = new Date().toISOString();
    const ls: LocalSession = { sessionId: uuid(), startedAt: now, notes, routes: [] };
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
    // default to first system if available, else "Other"
    const firstId = systems[0]?.gradeId ?? 999;
    setGsId(firstId);
    setCustomGs("");
    const preset = byId.get(firstId)?.grades ?? [];
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
        session: { started_at: session.startedAt, ended_at: new Date().toISOString(), notes },
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
          {!session ? (
            // Idle → Big full-width Start button
            <div className="mt-2">
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
              onChange={(e) => setTimeGoalMin(e.target.value)}  // OK now
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
              onChange={(e) => setRouteGoal(Number(e.target.value) || 0)}
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
                  <div key={r.id} className="p-3 rounded-xl bg-muted/50">
                    <div className="grid grid-cols-5 gap-3 items-center">
                      <div className="min-w-0">
                        <div className="text-sm text-wrap">
                          {renderSystemName(r)} {r.gradeLabel}
                        </div>
                        {r.description && (
                          <div className="text-sm text-muted-foreground mt-0.5 text-wrap">
                            {r.description}
                          </div>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => incAttempt(r.id, -1)}
                        >
                          <Minus className="h-4 w-4 ml-3" />
                        </Button>
                        <Badge className="min-w-10 justify-center -ml-3">{r.attempts}</Badge>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => incAttempt(r.id, +1)}
                        >
                          <Plus className="h-4 w-4 -ml-3" />
                        </Button>
                        <Button
                          onClick={() => toggleSent(r.id)}
                          className={`gap-2 transition-opacity -ml-3 ${
                            r.sent
                              ? "opacity-100 bg-green-500 text-white hover:bg-green-600"
                              : "opacity-40 hover:opacity-60"
                          }`}
                          variant="default"
                        >
                          {/* Fixed space for icon */}
                          <span className="inline-block w-4">
                            {r.sent && r.attempts === 1 && <Zap className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                            {r.sent && r.attempts > 1 && <Check className="h-4 w-4" />}
                          </span>
                          Sent
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRoute(r.id)}
                          className="-ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
