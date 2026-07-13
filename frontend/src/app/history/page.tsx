"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { History, Trash2, ArrowRight } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { analyses, total, loading, error, fetchHistory, remove, clear } = useHistory();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      fetchHistory();
    }
  }, [user, isLoading, router, fetchHistory]);

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete all analyses? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await clear();
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <History className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Analysis History</h1>
            <p className="text-slate-400 mt-1 font-medium">View your past code analyses</p>
          </div>
        </div>
        {total > 0 && (
          <button
            onClick={handleClearAll}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50 font-bold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        </div>
      ) : analyses.length > 0 ? (
        <div className="space-y-4">
          {analyses.map((analysis, index) => (
            <div
              key={analysis.id}
              className="glass-panel p-5 rounded-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-indigo-500/30 group animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {analysis.source_name || `Analysis ${analysis.id.slice(0, 8)}`}
                  </h3>
                  <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 capitalize">{analysis.language}</span>
                    <span className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50">{analysis.total_smells} smells</span>
                    <span className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50">Score: {analysis.overall_score}</span>
                    <span className="text-slate-500">{formatDate(analysis.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/?id=${analysis.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all"
                  >
                    View <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => remove(analysis.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center glass-panel border-dashed border-2 border-slate-700 rounded-2xl">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <History className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-xl text-white font-bold mb-2">No analyses yet</p>
          <p className="text-slate-400 mb-6">
            Analyze some code to see your history here
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
          >
            Start Analyzing
          </Link>
        </div>
      )}

      {total > analyses.length && (
        <div className="flex justify-center pt-6">
          <button
            onClick={() => fetchHistory(20, analyses.length)}
            className="px-6 py-3 bg-slate-800/80 text-white border border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-xl font-bold transition-all"
          >
            Load More Analyses
          </button>
        </div>
      )}
    </div>
  );
}
