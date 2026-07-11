import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Crown, UserMinus, LogOut, Pencil, Check, X } from "lucide-react";
import {
  apiGetBuddy, apiRenameBuddy, apiLeaveBuddy, apiRemoveBuddyMember, apiInviteBuddy,
} from "../lib/api";
import type { BuddyDetail } from "../types/buddy";

/**
 * Group detail: member list plus owner controls (rename, invite by username,
 * remove member) and a leave action for everyone. `onChanged` fires whenever
 * the group's membership or name changes so the parent list can refresh.
 */
export function BuddyGroupDialog({
  buddyId,
  open,
  onOpenChange,
  onChanged,
}: {
  buddyId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const [detail, setDetail] = useState<BuddyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!buddyId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await apiGetBuddy(buddyId);
      setDetail(d);
      setNameDraft(d.name);
    } catch (e: any) {
      setError(e?.message || "Could not load group.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && buddyId) {
      setEditingName(false);
      setInviteName("");
      setInviteMsg(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, buddyId]);

  const isOwner = detail?.your_role === "owner";

  async function saveName() {
    if (!buddyId || !nameDraft.trim()) return;
    setBusy(true);
    try {
      await apiRenameBuddy(buddyId, nameDraft.trim());
      setEditingName(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message || "Could not rename group.");
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!buddyId || !inviteName.trim()) return;
    setBusy(true);
    setInviteMsg(null);
    try {
      await apiInviteBuddy(buddyId, inviteName.trim());
      setInviteMsg(`Invited ${inviteName.trim()}.`);
      setInviteName("");
    } catch (e: any) {
      setInviteMsg(e?.message || "Could not send invite.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    if (!buddyId) return;
    if (!window.confirm("Remove this member from the group?")) return;
    setBusy(true);
    try {
      await apiRemoveBuddyMember(buddyId, userId);
      await load();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message || "Could not remove member.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!buddyId) return;
    if (!window.confirm("Leave this group?")) return;
    setBusy(true);
    try {
      await apiLeaveBuddy(buddyId);
      onOpenChange(false);
      onChanged?.();
    } catch (e: any) {
      setError(e?.message || "Could not leave group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={100}
                  className="h-8"
                />
                <button
                  className="p-1 text-green-600 hover:opacity-80 disabled:opacity-50"
                  onClick={saveName}
                  disabled={busy}
                  aria-label="Save name"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => { setEditingName(false); setNameDraft(detail?.name ?? ""); }}
                  aria-label="Cancel rename"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{detail?.name ?? "Buddy group"}</span>
                {isOwner && (
                  <button
                    className="p-1 text-gray-500 hover:text-orange-500"
                    onClick={() => setEditingName(true)}
                    aria-label="Rename group"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {detail.members.length} member{detail.members.length === 1 ? "" : "s"}
              </p>
              <ul className="space-y-1">
                {detail.members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      {m.role === "owner" && <Crown className="h-4 w-4 text-orange-500" />}
                      <span className="font-medium">{m.name || m.username}</span>
                      <span className="text-xs text-muted-foreground">@{m.username}</span>
                      {m.role === "owner" && <Badge variant="secondary">owner</Badge>}
                    </span>
                    {isOwner && m.role !== "owner" && (
                      <button
                        className="p-1 text-red-500 hover:text-red-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => removeMember(m.user_id)}
                        title="Remove member"
                        aria-label="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {isOwner && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Invite by username</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="username"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
                    />
                    <Button onClick={invite} disabled={busy || !inviteName.trim()}>Invite</Button>
                  </div>
                  {inviteMsg && <p className="text-xs text-muted-foreground">{inviteMsg}</p>}
                </div>
              </>
            )}

            <Separator />
            <Button
              className="w-full bg-red-500 text-white hover:opacity-90 disabled:opacity-50"
              onClick={leave}
              disabled={busy}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave group
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
