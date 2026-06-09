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

function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500">
        {icon}
      </span>
      <p className="text-sm text-muted-foreground">{children}</p>
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
  const [newName, setNewName] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

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
    if (!newName.trim()) return;
    setCreateErr(null);
    try {
      await apiCreateBuddy(newName.trim());
      setNewName("");
      setCreating(false);
      await refresh();
    } catch (e: any) {
      setCreateErr(e?.message || "Could not create group.");
    }
  }

  async function cancelPlan(id: string) {
    try {
      await apiCancelPlannedClimb(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/app/home")}
          className="p-1 -ml-1 text-gray-600 hover:text-orange-500 transition"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" /> Buddy Hub
        </h1>
      </div>

      <InviteBanner onChanged={refresh} />

      {/* My buddy groups */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-orange-500" /> My buddy groups
            </h2>
            <Button variant="ghost" className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setCreating((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>

          {creating && (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Group name"
                  value={newName}
                  maxLength={100}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createGroup(); }}
                />
                <Button onClick={createGroup} disabled={!newName.trim()}>Create</Button>
              </div>
              {createErr && <p className="text-xs text-destructive">{createErr}</p>}
            </div>
          )}

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : groups.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />}>
              No groups yet. Create one and invite your climbing buddies.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setOpenGroup(g.id)}
                    className="group flex w-full items-center justify-between rounded-xl border border-orange-100 bg-orange-50/40 p-3 text-left transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{g.name}</span>
                        {g.your_role === "owner" && <Badge variant="secondary">owner</Badge>}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {g.member_count} member{g.member_count === 1 ? "" : "s"}
                      <ChevronRight className="h-4 w-4 text-orange-400 transition group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* My plans */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="h-5 w-5 text-orange-500" /> My planned climbs
            </h2>
            <Button className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setPlanOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Plan
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : plans.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-5 w-5" />}>
              No upcoming plans. Let your buddies know where you're headed.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="text-sm">
                      <div className="font-medium">{p.gym}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" /> {formatPlan(p)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelPlan(p.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
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
        <CardContent className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-orange-500" /> Where your buddies climb
          </h2>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : feed.length === 0 ? (
            <EmptyState icon={<MapPin className="h-5 w-5" />}>
              No buddies yet. Invite people to a group to see their climbs.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {feed.map((b) => (
                <li key={b.user_id} className="flex gap-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
                    {initials(b.name || b.username)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium">{b.name || b.username}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {b.last_climb?.location
                        ? `Last climbed at ${b.last_climb.location} · ${formatDate(b.last_climb.climb_date)}`
                        : "No climbs logged yet"}
                    </div>
                    {b.planned_climbs.length > 0 && (
                      <div className="space-y-0.5 pt-1">
                        {b.planned_climbs.map((p) => (
                          <div key={p.id} className="flex items-center gap-1 text-xs font-medium text-orange-600">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Planning {p.gym} · {formatPlan(p)}
                          </div>
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
