"use client";

import { useState, useCallback } from "react";
import { getHistory, deleteAnalysis, clearAllHistory } from "@/lib/api";
import { AnalysisHistory } from "@/lib/types";

interface UseHistoryState {
  analyses: AnalysisHistory[];
  total: number;
  loading: boolean;
  error: string | null;
}

export const useHistory = () => {
  const [state, setState] = useState<UseHistoryState>({
    analyses: [],
    total: 0,
    loading: false,
    error: null,
  });

  const fetchHistory = useCallback(async (limit = 20, offset = 0) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getHistory(limit, offset);
      setState((prev) => ({
        ...prev,
        analyses: data.analyses,
        total: data.total,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch history";
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteAnalysis(id);
      setState((prev) => ({
        ...prev,
        analyses: prev.analyses.filter((a) => a.id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete";
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await clearAllHistory();
      setState({ analyses: [], total: 0, loading: false, error: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clear history";
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  return { ...state, fetchHistory, remove, clear };
};
