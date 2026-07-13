"use client";

import { useEffect, useRef } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import dynamic from "next/dynamic";
import { CodeSmell } from "@/lib/types";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Map our language values to Monaco language identifiers
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  go: "go",
  csharp: "csharp",
  ruby: "ruby",
  rust: "rust",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  cpp: "cpp",
};

interface CodeInputProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
  smells?: CodeSmell[];
}

type MonacoEditor = { getModel: () => object | null };
type MonacoInstance = { MarkerSeverity: { Info: number; Warning: number; Error: number }; editor: { setModelMarkers: (model: object, owner: string, markers: object[]) => void } };

export function CodeInput({
  code,
  language,
  onChange,
  onLanguageChange,
  disabled,
  smells,
}: CodeInputProps) {
  const monacoRef = useRef<MonacoInstance | null>(null);
  const editorRef = useRef<MonacoEditor | null>(null);

  const handleEditorDidMount = (editor: MonacoEditor, monaco: MonacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    if (smells && smells.length > 0) {
      const markers = smells.map((smell) => {
        let severity = monaco.MarkerSeverity.Info;
        if (smell.severity === "warning") severity = monaco.MarkerSeverity.Warning;
        if (smell.severity === "error") severity = monaco.MarkerSeverity.Error;
        return {
          startLineNumber: smell.location.line,
          startColumn: smell.location.column || 1,
          endLineNumber: smell.location.end_line || smell.location.line,
          endColumn: 1000,
          message: `${smell.message}\n\nSolution: ${smell.recommendation}`,
          severity,
        };
      });
      monaco.editor.setModelMarkers(model, "code-smell", markers);
    } else {
      monaco.editor.setModelMarkers(model, "code-smell", []);
    }
  }, [smells, code]);

  const monacoLang = MONACO_LANGUAGE_MAP[language] || "plaintext";

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Programming Language
        </label>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={disabled}
            className="appearance-none w-full px-4 py-3 bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 cursor-pointer transition-all hover:bg-slate-800/50"
          >
            <option value="" className="bg-slate-900 text-slate-400">Select a language...</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value} className="bg-slate-900">
                {lang.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Source Code
        </label>
        <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-slate-700 shadow-2xl transition-all hover:border-indigo-500/50">
          <Editor
            height="100%"
            language={monacoLang}
            value={code}
            theme="vs-dark"
            onChange={(value) => onChange(value || "")}
            onMount={handleEditorDidMount}
            options={{
              readOnly: disabled,
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              padding: { top: 20 },
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              scrollBeyondLastLine: false,
              roundedSelection: false,
              formatOnPaste: true,
            }}
            loading={
              <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              </div>
            }
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-slate-500 font-medium bg-slate-900/50 px-2 py-1 rounded-md border border-slate-800">
            {code.length} characters
          </p>
          <p className="text-xs text-slate-500">Monaco Editor</p>
        </div>
      </div>
    </div>
  );
}
