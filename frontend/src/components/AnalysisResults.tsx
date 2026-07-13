"use client";

import { AnalysisResult } from "@/lib/types";
import { SmellCard } from "./SmellCard";
import { getScoreColor, getScoreBgColor } from "@/lib/utils";
import { Activity, AlertOctagon, AlertTriangle, CheckCircle2, Code2 } from "lucide-react";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const { summary, smells } = result;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`p-8 rounded-2xl glass-panel shadow-lg ${getScoreBgColor(summary.overall_score).replace('bg-', 'bg-opacity-20 bg-')}`}>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-400" />
          Analysis Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Overall Score</p>
            <p className={`text-5xl font-black ${getScoreColor(summary.overall_score)}`}>
              {summary.overall_score}
              <span className="text-lg text-slate-600 font-medium">/100</span>
            </p>
          </div>
          
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-sm flex flex-col justify-between">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total Issues</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{summary.total_smells}</span>
              <span className="text-slate-400 font-medium">smells found</span>
            </div>
          </div>
          
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Severity Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                <span className="flex items-center gap-1.5 text-sm font-medium text-rose-400">
                  <AlertOctagon className="w-4 h-4" /> Errors
                </span>
                <span className="font-bold text-rose-400">{summary.by_severity.error}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> Warnings
                </span>
                <span className="font-bold text-amber-400">{summary.by_severity.warning}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-sm flex flex-col justify-between">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Language</p>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Code2 className="w-6 h-6" />
              </div>
              <p className="text-xl font-bold text-white capitalize">{summary.language}</p>
            </div>
          </div>
        </div>
      </div>

      {smells.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold text-white">Detected Issues</h3>
            <span className="bg-slate-800/80 text-slate-300 py-1 px-3 rounded-full text-sm font-medium border border-slate-700/50">
              {smells.length} results
            </span>
          </div>
          <div className="space-y-4">
            {smells.map((smell, index) => (
              <div key={smell.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                <SmellCard smell={smell} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md shadow-lg shadow-emerald-500/5">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-400 mb-2">No code smells detected!</h3>
          <p className="text-emerald-500/80 text-lg font-medium">Your code looks exceptionally clean and follows best practices.</p>
        </div>
      )}
    </div>
  );
}
