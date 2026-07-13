"use client";

import { useEffect } from "react";
import { CodeAnalyzer } from "@/components/CodeAnalyzer";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { initSession } = useAuth();

  useEffect(() => {
    initSession();
  }, [initSession]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 tracking-tight">
          Code Smell Detector
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Analyze your source code to detect code smells, technical debt, and get actionable recommendations powered by AST analysis.
        </p>
      </div>
      <CodeAnalyzer />
    </div>
  );
}
