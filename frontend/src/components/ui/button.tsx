import { cn } from "./utils";
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"outline" };
export function Button({ className, variant="default", ...props }: BtnProps) {
  const base = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition focus:outline-none";
  const styles = variant === "outline"
    ? "border bg-transparent hover:bg-accent"
    : "bg-primary text-primary-foreground hover:opacity-90";
  return <button className={cn(base, styles, className)} {...props} />;
}
