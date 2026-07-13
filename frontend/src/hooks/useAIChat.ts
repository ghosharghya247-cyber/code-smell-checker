"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AnalysisResult } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QuotaState {
  used: number;
  limit: number;
  exceeded: boolean;
  loaded: boolean;
}

const DAILY_LIMIT = 10;

export function useAIChat(analysisResult: AnalysisResult | null, code: string, language: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState>({ used: 0, limit: DAILY_LIMIT, exceeded: false, loaded: false });
  const abortRef = useRef<AbortController | null>(null);

  // Fetch today's quota from Supabase on mount so the count survives page reloads
  useEffect(() => {
    async function loadQuota() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("chat_usage")
        .select("count")
        .eq("user_id", session.user.id)
        .eq("usage_date", today)
        .single();

      const used = data?.count ?? 0;
      setQuota({ used, limit: DAILY_LIMIT, exceeded: used >= DAILY_LIMIT, loaded: true });
    }
    loadQuota();
  }, []);
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || streaming) return;

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setStreaming(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            message: userMessage,
            code,
            language,
            smells: analysisResult?.smells ?? [],
            summary: analysisResult?.summary ?? null,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok || !res.body) throw new Error("Failed to connect to AI service");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);

            if (data === "[DONE]") break;

            // Auth required signal
            if (data === "__AUTH_REQUIRED__") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: "__AUTH_REQUIRED__" };
                return updated;
              });
              return;
            }

            // Quota exceeded signal
            if (data.startsWith("__QUOTA_EXCEEDED__")) {
              const [, used, limit] = data.split(":");
              setQuota({ used: Number(used), limit: Number(limit), exceeded: true, loaded: true });
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: "__QUOTA_EXCEEDED__" };
                return updated;
              });
              return;
            }

            // Quota update signal (sent at start of each response)
            if (data.startsWith("__QUOTA_UPDATE__")) {
              const [, used, limit] = data.split(":");
              setQuota({ used: Number(used), limit: Number(limit), exceeded: false, loaded: true });
              continue;
            }

            // Normal content
            if (data) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + data,
                };
                return updated;
              });
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
          return updated;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [streaming, messages, code, language, analysisResult]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, streaming, error, quota, sendMessage, stopGeneration, clearMessages };
}
