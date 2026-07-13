import axios, { AxiosInstance } from "axios";
import { AnalysisResult, HistoryResponse, AnalysisHistory } from "./types";
import { supabase } from "./supabase";

// Axios client for local Next.js API routes (code analysis)
const apiClient: AxiosInstance = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================== Code Analysis (local API route) ========================

export async function analyzeCode(
  code: string,
  language: string,
  sourceName?: string
): Promise<AnalysisResult> {
  const response = await apiClient.post<AnalysisResult>("/api/analyze", {
    code,
    language,
    source_name: sourceName,
  });
  return response.data;
}

// ======================== History (Supabase) ========================

export async function saveAnalysisToHistory(
  result: AnalysisResult,
  code: string,
  language: string,
  sourceName?: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase.from("analysis_history").insert({
    user_id: session.user.id,
    analysis_id: result.analysis_id,
    source_name: sourceName || null,
    source_code: code,
    language,
    total_smells: result.summary.total_smells,
    overall_score: result.summary.overall_score,
    smells: result.smells,
    summary: result.summary,
  });

  if (error) {
    const sanitize = (s: string) => String(s).replace(/[\r\n]/g, " ");
    console.error("Failed to save analysis:", sanitize(error.message));
    return;
  }

  // Keep only the 10 most recent analyses per user — delete the rest
  const { data: allRows } = await supabase
    .from("analysis_history")
    .select("id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (allRows && allRows.length > 10) {
    const idsToDelete = allRows.slice(10).map((r) => r.id);
    await supabase.from("analysis_history").delete().in("id", idsToDelete);
  }
}

export async function getHistory(limit = 20, offset = 0): Promise<HistoryResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { analyses: [], total: 0 };

  // Get total count
  const { count } = await supabase
    .from("analysis_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id);

  // Get paginated data
  const { data, error } = await supabase
    .from("analysis_history")
    .select("id, analysis_id, source_name, language, total_smells, overall_score, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const analyses: AnalysisHistory[] = (data || []).map((row) => ({
    id: row.id.toString(),
    source_name: row.source_name || `Analysis ${row.analysis_id?.slice(0, 8) || row.id}`,
    language: row.language,
    total_smells: row.total_smells,
    overall_score: row.overall_score,
    created_at: row.created_at,
  }));

  return { analyses, total: count || 0 };
}

export async function getAnalysisDetail(id: string): Promise<AnalysisResult> {
  const { data, error } = await supabase
    .from("analysis_history")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error("Analysis not found");
  }

  return {
    analysis_id: data.analysis_id,
    smells: data.smells || [],
    summary: data.summary || {
      total_smells: data.total_smells,
      by_severity: { info: 0, warning: 0, error: 0 },
      overall_score: data.overall_score,
      language: data.language,
      analyzed_at: data.created_at,
    },
  };
}

export async function deleteAnalysis(id: string): Promise<void> {
  const { error } = await supabase
    .from("analysis_history")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearAllHistory(): Promise<{ deleted_count: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { deleted_count: 0 };

  const { error, count } = await supabase
    .from("analysis_history")
    .delete({ count: "exact" })
    .eq("user_id", session.user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { deleted_count: count || 0 };
}

export default apiClient;
