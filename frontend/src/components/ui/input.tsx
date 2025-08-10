import { cn } from "./utils";
type Props = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
        "border-border focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  );
}
