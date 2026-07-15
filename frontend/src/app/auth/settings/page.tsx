"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, changePassword, deleteAccount } = useAuth();

  // ── Change Password state ──────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // ── Delete Account state ───────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(newPassword);
      setPwSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleteLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto mt-10 mb-16 px-4 animate-in fade-in zoom-in duration-500">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-xl">
          <Settings className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Account Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* ── Change Password ──────────────────────────────────────────────── */}
      <section className="glass-panel rounded-2xl p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/15 rounded-lg">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Change Password</h2>
          </div>

          {pwError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 mb-5 text-sm font-medium">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-5 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Password updated successfully!
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="settings-new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pwLoading}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 transition-all placeholder-slate-600 disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="settings-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={pwLoading}
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 transition-all placeholder-slate-600 disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                id="settings-change-password-submit"
                disabled={pwLoading}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {pwLoading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="glass-panel rounded-2xl p-8 relative overflow-hidden border border-rose-500/20">
        <div className="absolute top-0 left-0 -ml-16 -mt-16 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/15 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-rose-400">Danger Zone</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Once you delete your account, there is no going back. All your data will be permanently removed.
          </p>

          <button
            id="settings-delete-account-open"
            onClick={() => { setDeleteError(""); setDeleteConfirm(""); setShowDeleteModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 font-semibold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        </div>
      </section>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-2xl p-8 relative overflow-hidden shadow-2xl border border-rose-500/20">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-500/15 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Delete Account</h2>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                This action is <span className="text-rose-400 font-semibold">permanent and irreversible</span>.
                All your analyses, history, and account data will be deleted. Type{" "}
                <span className="font-mono font-bold text-rose-300">DELETE</span> to confirm.
              </p>

              {deleteError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 mb-4 text-sm">
                  {deleteError}
                </div>
              )}

              <input
                id="settings-delete-confirm-input"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full px-4 py-3 mb-5 bg-slate-900/50 border border-rose-500/30 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-200 transition-all placeholder-slate-600"
              />

              <div className="flex gap-3">
                <button
                  id="settings-delete-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-5 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-700 font-semibold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="settings-delete-confirm-submit"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleteLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-500 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteLoading ? "Deleting…" : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
