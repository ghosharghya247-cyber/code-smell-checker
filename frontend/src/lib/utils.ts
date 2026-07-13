import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSeverityColor(severity: "info" | "warning" | "error"): string {
  switch (severity) {
    case "error":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "info":
    default:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

export function getSeverityBgColor(severity: "info" | "warning" | "error"): string {
  switch (severity) {
    case "error":
      return "bg-rose-500";
    case "warning":
      return "bg-amber-500";
    case "info":
    default:
      return "bg-blue-500";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-rose-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-blue-400";
  return "text-emerald-400";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-rose-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-blue-500";
  return "bg-emerald-500";
}
