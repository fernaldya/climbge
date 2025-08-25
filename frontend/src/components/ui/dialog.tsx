// src/components/ui/dialog.tsx
"use client"

import React from "react"
import { cn } from "./utils"

// -- Context so content/overlay can close the dialog
const DialogCloseCtx = React.createContext<(() => void) | null>(null)

type DialogProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Close on Escape + lock body scroll while open
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange?.(false)
    const prevOverflow = document.body.style.overflow
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  const close = () => onOpenChange?.(false)

  return (
    <DialogCloseCtx.Provider value={close}>
      {children}
    </DialogCloseCtx.Provider>
  )
}

// Overlay + centered card content
export function DialogContent({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const close = React.useContext(DialogCloseCtx) ?? (() => {})

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dimmed, slightly blurred overlay */}
      <div
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={close}
      />

      {/* Centered content (mobile bottom-sheet friendly sizes) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            // Card
            "w-[min(92vw,28rem)] rounded-2xl border bg-white text-black p-6 shadow-2xl",
            // Simple scale/opacity transition
            "transition-all duration-200",
            className
          )}
          {...rest}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Headers / Title / Description
export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", props.className)} {...props} />
}
export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-2xl font-bold", props.className)} {...props} />
}
export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", props.className)} {...props} />
  )
}

// Footer
export function DialogFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)}>{children}</div>
}
