import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Play } from "lucide-react";

const MAX_HANG_DURATION_SECONDS = 120;

type HangDuration = number | "";

export function HangboardTimer() {
  const [open, setOpen] = useState(false);
  const [hangDuration, setHangDuration] = useState<HangDuration>(10);
  const [hangRemaining, setHangRemaining] = useState<number | null>(null);
  const hangIntervalRef = useRef<number | null>(null);

  const hangDisplayed = hangRemaining !== null ? Math.max(0, hangRemaining - 1) : hangDuration;
  const hangRunning = hangRemaining !== null && hangRemaining > 0;
  const hangDone = hangRemaining === 0;

  function startHang() {
    if (hangIntervalRef.current) clearInterval(hangIntervalRef.current);
    const duration = clampHangDuration(hangDuration);
    setHangDuration(duration);
    setHangRemaining(duration + 1);
    hangIntervalRef.current = window.setInterval(() => {
      setHangRemaining((r) => {
        if (r === null || r <= 0) {
          clearInterval(hangIntervalRef.current!);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function resetHang() {
    if (hangIntervalRef.current) clearInterval(hangIntervalRef.current);
    setHangRemaining(null);
  }

  useEffect(() => () => { if (hangIntervalRef.current) clearInterval(hangIntervalRef.current); }, []);

  function clampHangDuration(value: HangDuration) {
    if (value === "") return 1;

    return Math.min(MAX_HANG_DURATION_SECONDS, Math.max(1, Math.trunc(value)));
  }

  return (
    <>
      <button
        onClick={() => { resetHang(); setOpen(true); }}
        className="flex flex-col items-start p-4 rounded-xl border border-green-200 bg-green-50 hover:opacity-90 transition w-full"
      >
        <div className="p-2 rounded-lg bg-white">
          <Play className="h-5 w-5 text-green-500" />
        </div>
        <div className="mt-3 font-semibold">Hangboard Timer</div>
        <div className="text-sm text-green-700 text-left">Countdown for hangs</div>
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) resetHang(); setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hangboard Timer</DialogTitle>
            <DialogDescription>Set duration and press start to begin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="flex items-center justify-center">
              <span className={`text-8xl font-mono font-light tabular-nums transition-colors ${hangDone ? "text-green-500" : "text-orange-500"}`}>
                {hangDisplayed}
              </span>
            </div>

            {!hangRunning && !hangDone && (
              <div className="grid grid-cols-1 gap-2">
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  max={MAX_HANG_DURATION_SECONDS}
                  step={1}
                  value={hangDuration}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setHangDuration("");
                      return;
                    }

                    const value = Number(e.target.value);
                    if (Number.isFinite(value)) setHangDuration(clampHangDuration(value));
                  }}
                  onBlur={() => setHangDuration((value) => clampHangDuration(value))}
                />
              </div>
            )}

            {hangDone && (
              <p className="text-center text-sm font-medium text-green-600">Done! Let go!</p>
            )}
          </div>

          <DialogFooter>
            {hangRunning ? (
              <Button variant="secondary" onClick={resetHang}>Cancel</Button>
            ) : hangDone ? (
              <Button onClick={resetHang}>Reset</Button>
            ) : (
              <Button onClick={startHang}>
                <Play className="h-4 w-4 mr-1" /> Start
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
