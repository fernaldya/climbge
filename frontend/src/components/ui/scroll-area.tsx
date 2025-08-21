import * as React from "react";
import { cn } from "./utils";

export interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

export function ScrollArea({ className, children }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "relative overflow-y-auto overflow-x-hidden rounded-md border bg-background",
        className
      )}
    >
      {children}
    </div>
  );
}
