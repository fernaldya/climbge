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
            <h2 className="font-semibold">My buddy groups</h2>
            <Button variant="ghost" className="h-8 px-2" onClick={() => setCreating((v) => !v)}>
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
            <p className="text-sm text-muted-foreground">No groups yet. Create one and invite your climbing buddies.</p>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setOpenGroup(g.id)}
                    className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-gray-50 transition"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      {g.your_role === "owner" && <Badge variant="secondary">owner</Badge>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {g.member_count} member{g.member_count === 1 ? "" : "s"}
                      <ChevronRight className="h-4 w-4" />
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
            <h2 className="font-semibold">My planned climbs</h2>
            <Button className="h-8 px-3" onClick={() => setPlanOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Plan
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming plans. Let your buddies know where you're headed.</p>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="text-sm">
                    <div className="flex items-center gap-1 font-medium">
                      <MapPin className="h-4 w-4 text-orange-500" /> {p.gym}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" /> {formatPlan(p)}
                    </div>
                  </div>
                  <button
                    onClick={() => cancelPlan(p.id)}
                    className="p-1 text-red-500 hover:text-red-600"
                    title="Cancel plan"
                    aria-label="Cancel plan"
                  >
                    <Trash2 className="h-5 w-5" />
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
          <h2 className="font-semibold">Where your buddies climb</h2>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buddies yet. Invite people to a group to see their climbs.</p>
          ) : (
            <ul className="space-y-3">
              {feed.map((b) => (
                <li key={b.user_id} className="rounded-xl border p-3 space-y-1">
                  <div className="font-medium">{b.name || b.username}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {b.last_climb?.location
                      ? `Last climbed at ${b.last_climb.location} · ${formatDate(b.last_climb.climb_date)}`
                      : "No climbs logged yet"}
                  </div>
                  {b.planned_climbs.length > 0 && (
                    <div className="space-y-0.5 pt-1">
                      {b.planned_climbs.map((p) => (
                        <div key={p.id} className="flex items-center gap-1 text-xs text-orange-600">
                          <CalendarClock className="h-3.5 w-3.5" /> Planning {p.gym} · {formatPlan(p)}
                        </div>
                      ))}
                    </div>
                  )}
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
