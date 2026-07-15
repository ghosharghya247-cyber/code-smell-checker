import { create } from "zustand";
import { User } from "./types";
import { supabase } from "./supabase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  changePassword: (newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

function mapSupabaseUser(supaUser: { id: string; email?: string; created_at: string }): User {
  return {
    id: supaUser.id,
    email: supaUser.email || "",
    created_at: supaUser.created_at,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const user = mapSupabaseUser(data.user);
      set({ user, isAuthenticated: true });
    }
  },

  signup: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
    // Don't set user here — Supabase requires email confirmation before login is valid
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  changePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  },

  sendPasswordReset: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc("delete_user");
    if (error) {
      throw new Error(error.message);
    }
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
