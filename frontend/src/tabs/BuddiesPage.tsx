import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { ArrowLeft, Users, Plus, MapPin, CalendarClock, Trash2, ChevronRight } from "lucide-react";
import {
  apiListBuddies, apiCreateBuddy, apiBuddyFeed, apiListPlannedClimbs, apiCancelPlannedClimb,
} from "../lib/api";
import type { BuddySummary, BuddyFeedItem, PlannedClimb } from "../types/buddy";
import { InviteBanner } from "../components/InviteBanner";
import { BuddyGroupDialog } from "../components/BuddyGroupDialog";
import { PlanClimbDialog } from "../components/PlanClimbDialog";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatPlan(p: PlannedClimb): string {
  const date = formatDate(p.planned_date);
  return p.planned_time ? `${date} · ${p.planned_time}` : date;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

function SectionHeader({ icon, title, action }: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2.5 text-base font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-500">
          {icon}
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function SectionAction({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-orange-600 transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, action, children }: {
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-500">
        {icon}
      </span>
      <p className="max-w-[30ch] text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

export function BuddiesTab() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<BuddySummary[]>([]);
  const [feed, setFeed] = useState<BuddyFeedItem[]>([]);
  const [plans, setPlans] = useState<PlannedClimb[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  async function refresh() {
    const [g, f, p] = await Promise.allSettled([apiListBuddies(), apiBuddyFeed(), apiListPlannedClimbs()]);
    if (g.status === "fulfilled") setGroups(g.value);
    if (f.status === "fulfilled") setFeed(f.value);
    if (p.status === "fulfilled") setPlans(p.value);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createGroup() {
    if (!newName.trim() || createBusy) return;
    setCreateErr(null);
    setCreateBusy(true);
    try {
      await apiCreateBuddy(newName.trim());
      setNewName("");
      setCreating(false);
      await refresh();
    } catch (e: any) {
      setCreateErr(e?.message || "Could not create group.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function cancelPlan(id: string) {
    setPlanErr(null);
    try {
      await apiCancelPlannedClimb(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setPlanErr("Could not cancel plan. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/app/home")}
          className="-ml-1 rounded-lg p-1 text-gray-500 transition hover:bg-orange-50 hover:text-orange-500"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold leading-tight">Buddy Hub</h1>
          <p className="text-sm text-muted-foreground">Plan sessions and follow your crew</p>
        </div>
      </div>

      <InviteBanner onChanged={refresh} />

      {/* My buddy groups */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 pt-5 space-y-4">
          <SectionHeader
            icon={<Users className="h-4 w-4" />}
            title="My Buddies"
            action={
              <SectionAction onClick={() => setCreating((v) => !v)}>
                <Plus className="h-4 w-4" /> New
              </SectionAction>
            }
          />

          {creating && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  placeholder="Group name"
                  value={newName}
                  maxLength={100}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createGroup();
                    if (e.key === "Escape") setCreating(false);
                  }}
                />
                <Button
                  className="bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                  onClick={createGroup}
                  disabled={!newName.trim() || createBusy}
                >
                  {createBusy ? "Creating…" : "Create"}
                </Button>
              </div>
              {createErr && <p className="text-xs text-red-600">{createErr}</p>}
            </div>
          )}

          {loading ? (
            <ListSkeleton />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              action={
                !creating && (
                  <button
                    onClick={() => setCreating(true)}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
                  >
                    Create a group
                  </button>
                )
              }
            >
              No groups yet. Create one and invite your climbing buddies.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setOpenGroup(g.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition hover:border-orange-200 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{g.name}</span>
                          {g.your_role === "owner" && <Badge variant="secondary" size="sm">owner</Badge>}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {g.member_count} member{g.member_count === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-orange-400 transition group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* My plans */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 pt-5 space-y-4">
          <SectionHeader
            icon={<CalendarClock className="h-4 w-4" />}
            title="My Plans"
            action={
              <SectionAction onClick={() => setPlanOpen(true)}>
                <Plus className="h-4 w-4" /> Plan
              </SectionAction>
            }
          />
          {planErr && <p className="text-xs text-red-600">{planErr}</p>}

          {loading ? (
            <ListSkeleton />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              action={
                <button
                  onClick={() => setPlanOpen(true)}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
                >
                  Plan a climb
                </button>
              }
            >
              No upcoming plans. Let your buddies know where you're headed.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-orange-100/80">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <div className="truncate font-medium">{p.gym}</div>
                      <div className="text-xs text-muted-foreground">{formatPlan(p)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelPlan(p.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Cancel plan"
                    aria-label="Cancel plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Buddy feed */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 pt-5 space-y-4">
          <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Where your buddies climb" />

          {loading ? (
            <ListSkeleton />
          ) : feed.length === 0 ? (
            <EmptyState icon={<MapPin className="h-5 w-5" />}>
              No buddies yet. Invite people to a group to see their climbs.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-orange-100/80">
              {feed.map((b) => (
                <li key={b.user_id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
                    {initials(b.name || b.username)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name || b.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.last_climb?.location
                        ? `Last climbed at ${b.last_climb.location} · ${formatDate(b.last_climb.climb_date)}`
                        : "No climbs logged yet"}
                    </div>
                    {b.planned_climbs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {b.planned_climbs.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700"
                          >
                            <CalendarClock className="h-3 w-3 shrink-0" /> {p.gym} · {formatPlan(p)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BuddyGroupDialog
        buddyId={openGroup}
        open={openGroup !== null}
        onOpenChange={(v) => { if (!v) setOpenGroup(null); }}
        onChanged={refresh}
      />
      <PlanClimbDialog open={planOpen} onOpenChange={setPlanOpen} groups={groups} onCreated={refresh} />
    </div>
  );
}
