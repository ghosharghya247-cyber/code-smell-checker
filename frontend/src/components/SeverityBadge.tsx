"use client";

import { getSeverityColor } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: "info" | "warning" | "error";
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return (
    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(severity)}`}>
      {label}
    </span>
  );
}
