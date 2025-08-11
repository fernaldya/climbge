import { cn } from "./utils";
import React from "react";

type DialogProps = { open: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode };
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange?.(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  return <>{open && children}</>;
}

export function DialogContent({
  className, children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn("w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) { return <div className="space-y-1" {...props} />; }
export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className="text-lg font-semibold" {...props} />; }
export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) { return <p className="text-sm text-muted-foreground" {...props} />; }
