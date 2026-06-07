import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Mail } from "lucide-react";
import { apiListBuddyInvites, apiAcceptInvite, apiDeclineInvite } from "../lib/api";
import type { BuddyInvite } from "../types/buddy";

/**
 * Shows pending buddy-group invites addressed to the current user, with
 * Accept / Decline actions. Calls `onChanged` after an accept so the parent
 * can refresh its group list.
 */
export function InviteBanner({ onChanged }: { onChanged?: () => void }) {
  const [invites, setInvites] = useState<BuddyInvite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setInvites(await apiListBuddyInvites());
    } catch {
      setInvites([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, accept: boolean) {
    setBusyId(id);
    try {
      if (accept) await apiAcceptInvite(id);
      else await apiDeclineInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      if (accept) onChanged?.();
    } catch {
      /* leave the invite in place so the user can retry */
    } finally {
      setBusyId(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <Card className="rounded-2xl border-orange-200 bg-orange-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-orange-600 font-semibold">
          <Mail className="h-5 w-5" />
          Buddy invites
        </div>
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">{inv.invited_by_name || inv.invited_by_username}</span>
              {" invited you to "}
              <span className="font-medium">{inv.group_name}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={busyId === inv.id}
                onClick={() => act(inv.id, false)}
              >
                Decline
              </Button>
              <Button
                className="h-8 px-3"
                disabled={busyId === inv.id}
                onClick={() => act(inv.id, true)}
              >
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
