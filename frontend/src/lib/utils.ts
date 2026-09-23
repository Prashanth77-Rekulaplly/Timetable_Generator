import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time: string | undefined): string {
  if (!time) return "-";
  return time.slice(0, 5);
}

export function dayName(day: number | undefined): string {
  if (day === undefined) return "-";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days[day] || "-";
}

export function dayShort(day: number | undefined): string {
  if (day === undefined) return "-";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days[day] || "-";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function getFacultyInitials(name: string | undefined): string {
  if (!name) return "—";
  // Strip titles like Prof., Dr., Mr., Mrs., Ms.
  const cleanName = name.replace(/^(Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.|Prof\s+\(Dr\.\))\s+/i, "").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 3).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.map((p) => p[0].toUpperCase()).join("");
}

