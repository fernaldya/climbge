// src/tabs/HistoryPage.tsx
import { useEffect, useState } from "react";
import { MapPin, Zap } from "lucide-react";
import type { HistoricalClimb } from "../types/climb";
import { Card, CardContent } from "../components/ui/card";
import { apiHistoricalClimb } from "../lib/api";

export function HistoryTab() {
  const [sessions, setSessions] = useState<HistoricalClimb[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await apiHistoricalClimb(); // returns HistoricalClimb[]
        setSessions(rows ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load sessions";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#2A1B00]">
      <div className="mx-auto w-full max-w-md px-6 pt-10 pb-24">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Session History</h1>
          <p className="mt-1 text-[15px] text-[#B07100]">Your climbing journey</p>
        </header>

        <Card className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Sessions</h2>
            </div>

            {err && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {err}
              </div>
            )}

            {loading ? (
              <ul className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="h-36 animate-pulse rounded-2xl bg-[#FFF6ED]" />
                ))}
              </ul>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl bg-[#FFF6ED] p-5 text-sm text-[#8A5A00] ring-1 ring-[#F5D7B3]">
                No sessions yet.
              </div>
            ) : (
              <ul className="space-y-5">
                {sessions.map((s, i) => (
                  <li key={String((s as any).id ?? i)}>
                    <SessionCard s={s} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SessionCard({ s }: { s: HistoricalClimb }) {
  // Read exactly what BE gives you (no transforms)
  const row = s as unknown as {
    id?: string;
    climbDay: string;
    gym?: string;
    sent: number ;
    attempted: number;
    best?: string | null;
    sentPct: string;
    flashes?: number | null;
  };

  const showFlashes = (row.flashes ?? 0) > 0;

  return (
    <div className="rounded-xl bg-[#FFF6ED] p-4 ring-1 ring-[#F5D7B3]">
      {/* Header */}
      <div className="mb-2 font-semibold text-base">{row.climbDay}</div>
      {row.gym && (
        <div className="mb-3 flex items-center gap-2 text-sm text-[#8A5A00]">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{row.gym}</span>
        </div>
      )}

      {/* Metrics (one box) */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Routes */}
        <div className="flex flex-col items-center">
          <div className="relative mb-1 flex items-center">
            <span className="text-xl font-bold text-[#E26E00]">{row.sent}</span>
            <span className="mx-1 text-lg font-semibold text-[#E26E00]">/</span>
            <span className="relative text-lg font-semibold text-[#E26E00] whitespace-nowrap">
              {row.attempted}
              {showFlashes && (
                <span className="absolute -top-3 -right-3 flex items-center gap-0.5 rounded-full bg-[#FCE8D6] px-1.5 py-0.5 text-[10px] font-semibold text-[#E26E00]">
                  {row.flashes}
                  <Zap className="h-3 w-3" />
                </span>
              )}
            </span>
          </div>
          <div className="text-xs text-[#8A5A00]">Routes</div>
        </div>

        {/* Best */}
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xl font-bold text-[#E26E00]">{row.best ?? "—"}</div>
          <div className="text-xs text-[#8A5A00]">Best</div>
        </div>

        {/* Send */}
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xl font-bold text-[#E26E00] whitespace-nowrap">
            {row.sentPct}
          </div>
          <div className="text-xs text-[#8A5A00]">Send</div>
        </div>
      </div>
    </div>
  );
}
