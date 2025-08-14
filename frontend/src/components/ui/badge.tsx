import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  variant = "default",
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors";

  const variants: Record<string, string> = {
    default: "bg-orange-500 text-white border-transparent hover:opacity-90",
    secondary: "bg-gray-100 text-gray-800 border-transparent",
    outline: "border border-gray-300 text-gray-800 bg-transparent",
    destructive: "bg-red-500 text-white border-transparent",
  };

  const sizes: Record<string, string> = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  return (
    <div
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
