import { forwardRef } from "react";
import { cn } from "./utils";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
        "border-border focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  );
});
