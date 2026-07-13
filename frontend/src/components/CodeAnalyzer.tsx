"use client";

import { useState } from "react";
import { CodeInput } from "./CodeInput";
import { AnalysisResults } from "./AnalysisResults";
import { AIChatPanel } from "./AIChatPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { saveAnalysisToHistory } from "@/lib/api";
import { MAX_CODE_SIZE } from "@/lib/constants";
import { Sparkles, TerminalSquare } from "lucide-react";

export function CodeAnalyzer() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [sourceName, setSourceName] = useState("");
  const { result, loading, error, analyze } = useAnalysis();
  const { user } = useAuth();

  const handleAnalyze = async () => {
    if (!code.trim()) {
      alert("Please paste some code to analyze");
      return;
    }
    if (!language) {
      alert("Please select a programming language");
      return;
    }
    if (code.length > MAX_CODE_SIZE) {
      alert(`Code size exceeds the maximum limit of ${MAX_CODE_SIZE / 1024}KB`);
      return;
    }

    try {
      const analysisResult = await analyze(code, language, sourceName || undefined);
      if (user && analysisResult) {
        await saveAnalysisToHistory(analysisResult, code, language, sourceName || undefined);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Side-by-side: Analysis Engine (left) + AI Chat (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
        {/* Left — Analysis Engine */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col flex-1">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TerminalSquare className="w-6 h-6 text-indigo-400" />
              Analysis Engine
            </h2>

            <CodeInput
              code={code}
              language={language}
              onChange={setCode}
              onLanguageChange={setLanguage}
              disabled={loading}
              smells={result?.smells}
            />

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Source Name (Optional)
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                disabled={loading}
                placeholder="e.g., app.js, utils.py"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 text-slate-200 placeholder-slate-500 transition-all"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-8 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing Code...
                </span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                  Analyze Code
                </>
              )}
            </button>

            {user && (
              <p className="text-sm text-indigo-300/70 mt-4 text-center font-medium">
                ✓ Analysis will be automatically saved to your history
              </p>
            )}

            {error && (
              <div className="mt-6 p-4 border border-rose-500/30 bg-rose-500/10 rounded-xl text-rose-300">
                <p className="font-bold flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Analysis Error
                </p>
                <p className="text-sm mt-1 opacity-90">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — AI Chat Panel */}
        <div className="flex flex-col">
          <AIChatPanel analysisResult={result} code={code} language={language} />
        </div>
      </div>

      {/* Full-width results below */}
      {result && !loading && <AnalysisResults result={result} />}
    </div>
  );
}
