import { cn } from "./utils";
import React from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Close on Escape + lock body scroll while open
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange?.(false);
    if (open) {
      document.addEventListener("keydown", onKey);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden"; // 🚫 block scroll
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prevOverflow;
      };
    }
    return;
  }, [open, onOpenChange]);

  return <>{open && children}</>;
}

export function DialogContent({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dim overlay under the content */}
      <div className="absolute inset-0 bg-black/40 z-0" aria-hidden="true" />
      {/* Centered content above overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            // solid backgrounds + readable text in both themes
            "w-full max-w-md rounded-2xl border p-6 shadow-xl",
            "bg-white text-black dark:bg-neutral-900 dark:text-neutral-100",
            className
          )}
          {...rest}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


// --- Simple context so DialogContent can close on overlay click ---
const DialogCloseCtx = React.createContext<(() => void) | null>(null);
export function DialogProvider({
  open,
  onOpenChange,
  children,
}: { open: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode }) {
  const close = React.useCallback(() => onOpenChange?.(false), [onOpenChange]);
  return <DialogCloseCtx.Provider value={close}>{children}</DialogCloseCtx.Provider>;
}

// Headers
export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="space-y-1" {...props} />;
}
export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className="text-lg font-semibold" {...props} />;
}
export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="text-sm text-muted-foreground" {...props} />;
}

// Footer
export function DialogFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)}>{children}</div>;
}
