import { useState } from 'react';
import { Dialog, DialogProvider, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const MAX = 4000;

export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX - text.length;

  async function handleSubmit() {
    if (!text.trim()) return setError('Please enter some feedback.');
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(text.trim());
      setText('');
      onOpenChange(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogProvider open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Feedback</DialogTitle>
          </DialogHeader>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            maxLength={MAX}
            className="w-full min-h-[160px] rounded-md border p-3 text-sm outline-none focus:ring-2"
            placeholder="Type anything (max 4000 chars)…"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{remaining} left</span>
            {error && <span className="text-red-600">{error}</span>}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogProvider>
    </Dialog>
  );
}
