import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus, X } from "lucide-react";
import { apiSubmitNewGradeSystem } from "../lib/api";

type Step = "form" | "confirm" | "done";

const CLIMB_TYPES = ["Boulder", "Rope"];

interface FormState {
  gradeSystemName: string;
  climbType: string;
  grades: string[];
}

const empty: FormState = { gradeSystemName: "", climbType: "", grades: [""] };

export function NewGradeSystemDialog({
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
  const gradesScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottomRef = useRef(false);

  // After a grade row is added, scroll the list to the bottom and focus it.
  useEffect(() => {
    if (!scrollToBottomRef.current) return;
    scrollToBottomRef.current = false;
    const el = gradesScrollRef.current;
    if (!el) return;
    const inputs = el.querySelectorAll<HTMLInputElement>("input");
    const last = inputs[inputs.length - 1];
    last?.focus();
    el.scrollTop = el.scrollHeight;
  }, [form.grades.length]);

  function resetState() {
    setStep("form");
    setForm(empty);
    setError(null);
    setSubmitting(false);
  }

  useEffect(() => () => { if (resetTimer) window.clearTimeout(resetTimer); }, [resetTimer]);

  // Cancel any pending reset when the dialog is (re)opened so it can't wipe input.
  useEffect(() => {
    if (open && resetTimer) {
      window.clearTimeout(resetTimer);
      setResetTimer(null);
    }
  }, [open, resetTimer]);

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
    if (resetTimer) window.clearTimeout(resetTimer);
    const t = window.setTimeout(() => resetState(), 200);
    setResetTimer(t);
  }

  function setGrade(index: number, value: string) {
    setForm(prev => {
      const grades = [...prev.grades];
      grades[index] = value;
      return { ...prev, grades };
    });
  }

  function addGrade() {
    scrollToBottomRef.current = true;
    setForm(prev => ({ ...prev, grades: [...prev.grades, ""] }));
  }

  function removeGrade(index: number) {
    setForm(prev => {
      const grades = prev.grades.filter((_, i) => i !== index);
      return { ...prev, grades: grades.length ? grades : [""] };
    });
  }

  function cleanedGrades() {
    return form.grades.map(g => g.trim()).filter(Boolean);
  }

  function handleNext() {
    if (!form.gradeSystemName.trim()) return setError("Grade system name is required.");
    if (!form.climbType) return setError("Climb type is required.");
    if (cleanedGrades().length === 0) return setError("Add at least one grade.");
    setError(null);
    setStep("confirm");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiSubmitNewGradeSystem({
        gradeSystemName: form.gradeSystemName.trim(),
        climbType: form.climbType,
        grades: cleanedGrades(),
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
              <DialogTitle>Add a New Grade System</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label htmlFor="new-grade-system-name">Grade System Name</Label>
                <Input
                  id="new-grade-system-name"
                  placeholder="e.g. French, V-Scale"
                  value={form.gradeSystemName}
                  onChange={e => setForm(prev => ({ ...prev, gradeSystemName: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-grade-system-climb-type">Climb Type</Label>
                <Select
                  value={form.climbType}
                  onValueChange={v => setForm(prev => ({ ...prev, climbType: v }))}
                >
                  <SelectTrigger id="new-grade-system-climb-type">
                    <SelectValue placeholder="Select a climb type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIMB_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Grades</Label>
                <p className="text-xs text-muted-foreground">One grade per row, ordered from easiest to hardest.</p>
                <div ref={gradesScrollRef} className="space-y-2 mt-1 max-h-[35vh] overflow-y-auto pr-1">
                  {form.grades.map((grade, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                      <Input
                        placeholder={`Grade ${i + 1}`}
                        value={grade}
                        onChange={e => setGrade(i, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeGrade(i)}
                        disabled={form.grades.length === 1}
                        aria-label={`Remove grade ${i + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={addGrade}>
                  <Plus className="h-4 w-4" />
                  Add grade
                </Button>
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
              <DialogTitle>Confirm New Grade System</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 mt-2 text-sm">
              <Row label="Name" value={form.gradeSystemName} />
              <Row label="Climb Type" value={form.climbType} />
              <Row label="Grades" value={cleanedGrades().join(", ")} />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              New grade systems aren't added immediately. They'll be reviewed and approved before appearing in the app.
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
              Thanks! Your grade system has been submitted for review. It'll appear in the app once approved.
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
