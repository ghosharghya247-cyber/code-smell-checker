"use client";

import { CodeSmell } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { getSeverityBgColor } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";

interface SmellCardProps {
  smell: CodeSmell;
}

export function SmellCard({ smell }: SmellCardProps) {
  const getIcon = () => {
    switch (smell.severity) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const severityBorder = 
    smell.severity === "error" ? "border-rose-500/30" : 
    smell.severity === "warning" ? "border-amber-500/30" : "border-blue-500/30";

  return (
    <div className={`p-5 rounded-xl border backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 ${getSeverityBgColor(smell.severity).replace('bg-', 'bg-opacity-10 bg-')} ${severityBorder}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {getIcon()}
            <h3 className="font-bold text-white text-lg">{smell.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
            <SeverityBadge severity={smell.severity} />
          </div>
          <p className="text-slate-300 mb-4 font-medium">{smell.message}</p>
          
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/50 mb-4 shadow-inner">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-400/90">How to fix:</p>
            </div>
            <p className="text-sm text-slate-300/90 leading-relaxed">{smell.recommendation}</p>
          </div>

          <p className="text-xs font-semibold text-slate-400 bg-slate-800/80 inline-flex border border-slate-700/50 px-3 py-1.5 rounded-md">
            Line {smell.location.line}
            {smell.location.end_line ? ` - ${smell.location.end_line}` : ""}, Column{" "}
            {smell.location.column || 1}
          </p>
        </div>
        <div className="text-right flex flex-col items-center justify-center bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 min-w-[90px] shadow-sm">
          <div className="text-3xl font-black text-white">{smell.score}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Impact</div>
        </div>
      </div>
    </div>
  );
}
