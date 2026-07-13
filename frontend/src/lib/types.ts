export interface CodeSmell {
  id: string;
  type: string;
  severity: "info" | "warning" | "error";
  score: number;
  location: {
    line: number;
    column: number;
    end_line?: number;
  };
  message: string;
  recommendation: string;
  examples?: string[];
}

export interface AnalysisSummary {
  total_smells: number;
  by_severity: {
    info: number;
    warning: number;
    error: number;
  };
  overall_score: number;
  language: string;
  analyzed_at: string;
}

export interface AnalysisResult {
  analysis_id: string;
  smells: CodeSmell[];
  summary: AnalysisSummary;
}

export interface AnalysisHistory {
  id: string;
  source_name: string;
  language: string;
  total_smells: number;
  overall_score: number;
  created_at: string;
}

export interface HistoryResponse {
  analyses: AnalysisHistory[];
  total: number;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface SessionResponse {
  user: User | null;
  is_authenticated: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  detail: string;
}
