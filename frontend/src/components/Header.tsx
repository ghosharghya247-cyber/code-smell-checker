"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthButton } from "./AuthButton";
import { ActivitySquare, Settings } from "lucide-react";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-x-0 border-t-0">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 hover:scale-105 transition-transform">
            <ActivitySquare className="w-6 h-6 text-indigo-400" />
            CodeSmell
          </Link>
          <div className="flex gap-6">
            <Link href="/" className="text-slate-300 hover:text-white font-medium transition-colors">
              Analyzer
            </Link>
            {user && (
              <Link href="/history" className="text-slate-300 hover:text-white font-medium transition-colors">
                History
              </Link>
            )}
            {user && (
              <Link href="/auth/settings" className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm font-medium text-indigo-200 bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-800/50">{user.email}</span>}
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
