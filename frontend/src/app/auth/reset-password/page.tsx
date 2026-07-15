"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validLink, setValidLink] = useState(true);

  useEffect(() => {
    // Supabase appends tokens in the URL hash when using PKCE flow
    // or as query params in some setups — check both
    const accessToken = searchParams.get("access_token");
    const type = searchParams.get("type");
    if (type === "recovery" && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: searchParams.get("refresh_token") || "",
      });
    }
    // If no token at all in hash or params, the link might still be valid
    // via cookie/session already established — don't block
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!validLink) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="glass-panel rounded-2xl shadow-2xl p-10 text-center">
          <p className="text-rose-400 font-semibold">
            Invalid or expired reset link. Please request a new one.
          </p>
          <Link href="/auth/forgot-password" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 animate-in fade-in zoom-in duration-500">
        <div className="glass-panel rounded-2xl shadow-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-400 mb-4">Password Reset!</h1>
            <p className="text-slate-300">Redirecting you to login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 animate-in fade-in zoom-in duration-500">
      <div className="glass-panel rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <KeyRound className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white">Reset Password</h1>
          </div>
          <p className="text-center text-slate-400 text-sm mb-8">
            Choose a strong new password for your account.
          </p>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 mb-6 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              id="reset-submit"
              disabled={loading}
              className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Updating..." : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-16 text-center text-slate-400">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
