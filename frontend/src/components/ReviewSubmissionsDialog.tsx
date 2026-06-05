import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { apiSubmitApprovalDecision } from "../lib/api";
import type { ApprovalQueue } from "../types/climb";

type ItemType = "grade" | "location";

export function ReviewSubmissionsDialog({
  open,
  onOpenChange,
  queue,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  queue: ApprovalQueue | null;
  onRefresh: () => Promise<void> | void;
}) {
  // Key of the currently expanded item, e.g. "grade:3" / "location:7", or null.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grades = queue?.grade_queue ?? [];
  const locations = queue?.climb_queue ?? [];
  const isEmpty = grades.length === 0 && locations.length === 0;

  function toggle(key: string) {
    setError(null);
    setExpanded(prev => (prev === key ? null : key));
  }

  async function decide(itemType: ItemType, itemId: number, action: "approve" | "reject") {
    const key = `${itemType}:${itemId}`;
    setBusyKey(key);
    setError(null);
    try {
      const res = await apiSubmitApprovalDecision([{ itemType, itemId, action }]);
      const item = res?.results?.[0];
      if (item && !item.ok) {
        setError(item.error || "Failed to apply decision.");
      } else {
        setExpanded(null);
        await onRefresh();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to apply decision.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submissions</DialogTitle>
        </DialogHeader>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {isEmpty && (
          <p className="text-sm text-muted-foreground mt-2">Nothing to review right now.</p>
        )}

        {grades.length > 0 && (
          <section className="mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Grade Systems ({grades.length})
            </h3>
            <div className="space-y-2">
              {grades.map(g => {
                const key = `grade:${g.grade_id}`;
                const isOpen = expanded === key;
                const busy = busyKey === key;
                return (
                  <div key={key} className="rounded-lg border">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                      onClick={() => toggle(key)}
                    >
                      <span className="font-medium">{g.grade_system}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3 border-t pt-3">
                        <Detail label="Climb Type" value={g.climb_type} />
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Grades (easiest → hardest)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {g.grades.map((grade, i) => (
                              <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs">{grade}</span>
                            ))}
                          </div>
                        </div>
                        <DecisionButtons
                          busy={busy}
                          onApprove={() => decide("grade", g.grade_id, "approve")}
                          onReject={() => decide("grade", g.grade_id, "reject")}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {locations.length > 0 && (
          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Gym Locations ({locations.length})
            </h3>
            <div className="space-y-2">
              {locations.map(l => {
                const key = `location:${l.id}`;
                const isOpen = expanded === key;
                const busy = busyKey === key;
                return (
                  <div key={key} className="rounded-lg border">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                      onClick={() => toggle(key)}
                    >
                      <span className="font-medium">{l.gym_name}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3 border-t pt-3">
                        {l.gym_chain && <Detail label="Chain" value={l.gym_chain} />}
                        <Detail label="Location" value={l.location} />
                        <Detail label="Country" value={l.country} />
                        <DecisionButtons
                          busy={busy}
                          onApprove={() => decide("location", l.id, "approve")}
                          onReject={() => decide("location", l.id, "reject")}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DecisionButtons({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" className="flex-1 gap-1" onClick={onApprove} disabled={busy}>
        <Check className="h-4 w-4" /> Approve
      </Button>
      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onReject} disabled={busy}>
        <X className="h-4 w-4" /> Reject
      </Button>
    </div>
  );
}
