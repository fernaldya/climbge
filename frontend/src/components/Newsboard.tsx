import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Newspaper } from "lucide-react";
import { apiNews } from "../lib/api";
import type { NewsPost } from "../types/news";

const AUTO_SHOW_KEY = "newsboard:lastAutoShown";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Controlled news dialog. Fetches the latest posts each time it opens. */
export function NewsboardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const data = await apiNews();
        if (!cancelled) setNews(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Newsboard</DialogTitle>
          <DialogDescription>Latest updates from the team.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-1">
          {loading ? (
            <div className="space-y-4 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Couldn't load the news. Please try again later.
            </p>
          ) : news.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No news yet.</p>
          ) : (
            <ul className="divide-y">
              {news.map((post, i) => (
                <li key={i} className="space-y-1 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{post.title}</h3>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDate(post.publish_date)}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/** Home-tab tile that opens the newsboard on demand. */
export function Newsboard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-start p-4 rounded-xl border border-red-200 bg-red-50 hover:opacity-90 transition w-full"
      >
        <div className="p-2 rounded-lg bg-white">
          <Newspaper className="h-5 w-5 text-red-500" />
        </div>
        <div className="mt-3 font-semibold">Newsboard</div>
        <div className="text-sm text-orange-700 text-left">Check our news here!</div>
      </button>

      <NewsboardDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Mounted once in the app shell. Auto-opens the newsboard at most once per
 * 7 rolling days (per device, via localStorage), independent of the tile.
 */
export function NewsboardAutoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = 0;
    try {
      last = Number(localStorage.getItem(AUTO_SHOW_KEY)) || 0;
    } catch {
      return; // localStorage unavailable (e.g. private mode) — skip auto-open
    }
    if (Date.now() - last >= WEEK_MS) {
      try {
        localStorage.setItem(AUTO_SHOW_KEY, String(Date.now()));
      } catch {
        /* ignore write failure */
      }
      setOpen(true);
    }
  }, []);

  return <NewsboardDialog open={open} onOpenChange={setOpen} />;
}
