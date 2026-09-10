"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, description, actions, icon }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-ink-900 leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-ink-600 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function StatCard({ label, value, hint, icon, trend, variant = "default" }: StatCardProps) {
  const variantClasses: Record<string, string> = {
    default: "bg-brand-50 text-brand-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-600",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-ink-900 leading-none">{value}</p>
          {hint && <p className="text-xs text-ink-500">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", variantClasses[variant])}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <p
          className={cn(
            "text-xs font-medium",
            trend.positive ? "text-emerald-600" : "text-red-600"
          )}
        >
          {trend.value}
        </p>
      )}
    </motion.div>
  );
}
