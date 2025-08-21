import * as React from "react";

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return <div>{children}</div>;
}

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SelectTrigger({ children, ...props }: SelectTriggerProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-muted-foreground">{placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
      {children}
    </div>
  );
}

export function SelectItem({
  children,
  value,
  onClick,
}: {
  children: React.ReactNode;
  value: string;
  onClick?: (value: string) => void;
}) {
  return (
    <div
      role="option"
      onClick={() => onClick?.(value)}
      className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </div>
  );
}
