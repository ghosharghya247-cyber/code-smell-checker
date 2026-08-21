import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const DAILY_LIMIT = 10;

const SYSTEM_PROMPT = `You are an expert AI code reviewer integrated into a Code Smell Detector tool.
Your role:
- Explain detected code smells clearly and concisely
- Suggest concrete refactoring strategies with code examples
- Answer questions about code quality, design patterns, complexity, and best practices
- Generate improved/refactored versions of code when asked
- Explain maintainability scores and severity levels

Guidelines:
- Always reference the specific code and detected smells provided in context
- Provide complete, runnable code examples when suggesting refactors
- Be concise but thorough — prioritize actionable advice
- Use markdown with fenced code blocks for all code examples
- When explaining smells, cover: what it is, why it's problematic, how to fix it`;

interface Smell {
  type: string;
  severity: string;
  message: string;
  recommendation: string;
  location: { line: number };
}
interface Summary {
  overall_score?: number;
  total_smells?: number;
  by_severity?: { error?: number; warning?: number; info?: number };
}
interface ChatBody {
  message: string;
  code?: string;
  language?: string;
  smells?: Smell[];
  summary?: Summary;
  history?: { role: "user" | "assistant"; content: string }[];
}

function buildContext(code: string, language: string, smells: Smell[], summary?: Summary): string {
  const lines = code.split("\n");
  const truncated =
    lines.length > 200 ? lines.slice(0, 200).join("\n") + `\n... [${lines.length - 200} more lines]` : code;
  let ctx = `## Source Code (${language})\n\`\`\`${language}\n${truncated}\n\`\`\``;
  if (summary) {
    const s = summary.by_severity ?? {};
    ctx += `\n\n## Analysis Summary\n- Overall Score: ${summary.overall_score ?? "N/A"}/100\n- Total Smells: ${summary.total_smells ?? 0} (errors: ${s.error ?? 0}, warnings: ${s.warning ?? 0}, info: ${s.info ?? 0})`;
  }
  ctx +=
    smells.length > 0
      ? "\n\n## Detected Code Smells\n" +
        smells.map((s) => `- [${s.severity.toUpperCase()}] ${s.type} at line ${s.location.line}: ${s.message} — ${s.recommendation}`).join("\n")
      : "\n\n## Detected Code Smells\nNo smells detected.";
  return ctx;
}

function sseResponse(text: string, status = 200): Response {
  const body = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(`data: ${text}\n\ndata: [DONE]\n\n`));
      c.close();
    },
  });
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

async function* streamGroq(apiKey: string, context: string, message: string, history: { role: "user" | "assistant"; content: string }[]): AsyncGenerator<string> {
  const client = new Groq({ apiKey });
  const stream = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content } as Groq.Chat.ChatCompletionMessageParam)),
      { role: "user", content: message },
    ],
    stream: true,
    max_tokens: 2048,
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}

async function* streamGemini(apiKey: string, context: string, message: string, history: { role: "user" | "assistant"; content: string }[]): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: `${SYSTEM_PROMPT}\n\n${context}`,
  });
  const chat = model.startChat({
    history: history.slice(-20).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
  });
  const result = await chat.sendMessageStream(message);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return sseResponse("__AUTH_REQUIRED__");
  }

  // Decode JWT payload to get user id (no network call needed for identity)
  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    userId = payload.sub;
    if (!userId) throw new Error("no sub");
    // Check token expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return sseResponse("__AUTH_REQUIRED__");
    }
  } catch {
    return sseResponse("__AUTH_REQUIRED__");
  }

  // Create supabase client scoped to this user for RLS-protected queries
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // ── 2. Quota check ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: usageRow } = await supabase
    .from("chat_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  const currentCount: number = usageRow?.count ?? 0;

  if (currentCount >= DAILY_LIMIT) {
    return sseResponse(`__QUOTA_EXCEEDED__:${currentCount}:${DAILY_LIMIT}`);
  }

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ detail: "Invalid request body" }), { status: 400 });
  }

  const { message, code = "", language = "plaintext", smells = [], summary, history = [] } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ detail: "Message is required" }), { status: 400 });
  }

  // ── 4. Increment quota (upsert) ────────────────────────────────────────────
  await supabase.from("chat_usage").upsert(
    { user_id: userId, usage_date: today, count: currentCount + 1 },
    { onConflict: "user_id,usage_date" }
  );

  // ── 5. Check AI keys ───────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    return sseResponse("⚠️ No AI API key configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env.local.");
  }

  const context = buildContext(code, language, smells, summary);
  const encoder = new TextEncoder();

  const providers = [
    { name: "Groq", key: groqKey, stream: () => streamGroq(groqKey!, context, message, history) },
    { name: "Gemini", key: geminiKey, stream: () => streamGemini(geminiKey!, context, message, history) },
  ].filter((p) => !!p.key);

  // ── 6. Stream response ─────────────────────────────────────────────────────
  const readableStream = new ReadableStream({
    async start(controller) {
      // Send remaining quota info as first SSE comment so UI can update
      controller.enqueue(encoder.encode(`data: __QUOTA_UPDATE__:${currentCount + 1}:${DAILY_LIMIT}\n\n`));

      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        try {
          for await (const chunk of provider.stream()) {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        } catch (err) {
          const isLast = i === providers.length - 1;
          const msg = err instanceof Error ? err.message : String(err);
          if (!isLast) {
            controller.enqueue(encoder.encode(`data: ⚠️ ${provider.name} error (${msg}) — switching to ${providers[i + 1].name}...\n\n`));
            continue;
          }
          controller.enqueue(encoder.encode(`data: ⚠️ ${provider.name} error: ${msg}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
