// src/tabs/HistoryDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, X, Zap } from "lucide-react";
import type { HistoricalClimb, SessionDetail, SessionRoute } from "../types/climb";
import { apiSessionDetail, ApiError } from "../lib/api";

// Only the metrics, so the summary handed over on tap can render the strip
// unchanged while the routes are still in flight.
type Metrics = Pick<SessionDetail, "sent" | "attempted" | "flashes" | "best" | "sentPct">;

export function HistoryDetailTab() {
  const { sessionId, gradeSystem } = useParams<{ sessionId: string; gradeSystem: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // HistoryPage hands the summary over on tap, so the header and metrics paint
  // instantly. A deep link or a fresh tab arrives without it.
  const summary = (location.state ?? null) as HistoricalClimb | null;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !gradeSystem) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await apiSessionDetail(sessionId, Number(gradeSystem));
        if (!cancelled) setDetail(data);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError && e.code === "NOT_FOUND"
            ? "That session isn't available."
            : e instanceof Error
              ? e.message
              : "Failed to load this session";
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, gradeSystem]);

  const day = detail?.climbDay ?? summary?.climbDay ?? "Session";
  const date = detail?.climbDate ?? summary?.climbDate ?? null;
  const gym = detail?.location ?? summary?.location ?? null;
  const systemLabel = summary?.gradeSystemLabel ?? null;
  const metrics: Metrics | null = detail ?? summary;

  const subtitle = [date ? formatDate(date) : null, gym, systemLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#2A1B00]">
      <div className="mx-auto w-full max-w-md">
        {/* Header bar */}
        <header className="flex items-center gap-2.5 border-b border-[#F5D7B3] px-6 pt-10 pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back to session history"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full
                       bg-[#FFF6ED] ring-1 ring-[#F5D7B3] transition hover:bg-[#FFEFDF]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E26E00]"
          >
            <ArrowLeft className="h-[15px] w-[15px]" />
          </button>

          <div className="min-w-0">
            <div className="text-[15.5px] font-semibold leading-tight">{day}</div>
            {subtitle && (
              <div className="truncate text-[11px] text-[#8A5A00]">{subtitle}</div>
            )}
          </div>
        </header>

        <div className="px-6 pt-4 pb-24">
          {err ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {err}
            </div>
          ) : (
            <>
              {metrics && <MetricStrip m={metrics} />}

              {detail?.notes && (
                <div className="mb-3.5 rounded-[10px] bg-[#FFF6ED] px-3 py-2.5 ring-1 ring-[#F5D7B3]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.07em]">
                    Notes
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-[#8A5A00]">
                    {detail.notes}
                  </p>
                </div>
              )}

              {loading && !detail ? (
                <>
                  <div className="mb-4 h-24 animate-pulse rounded-[10px] bg-[#FFF6ED]" />
                  <div className="h-64 animate-pulse rounded-[10px] bg-[#FFF6ED]" />
                </>
              ) : detail ? (
                <>
                  <GradeBreakdown routes={detail.routes} />
                  <SectionLabel>Every route · {detail.routes.length}</SectionLabel>
                  {detail.routes.length === 0 ? (
                    // The detail view filters out the unknown grade system, and
                    // a session can't reach the summary without routes — so an
                    // empty list only ever means this session used it.
                    <div className="rounded-[10px] bg-[#FFF6ED] p-4 text-xs text-[#8A5A00] ring-1 ring-[#F5D7B3]">
                      Unregistered grade system, cannot parse
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {detail.routes.map((r) => (
                        <RouteRow key={r.routeId} r={r} />
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A5A00]">
      {children}
    </p>
  );
}

function MetricStrip({ m }: { m: Metrics }) {
  const showFlashes = (m.flashes ?? 0) > 0;

  return (
    <div className="mb-3.5 grid grid-cols-3 gap-2">
      <div className="rounded-[10px] bg-[#FFF6ED] px-2 py-2.5 text-center ring-1 ring-[#F5D7B3]">
        <div className="relative inline-flex items-center text-sm font-bold tabular-nums text-[#E26E00]">
          {m.sent}
          <span className="mx-0.5 font-normal">/</span>
          <span className="relative font-normal">
            {m.attempted}
            {showFlashes && (
              <span className="absolute -top-2.5 -right-3.5 flex items-center gap-0.5 rounded-full bg-[#FCE8D6] px-1 py-px text-[9px] font-semibold text-[#E26E00]">
                {m.flashes}
                <Zap className="h-2.5 w-2.5" />
              </span>
            )}
          </span>
        </div>
        <div className="mt-px text-[9.5px] text-[#8A5A00]">Routes</div>
      </div>

      <div className="rounded-[10px] bg-[#FFF6ED] px-2 py-2.5 text-center ring-1 ring-[#F5D7B3]">
        <div className="text-sm font-bold text-[#E26E00]">{m.best ?? "—"}</div>
        <div className="mt-px text-[9.5px] text-[#8A5A00]">Best Grade</div>
      </div>

      <div className="rounded-[10px] bg-[#FFF6ED] px-2 py-2.5 text-center ring-1 ring-[#F5D7B3]">
        <div className="text-sm font-bold tabular-nums text-[#E26E00]">{m.sentPct}</div>
        <div className="mt-px text-[9.5px] text-[#8A5A00]">Send %</div>
      </div>
    </div>
  );
}

function GradeBreakdown({ routes }: { routes: SessionRoute[] }) {
  // Routes arrive hardest-first, so first-seen order is already the bar order.
  const grades = useMemo(() => {
    const order: string[] = [];
    const tally = new Map<string, { sent: number; total: number }>();

    for (const r of routes) {
      const entry = tally.get(r.gradeLabel);
      if (entry) {
        entry.total += 1;
        if (r.sent) entry.sent += 1;
      } else {
        order.push(r.gradeLabel);
        tally.set(r.gradeLabel, { sent: r.sent ? 1 : 0, total: 1 });
      }
    }

    return order.map((g) => ({ grade: g, ...tally.get(g)! }));
  }, [routes]);

  if (grades.length === 0) return null;

  return (
    <>
      <SectionLabel>By grade</SectionLabel>
      <div className="mb-4 flex flex-col gap-1.5">
        {grades.map(({ grade, sent, total }) => (
          <div key={grade} className="flex items-center gap-2 text-[11.5px]">
            <span className="min-w-[30px] font-semibold tabular-nums">{grade}</span>
            <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#F5D7B3]">
              <span
                className="block h-full rounded-full bg-[#E26E00]"
                style={{ width: `${total ? (sent / total) * 100 : 0}%` }}
              />
            </span>
            <span className="min-w-[26px] text-right tabular-nums text-[#8A5A00]">
              {sent}/{total}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function RouteRow({ r }: { r: SessionRoute }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-[#F5D7B3] py-2.5 text-[12.5px]">
      <span className="min-w-[34px] font-bold tabular-nums text-[#E26E00]">{r.gradeLabel}</span>

      {/* Reserve the icon's width either way, so grades and descriptions stay
          on a single column down the list. */}
      {r.flash ? (
        <Zap className="h-3 w-3 flex-none text-[#E26E00]" />
      ) : (
        <span className="h-3 w-3 flex-none" />
      )}

      <div className="min-w-0 flex-1">
        {r.description && (
          <div className="truncate text-[10.5px] text-[#8A5A00]">{r.description}</div>
        )}
      </div>

      <span className="whitespace-nowrap tabular-nums text-[11.5px] text-[#8A5A00]">
        {r.attempts} {r.attempts === 1 ? "att" : "atts"}
      </span>

      {r.sent ? (
        <Check className="h-[15px] w-[15px] flex-none text-[#2E7D32]" />
      ) : (
        <X className="h-[15px] w-[15px] flex-none text-[#C4713A] opacity-55" />
      )}
    </div>
  );
}

// DD MMM YYYY, matching how BuddiesPage and Newsboard format dates.
// The T00:00:00 keeps this local-time — a bare YYYY-MM-DD parses as UTC and
// renders as the previous day anywhere west of Greenwich.
function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
