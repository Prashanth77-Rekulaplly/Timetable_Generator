"use client";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  const classes: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-ink-100 text-ink-700 border-ink-200",
  };

  const dotColors: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-ink-400",
  };

  return (
    <span
      className={cn(
        "badge border",
        classes[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string | boolean | undefined;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
}

export function StatusBadge({ status, trueLabel, falseLabel, className }: StatusBadgeProps) {
  if (typeof status === "boolean") {
    return (
      <Badge variant={status ? "success" : "danger"} className={className} dot>
        {status ? (trueLabel ?? "Active") : (falseLabel ?? "Inactive")}
      </Badge>
    );
  }
  const val = String(status ?? "").toLowerCase();
  const isActive = val === "active" || val === "true" || val === "finalized";
  return (
    <Badge
      variant={isActive ? "success" : "warning"}
      className={className}
      dot
    >
      {status ?? "Unknown"}
    </Badge>
  );
}
