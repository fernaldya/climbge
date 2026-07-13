import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiFetchClimbLocations, apiCreatePlannedClimb } from "../lib/api";
import type { ClimbLocations } from "../types/climb";
import type { BuddySummary } from "../types/buddy";

const SHARE_KEY = "buddyhub:lastShare";

type ShareChoice = { share_all: boolean; buddy_ids: string[] };

function loadShareChoice(): ShareChoice {
  try {
    const raw = localStorage.getItem(SHARE_KEY);
    if (raw) return JSON.parse(raw) as ShareChoice;
  } catch {
    /* ignore */
  }
  return { share_all: true, buddy_ids: [] };
}

function saveShareChoice(choice: ShareChoice) {
  try {
    localStorage.setItem(SHARE_KEY, JSON.stringify(choice));
  } catch {
    /* ignore */
  }
}

function localDateInputValue(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function plannedTimestamp(date: string, time: string) {
  const localTime = time || "23:59:59.999";
  return new Date(`${date}T${localTime}`).toISOString();
}

/**
 * Create a planned climb: pick a gym (from the climb-locations tree), a required
 * date and optional time, then choose which buddy groups can see it. The last
 * visibility choice is remembered per-device via localStorage.
 */
export function PlanClimbDialog({
  open,
  onOpenChange,
  groups,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: BuddySummary[];
  onCreated?: () => void;
}) {
  const [locations, setLocations] = useState<ClimbLocations>([]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [gym, setGym] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [shareAll, setShareAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCountry(""); setCity(""); setGym(""); setDate(""); setTime("");
    const choice = loadShareChoice();
    setShareAll(choice.share_all);
    // Keep only groups that still exist.
    const live = new Set(groups.map((g) => g.id));
    setSelected(choice.buddy_ids.filter((id) => live.has(id)));
    (async () => {
      try {
        setLocations(await apiFetchClimbLocations());
      } catch {
        setLocations([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const countries = locations.flatMap((c) => Object.keys(c));
  const citiesObj = locations.find((c) => country in c)?.[country] ?? {};
  const cities = Object.keys(citiesObj);
  const gyms = citiesObj[city] ?? [];

  function toggleGroup(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function submit() {
    if (!gym) return setError("Pick a gym.");
    if (!date) return setError("Pick a date.");
    if (!shareAll && selected.length === 0) return setError("Choose at least one group, or share with all.");
    setBusy(true);
    setError(null);
    try {
      await apiCreatePlannedClimb({
        gym,
        city: city || undefined,
        country: country || undefined,
        planned_date: date,
        planned_time: time || undefined,
        planned_timestamp: plannedTimestamp(date, time),
        share_all: shareAll,
        buddy_ids: shareAll ? [] : selected,
      });
      saveShareChoice({ share_all: shareAll, buddy_ids: selected });
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || "Could not save planned climb.");
    } finally {
      setBusy(false);
    }
  }

  const today = localDateInputValue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan a climb</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label>Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v); setCity(""); setGym(""); }}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Select value={city} onValueChange={(v) => { setCity(v); setGym(""); }} disabled={!country}>
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Gym</Label>
            <Select value={gym} onValueChange={setGym} disabled={!city}>
              <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
              <SelectContent>
                {gyms.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <Label htmlFor="plan-date">Date</Label>
              <Input id="plan-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1">
              <Label htmlFor="plan-time">Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="plan-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Who can see this?</Label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={shareAll} onChange={(e) => setShareAll(e.target.checked)} />
              All my buddy groups
            </label>
            {!shareAll && (
              <div className="space-y-1 pl-1">
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">You're not in any buddy groups yet.</p>
                ) : (
                  groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                      />
                      {g.name}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
