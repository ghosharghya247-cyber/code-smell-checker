"use client";

import { useState } from "react";
import { analyzeCode } from "@/lib/api";
import { AnalysisResult } from "@/lib/types";
import axios from "axios";

interface UseAnalysisState {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export const useAnalysis = () => {
  const [state, setState] = useState<UseAnalysisState>({
    result: null,
    loading: false,
    error: null,
  });

  const analyze = async (code: string, language: string, sourceName?: string) => {
    setState({ result: null, loading: true, error: null });
    try {
      const result = await analyzeCode(code, language, sourceName);
      setState({ result, loading: false, error: null });
      return result;
    } catch (err) {
      let errorMessage = "Analysis failed";

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setState({ result: null, loading: false, error: errorMessage });
      throw err;
    }
  };

  return { ...state, analyze };
};
