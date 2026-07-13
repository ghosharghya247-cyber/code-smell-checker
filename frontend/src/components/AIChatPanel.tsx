"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, Send, Square, Trash2, Copy, Check, Sparkles, Lock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAIChat, ChatMessage } from "@/hooks/useAIChat";
import { useAuth } from "@/hooks/useAuth";
import { AnalysisResult } from "@/lib/types";

const SUGGESTED_PROMPTS = [
  "Explain this code",
  "Explain all detected smells",
  "How can I improve this?",
  "Reduce complexity",
  "Rewrite the longest function",
  "Generate unit tests",
  "Find security issues",
  "Suggest design patterns",
];

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group my-2">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "0.8rem" }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  // Special sentinel messages are never rendered as bubbles
  if (message.content === "__AUTH_REQUIRED__" || message.content === "__QUOTA_EXCEEDED__") return null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isUser ? "bg-indigo-600" : "bg-slate-700"}`}>
        {isUser ? <span className="text-xs font-bold text-white">U</span> : <Bot className="w-4 h-4 text-indigo-400" />}
      </div>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${isUser ? "bg-indigo-600/20 border border-indigo-500/30 text-slate-200" : "bg-slate-800/60 border border-slate-700/50 text-slate-200"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isBlock = !props.ref && match;
                return isBlock ? (
                  <CodeBlock language={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>
                ) : (
                  <code className="bg-slate-700/60 px-1 py-0.5 rounded text-indigo-300 text-xs font-mono">{children}</code>
                );
              },
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-slate-300">{children}</li>,
              h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mb-1">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500 pl-3 text-slate-400 italic my-2">{children}</blockquote>,
              table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
              th: ({ children }) => <th className="border border-slate-600 px-2 py-1 bg-slate-700 text-left font-semibold">{children}</th>,
              td: ({ children }) => <td className="border border-slate-700 px-2 py-1">{children}</td>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {isStreaming && <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />}
      </div>
    </div>
  );
}

interface AIChatPanelProps {
  analysisResult: AnalysisResult | null;
  code: string;
  language: string;
}

export function AIChatPanel({ analysisResult, code, language }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { messages, streaming, error, quota, sendMessage, stopGeneration, clearMessages } = useAIChat(
    analysisResult, code, language
  );

  const messagesLengthRef = useRef(0);

  useEffect(() => {
    // Only scroll when a new message is added, not on every streaming token update
    if (messages.length > messagesLengthRef.current) {
      messagesLengthRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || streaming || quota.exceeded) return;
    sendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, streaming, quota.exceeded, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    },
    [handleSend]
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const hasContext = !!code.trim();
  const isBlocked = quota.exceeded;
  const inputDisabled = streaming || !hasContext || isBlocked || !user;

  return (
    // Outer wrapper: fixed height, flex column — never grows
    <div className="glass-panel rounded-2xl flex flex-col overflow-hidden h-[600px] min-h-[500px]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-semibold text-white text-sm">AI Code Reviewer</span>
          {hasContext && user && (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{language}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Quota pill */}
          {user && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              !quota.loaded
                ? "bg-slate-800 text-slate-500 border border-slate-700"
                : isBlocked
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}>
              {quota.loaded ? `${quota.used}/${quota.limit} today` : "loading…"}
            </span>
          )}
          {messages.filter(m => m.content !== "__AUTH_REQUIRED__" && m.content !== "__QUOTA_EXCEEDED__").length > 0 && (
            <button onClick={clearMessages} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors" title="Clear conversation">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages — this is the only scrollable area, constrained by the fixed outer height */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {!user ? (
          // Auth wall
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-white font-semibold mb-1">Sign in to use AI Chat</p>
            <p className="text-slate-400 text-sm mb-6">Get 10 free AI code reviews per day. No credit card required.</p>
            <div className="flex gap-3">
              <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
                Log in
              </Link>
              <Link href="/auth/signup" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        ) : isBlocked ? (
          // Quota exceeded wall
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-white font-semibold mb-1">Daily limit reached</p>
            <p className="text-slate-400 text-sm">You&apos;ve used all {quota.limit} AI prompts for today. Your quota resets at midnight.</p>
          </div>
        ) : messages.length === 0 ? (
          // Empty state with suggested prompts
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Bot className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm mb-1">
              {hasContext ? "Ask me anything about your code or detected smells." : "Analyze some code first, then ask me about it."}
            </p>
            {hasContext && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex-shrink-0">
        {!user ? (
          <p className="text-center text-xs text-slate-500 py-1">Sign in to start chatting</p>
        ) : isBlocked ? (
          <p className="text-center text-xs text-rose-400 py-1">Quota reset at midnight</p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={inputDisabled}
              placeholder={hasContext ? "Ask about your code… (Enter to send)" : "Analyze code first…"}
              rows={1}
              className="flex-1 resize-none bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-40 transition-all"
            />
            {streaming ? (
              <button onClick={stopGeneration} className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 transition-colors flex-shrink-0" title="Stop">
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim() || inputDisabled} className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0" title="Send">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
