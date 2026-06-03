import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiSubmitNewLocation } from "../lib/api";

type Step = "form" | "confirm" | "done";

interface FormState {
  gymName: string;
  gymChain: string;
  gymLocation: string;
  country: string;
}

const empty: FormState = { gymName: "", gymChain: "", gymLocation: "", country: "" };

export function NewLocationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTimer, setResetTimer] = useState<number | null>(null);

  function resetState() {
    setStep("form");
    setForm(empty);
    setError(null);
    setSubmitting(false);
  }

  useEffect(() => () => { if (resetTimer) window.clearTimeout(resetTimer); }, [resetTimer]);

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
    const t = window.setTimeout(() => resetState(), 200);
    setResetTimer(t);
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function handleNext() {
    if (!form.gymName.trim()) return setError("Gym name is required.");
    if (!form.gymLocation.trim()) return setError("Location is required.");
    if (!form.country.trim()) return setError("Country is required.");
    setError(null);
    setStep("confirm");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiSubmitNewLocation({
        gymName: form.gymName.trim(),
        gymChain: form.gymChain.trim() || undefined,
        gymLocation: form.gymLocation.trim(),
        country: form.country.trim(),
      });
      setStep("done");
    } catch (e: any) {
      setError(e?.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Add a New Gym Location</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label htmlFor="new-location-gym-name">Gym Name</Label>
                <Input
                  id="new-location-gym-name"
                  placeholder="e.g. Indoclimb Kemang"
                  value={form.gymName}
                  onChange={set("gymName")}
                />
                <p className="text-xs text-muted-foreground">If part of a chain, include the location in the name (e.g. Indoclimb Kemang, not just Indoclimb).</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-location-gym-chain">
                  Gym Chain{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="new-location-gym-chain"
                  placeholder="e.g. Indoclimb"
                  value={form.gymChain}
                  onChange={set("gymChain")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-location-gym-location">Location</Label>
                <Input
                  id="new-location-gym-location"
                  placeholder="e.g. Kemang"
                  value={form.gymLocation}
                  onChange={set("gymLocation")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-location-country">Country</Label>
                <Input
                  id="new-location-country"
                  placeholder="e.g. Indonesia"
                  value={form.country}
                  onChange={set("country")}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleNext}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm New Location</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 mt-2 text-sm">
              <Row label="Gym Name" value={form.gymName} />
              {form.gymChain && <Row label="Gym Chain" value={form.gymChain} />}
              <Row label="Location" value={form.gymLocation} />
              <Row label="Country" value={form.country} />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              New locations aren't added immediately. They'll be reviewed and approved before appearing in the app.
            </p>

            {error && <p className="text-xs text-destructive mt-2">{error}</p>}

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setStep("form")} disabled={submitting}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Request Submitted</DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks! Your gym location has been submitted for review. It'll appear in the app once approved.
            </p>
            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
