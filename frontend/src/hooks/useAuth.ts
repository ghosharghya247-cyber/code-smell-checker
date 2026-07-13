"use client";

import { useAuthStore } from "@/lib/auth";

export const useAuth = () => {
  return useAuthStore();
};
