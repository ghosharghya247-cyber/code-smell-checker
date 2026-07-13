"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function AuthButton() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 hover:text-rose-300 font-medium transition-all"
      >
        Logout
      </button>
    );
  }

  return (
    <div className="flex gap-3">
      <Link
        href="/auth/login"
        className="px-4 py-2 text-slate-300 border border-slate-700 hover:border-slate-500 rounded-lg hover:bg-slate-800 font-medium transition-all"
      >
        Login
      </Link>
      <Link
        href="/auth/signup"
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] font-medium transition-all"
      >
        Sign Up
      </Link>
    </div>
  );
}
