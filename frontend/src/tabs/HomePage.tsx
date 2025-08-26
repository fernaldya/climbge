// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { TrendingUp, Trophy, RotateCcw, BicepsFlexed, Calendar, MapPin, Timer } from "lucide-react";
import { apiLastClimb, apiWeeklySummary } from "../lib/api";
import type { WeeklyClimbSummary, LastClimb } from "../types/climb";


export function HomeTab() {
  const [summary, setSummary] = useState<WeeklyClimbSummary | null>(null);
  const [lastClimb, setLastClimb] = useState<LastClimb | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, l] = await Promise.allSettled([
        apiWeeklySummary(),
        apiLastClimb(),
      ]);
      if (s.status === "fulfilled") setSummary(s.value);
      if (l.status === "fulfilled") setLastClimb(l.value);
      setLoading(false);
    })();
  }, []);


  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <Card className="bg-[rgba(236,130,55,255)] text-white border-none">
        <CardContent className="p-6">
          <div className="text-l font-semibold pt-2">
            Hello there climber!
          </div>
          <div className="mt-2 text-s opacity-90">
            Ready for your next session?
          </div>
        </CardContent>
      </Card>

      {/* Last Climb Stats Overview */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          {/* Title row */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-orange-500">
              <BicepsFlexed className="h-6 w-6" />
            </span>
            <div className="flex items-center justify-between flex-1">
              <h2 className="text-xl font-semibold">Last Climb</h2>

              <div className="flex flex-col items-end">
                {/* Location row */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {loading ? (
                    <Skeleton className="h-3 w-24" />
                  ) : (
                    lastClimb?.location ?? "-"
                  )}
                </div>

                {/* Date row */}
                <div className="text-[10px] text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-2 w-16" />
                  ) : (
                    lastClimb?.climbDate ?? "-"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3 stat tiles */}
          <div className="mt-8 grid grid-cols-3 text-center">

            <div className="flex flex-col items-center px-2">
              <Trophy className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-12" /> : (lastClimb?.highestGrade ?? '-')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Highest Grade
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <TrendingUp className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-10" /> : lastClimb?.totalSent ?? '-'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Routes Sent
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <RotateCcw className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-12" /> : (lastClimb?.totalAttempted ?? '-')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Routes Attempted
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Stats Overview */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <span className="text-orange-500">
              <BicepsFlexed className="h-5 w-5 mt-4" />
            </span>
            <h2 className="text-xl font-semibold mt-4">Weekly Stats</h2>
          </div>

          {/* 3 stat tiles */}
          <div className="mt-8 grid grid-cols-3 text-center">

            <div className="flex flex-col items-center px-2">
              <Calendar className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-12" /> : (summary?.totalSession ?? '-')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Climbing Sessions
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <TrendingUp className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-10" /> : summary?.totalSent ?? '-'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Routes Sent
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <RotateCcw className="h-7 w-7 text-orange-500" />
              <div className="mt-2 text-2xl font-semibold text-[rgba(236,130,55,255)]">
                {loading ? <Skeleton className="h-7 w-12" /> : (summary?.totalAttempted ?? '-')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground leading-tight text-[rgba(220,130,55,255)]">
                Routes Attempted
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OTW feature */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button className="flex flex-col items-start p-4 rounded-xl border border-green-200 bg-green-50 hover:opacity-90 transition">
          <div className="p-2 rounded-lg bg-white">
            <Timer className="h-5 w-5 text-green-500" />
          </div>
          <div className="mt-3 font-semibold">Timer</div>
          <div className="text-sm text-orange-700 text-left">Hangboard timer</div>
        </button>
      </div>

      {/*/!* Feature grid - dummy buttons *!/*/}
      {/*<div className="mt-6 grid grid-cols-2 gap-4">*/}
      {/*  /!* Project Planning *!/*/}
      {/*  <button className="flex flex-col items-start p-4 rounded-xl border border-blue-200 bg-blue-50 hover:opacity-90 transition">*/}
      {/*    <div className="p-2 rounded-lg bg-white">*/}
      {/*      <Mountain className="h-5 w-5 text-blue-500" />*/}
      {/*    </div>*/}
      {/*    <div className="mt-3 font-semibold">Project Planning</div>*/}
      {/*    <div className="text-sm text-orange-700 text-left">Plan your climbing projects</div>*/}
      {/*  </button>*/}

      {/*  /!* Conditioning *!/*/}
      {/*  <button className="flex flex-col items-start p-4 rounded-xl border border-green-200 bg-green-50 hover:opacity-90 transition">*/}
      {/*    <div className="p-2 rounded-lg bg-white">*/}
      {/*      <Dumbbell className="h-5 w-5 text-green-500" />*/}
      {/*    </div>*/}
      {/*    <div className="mt-3 font-semibold">Conditioning</div>*/}
      {/*    <div className="text-sm text-orange-700 text-left">Strength &amp; fitness training</div>*/}
      {/*  </button>*/}

      {/*  /!* Beta Learning *!/*/}
      {/*  <button className="flex flex-col items-start p-4 rounded-xl border border-purple-200 bg-purple-50 hover:opacity-90 transition">*/}
      {/*    <div className="p-2 rounded-lg bg-white">*/}
      {/*      <BookOpen className="h-5 w-5 text-purple-500" />*/}
      {/*    </div>*/}
      {/*    <div className="mt-3 font-semibold">Beta Learning</div>*/}
      {/*    <div className="text-sm text-orange-700 text-left">Study techniques &amp; moves</div>*/}
      {/*  </button>*/}

      {/*  /!* Community Hub *!/*/}
      {/*  <button className="flex flex-col items-start p-4 rounded-xl border border-orange-200 bg-orange-50 hover:opacity-90 transition">*/}
      {/*    <div className="p-2 rounded-lg bg-white">*/}
      {/*      <Users className="h-5 w-5 text-orange-500" />*/}
      {/*    </div>*/}
      {/*    <div className="mt-3 font-semibold">Community Hub</div>*/}
      {/*    <div className="text-sm text-orange-700 text-left">Connect with climbers</div>*/}
      {/*  </button>*/}
      {/*</div>*/}

    </div>
  );
}
