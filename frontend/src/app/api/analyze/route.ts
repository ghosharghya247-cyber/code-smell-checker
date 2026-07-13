import { NextRequest, NextResponse } from "next/server";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface CodeSmell {
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
  examples: string[];
}

interface AnalyzeRequest {
  code: string;
  language: string;
  source_name?: string;
}

// ===================== DETECTION RULES =====================

function createSmell(
  type: string,
  severity: "info" | "warning" | "error",
  message: string,
  recommendation: string,
  line: number,
  score: number,
  column = 0,
  endLine?: number,
  examples: string[] = []
): CodeSmell {
  return {
    id: generateId(),
    type,
    severity,
    score,
    location: { line, column, end_line: endLine },
    message,
    recommendation,
    examples,
  };
}

// ---------- JavaScript / Java / Go / C# Rules ----------

function extractFunctionsJS(code: string): { lineno: number; endLineno: number }[] {
  const functions: { lineno: number; endLineno: number }[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/function\s+\w+|const\s+\w+\s*=.*=>|async\s+function/.test(line)) {
      // Find function end by tracking braces
      let braceCount = 0;
      let started = false;
      let endLine = i;

      for (let j = i; j < lines.length; j++) {
        const openBraces = (lines[j].match(/{/g) || []).length;
        const closeBraces = (lines[j].match(/}/g) || []).length;
        braceCount += openBraces - closeBraces;

        if (openBraces > 0) started = true;

        if (started && braceCount <= 0) {
          endLine = j;
          break;
        }
        endLine = j;
      }

      functions.push({
        lineno: i + 1,
        endLineno: endLine + 1,
      });
    }
  }

  return functions;
}

function extractVariablesJS(code: string): { name: string; lineno: number }[] {
  const variables: { name: string; lineno: number }[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].matchAll(/(?:const|let|var)\s+(\w+)/g);
    for (const match of matches) {
      variables.push({ name: match[1], lineno: i + 1 });
    }
  }

  return variables;
}

function checkLongFunctionJS(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functions = extractFunctionsJS(code);

  for (const func of functions) {
    const lineCount = func.endLineno - func.lineno;
    if (lineCount > 100) {
      smells.push(
        createSmell(
          "long_function",
          "error",
          `Function is ${lineCount} lines long`,
          "Break down this function into smaller, more focused functions",
          func.lineno,
          80
        )
      );
    } else if (lineCount > 50) {
      smells.push(
        createSmell(
          "long_function",
          "warning",
          `Function is ${lineCount} lines long`,
          "Consider breaking down this function",
          func.lineno,
          60
        )
      );
    }
  }

  return smells;
}

function checkDeepNesting(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  let currentNesting = 0;
  let peakNesting = 0;
  let peakLine = 1;
  const reported = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    // Skip comment lines
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    const opening = (lines[i].match(/{/g) || []).length;
    const closing = (lines[i].match(/}/g) || []).length;
    currentNesting += opening - closing;
    if (currentNesting < 0) currentNesting = 0;

    if (currentNesting > peakNesting) {
      peakNesting = currentNesting;
      peakLine = i + 1;
    }

    // When nesting drops back to a lower level, report the peak if it exceeded threshold
    if (closing > 0 && peakNesting > 4 && !reported.has(peakLine)) {
      reported.add(peakLine);
      smells.push(
        createSmell(
          "deep_nesting",
          "warning",
          `Deep nesting detected (level ${peakNesting})`,
          "Refactor to reduce nesting depth using early returns, guard clauses, or extracted functions",
          peakLine,
          65
        )
      );
      peakNesting = currentNesting;
    }
  }

  return smells;
}

function checkMagicNumbers(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments and import/require lines
    if (
      line.startsWith("//") || line.startsWith("/*") ||
      line.startsWith("*") || line.startsWith("#") ||
      /^\s*import\b/.test(line) || /^\s*require\b/.test(line)
    ) continue;

    // Skip constant declarations (the definition site is fine)
    if (/^\s*(?:const|let|var|final|val)\s+[A-Z_]+\s*=/.test(line)) continue;

    // Find numbers that are not part of a named constant assignment
    const numbers = line.match(/\b(\d+)\b/g);
    if (!numbers) continue;

    for (const num of numbers) {
      const n = parseInt(num, 10);
      // Allow 0, 1, 2 and common safe values
      if (n <= 2) continue;
      // Skip if this number is the RHS of a const/let/var declaration
      if (new RegExp(`(?:const|let|var|final|val)\\s+\\w+\\s*=\\s*${num}\\b`).test(line)) continue;

      smells.push(
        createSmell(
          "magic_number",
          "info",
          `Magic number '${num}' found in code`,
          "Replace magic numbers with named constants for better readability",
          i + 1,
          40
        )
      );
      break; // one smell per line is enough
    }
  }

  return smells;
}

function checkUnusedVariables(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const variables = extractVariablesJS(code);
  // Skip common loop/callback variable names that are intentionally unused
  const skipNames = new Set(["_", "e", "err", "error", "i", "j", "k", "index"]);

  for (const variable of variables) {
    if (skipNames.has(variable.name)) continue;
    const regex = new RegExp(`\\b${variable.name}\\b`, "g");
    const count = (code.match(regex) || []).length;
    // count === 1 means only the declaration, never read
    if (count === 1) {
      smells.push(
        createSmell(
          "unused_variable",
          "info",
          `Variable '${variable.name}' is declared but never used`,
          "Remove unused variables to clean up the code",
          variable.lineno,
          30
        )
      );
    }
  }

  return smells;
}

function checkConsoleLog(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (/\bconsole\.log\s*\(/.test(lines[i])) {
      smells.push(
        createSmell(
          "console_log_leftover",
          "warning",
          "Found 'console.log' statement",
          "Remove debugging statements like console.log before production",
          i + 1,
          45
        )
      );
    }
  }
  return smells;
}

function checkEvalJS(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (/\beval\s*\(/.test(lines[i])) {
      smells.push(
        createSmell(
          "eval_usage",
          "error",
          "Usage of 'eval' function detected",
          "Avoid using eval() as it can lead to severe security vulnerabilities and performance issues",
          i + 1,
          95
        )
      );
    }
  }
  return smells;
}

// ---------- Python-specific Rules (regex-based since we can't use AST in JS) ----------

function extractFunctionsPython(code: string): { name: string; lineno: number; endLineno: number; paramCount: number }[] {
  const functions: { name: string; lineno: number; endLineno: number; paramCount: number }[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
    if (match) {
      const name = match[1];
      const params = match[2].trim();
      const paramCount = params ? params.split(",").filter((p) => p.trim() && p.trim() !== "self" && p.trim() !== "cls").length : 0;

      // Find function end by indentation
      const indent = lines[i].match(/^(\s*)/)?.[1].length || 0;
      let endLine = i;

      for (let j = i + 1; j < lines.length; j++) {
        const currentLine = lines[j];
        if (currentLine.trim() === "") continue;
        const currentIndent = currentLine.match(/^(\s*)/)?.[1].length || 0;
        if (currentIndent <= indent && currentLine.trim() !== "") {
          endLine = j - 1;
          break;
        }
        endLine = j;
      }

      functions.push({
        name,
        lineno: i + 1,
        endLineno: endLine + 1,
        paramCount,
      });
    }
  }

  return functions;
}

function checkLongFunctionPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functions = extractFunctionsPython(code);

  for (const func of functions) {
    const lineCount = func.endLineno - func.lineno;
    if (lineCount > 100) {
      smells.push(
        createSmell(
          "long_function",
          "error",
          `Function '${func.name}' is ${lineCount} lines long`,
          "Consider breaking down this function into smaller, more focused functions",
          func.lineno,
          80
        )
      );
    } else if (lineCount > 50) {
      smells.push(
        createSmell(
          "long_function",
          "warning",
          `Function '${func.name}' is ${lineCount} lines long`,
          "Consider breaking down this function",
          func.lineno,
          60
        )
      );
    }
  }

  return smells;
}

function checkTooManyParametersPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functions = extractFunctionsPython(code);

  for (const func of functions) {
    if (func.paramCount > 5) {
      smells.push(
        createSmell(
          "too_many_parameters",
          "warning",
          `Function '${func.name}' has ${func.paramCount} parameters`,
          "Consider grouping parameters into a single object or reducing the number of parameters",
          func.lineno,
          65
        )
      );
    }
  }

  return smells;
}

function checkWildcardImportPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*from\s+(\S+)\s+import\s+\*/);
    if (match) {
      smells.push(
        createSmell(
          "wildcard_import",
          "warning",
          `Wildcard import from module '${match[1]}'`,
          "Explicitly import the items you need instead of using '*'",
          i + 1,
          55
        )
      );
    }
  }

  return smells;
}

function checkBareExceptPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*except\s*:/.test(lines[i])) {
      smells.push(
        createSmell(
          "bare_except",
          "error",
          "Bare 'except:' clause catches all exceptions",
          "Specify the exception type(s) you want to catch",
          i + 1,
          75
        )
      );
    }
  }

  return smells;
}

function checkMutableDefaultPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const defMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
    if (defMatch) {
      // Check if any default argument uses mutable types: [], {}, set()
      if (/=\s*\[\s*\]|=\s*\{\s*\}|=\s*set\s*\(\s*\)/.test(line)) {
        smells.push(
          createSmell(
            "mutable_default",
            "error",
            `Function '${defMatch[1]}' has a mutable default argument`,
            "Use immutable types (None, tuple) as defaults instead of mutable types (list, dict, set)",
            i + 1,
            80
          )
        );
      }
    }
  }

  return smells;
}

function checkDeepNestingPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  // Track nesting per function scope by resetting at each top-level def
  let maxLevel = 0;
  let maxLine = 1;
  const reported = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    const level = Math.floor(indent / 4);

    // Reset tracking at each new top-level function definition
    if (level === 0 && /^def\s/.test(line.trim())) {
      maxLevel = 0;
      maxLine = i + 1;
    }

    if (level > maxLevel) {
      maxLevel = level;
      maxLine = i + 1;
    }

    // Report when we return to a shallower level after a deep block
    if (level < maxLevel && maxLevel > 4 && !reported.has(maxLine)) {
      reported.add(maxLine);
      smells.push(
        createSmell(
          "deep_nesting",
          "warning",
          `Deep nesting detected (level ${maxLevel})`,
          "Refactor code to reduce nesting depth using early returns or guard clauses",
          maxLine,
          65
        )
      );
      maxLevel = level;
    }
  }

  return smells;
}

function checkEvalExecPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\b(?:eval|exec)\s*\(/);
    if (match) {
      smells.push(
        createSmell(
          "dangerous_function",
          "error",
          `Dangerous function '${match[0].slice(0, -1).trim()}' used`,
          "Avoid eval() or exec() as they are major security risks. Find safer alternatives.",
          i + 1,
          95
        )
      );
    }
  }
  return smells;
}

function checkIsLiteralPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (/\bis\s+(?:\d+|'[^']*'|"[^"]*")/.test(lines[i])) {
      smells.push(
        createSmell(
          "is_literal",
          "warning",
          "Used 'is' operator with a literal",
          "Use '==' to compare values. 'is' checks for object identity and may behave unpredictably with literals.",
          i + 1,
          60
        )
      );
    }
  }
  return smells;
}

// ---------- Ruby Rules ----------

function checkLongMethodRuby(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  let methodStart = -1;
  let methodName = "";

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*def\s+(\w+)/);
    if (match) {
      methodStart = i;
      methodName = match[1];
    }
    if (methodStart >= 0 && /^\s*end\b/.test(lines[i])) {
      const len = i - methodStart;
      if (len > 100) {
        smells.push(createSmell("long_function", "error", `Method '${methodName}' is ${len} lines long`, "Break into smaller methods", methodStart + 1, 80));
      } else if (len > 50) {
        smells.push(createSmell("long_function", "warning", `Method '${methodName}' is ${len} lines long`, "Consider breaking down this method", methodStart + 1, 60));
      }
      methodStart = -1;
    }
  }
  return smells;
}

function checkRubyEval(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\beval\s*\(/.test(line)) {
      smells.push(createSmell("eval_usage", "error", "Usage of 'eval' detected", "Avoid eval() — it is a security risk", i + 1, 95));
    }
  });
  return smells;
}

function analyzeRuby(code: string): CodeSmell[] {
  return [...checkLongMethodRuby(code), ...checkRubyEval(code), ...checkDeepNesting(code), ...checkLargeClass(code), ...checkMessageChains(code), ...checkDuplicateCode(code), ...checkCommentsAsDeodorant(code)];
}

// ---------- Rust Rules ----------

function checkRustUnwrap(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\.unwrap\s*\(/.test(line)) {
      smells.push(createSmell("unwrap_usage", "warning", "Use of .unwrap() can panic at runtime", "Use pattern matching or .unwrap_or / .expect() with a meaningful message", i + 1, 60));
    }
  });
  return smells;
}

function checkRustClone(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\.clone\s*\(/.test(line)) {
      smells.push(createSmell("excessive_clone", "info", "Unnecessary .clone() may hurt performance", "Consider borrowing instead of cloning where possible", i + 1, 35));
    }
  });
  return smells;
}

function analyzeRust(code: string): CodeSmell[] {
  return [...checkLongFunctionJS(code), ...checkRustUnwrap(code), ...checkRustClone(code), ...checkDeepNesting(code), ...checkLongParameterListJS(code), ...checkDuplicateCode(code), ...checkMessageChains(code)];
}

// ---------- PHP Rules ----------

function checkPHPGlobals(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\bglobal\s+\$/.test(line)) {
      smells.push(createSmell("global_variable", "warning", "Use of global variable", "Avoid global state; pass dependencies explicitly", i + 1, 65));
    }
  });
  return smells;
}

function checkPHPEval(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\beval\s*\(/.test(line)) {
      smells.push(createSmell("eval_usage", "error", "Usage of eval() detected", "eval() is a major security risk in PHP", i + 1, 95));
    }
  });
  return smells;
}

function analyzePHP(code: string): CodeSmell[] {
  return [...checkLongFunctionJS(code), ...checkDeepNesting(code), ...checkPHPGlobals(code), ...checkPHPEval(code), ...checkLargeClass(code), ...checkLongParameterListJS(code), ...checkLargeSwitchStatements(code), ...checkDuplicateCode(code), ...checkMessageChains(code), ...checkCommentsAsDeodorant(code)];
}

// ---------- Swift / Kotlin Rules ----------

function checkForceUnwrapSwift(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    // Skip comments and string literals
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    // Match postfix ! used for force-unwrap: identifier! or )! but not != or !!
    if (/[\w)\]]\.?!(?![!=])/.test(trimmed)) {
      smells.push(createSmell("force_unwrap", "warning", "Force unwrap (!) can crash at runtime", "Use optional binding (if let / guard let) instead", i + 1, 65));
    }
  });
  return smells;
}

function analyzeSwift(code: string): CodeSmell[] {
  return [...checkLongFunctionJS(code), ...checkDeepNesting(code), ...checkForceUnwrapSwift(code), ...checkLargeClass(code), ...checkLongParameterListJS(code), ...checkLargeSwitchStatements(code), ...checkMessageChains(code), ...checkDuplicateCode(code), ...checkPrimitiveObsession(code)];
}

function checkKotlinForceNotNull(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/!!/.test(line)) {
      smells.push(createSmell("force_not_null", "warning", "Non-null assertion (!!) can throw NullPointerException", "Use safe calls (?.) or Elvis operator (?:) instead", i + 1, 65));
    }
  });
  return smells;
}

function analyzeKotlin(code: string): CodeSmell[] {
  return [...checkLongFunctionJS(code), ...checkDeepNesting(code), ...checkKotlinForceNotNull(code), ...checkLargeClass(code), ...checkLongParameterListJS(code), ...checkLargeSwitchStatements(code), ...checkMessageChains(code), ...checkDuplicateCode(code), ...checkPrimitiveObsession(code)];
}

// ---------- C++ Rules ----------

function checkCppRawPointers(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/\bnew\b/.test(line) && !/unique_ptr|shared_ptr|make_unique|make_shared/.test(line)) {
      smells.push(createSmell("raw_pointer", "warning", "Raw 'new' without smart pointer", "Prefer std::unique_ptr or std::shared_ptr to avoid memory leaks", i + 1, 70));
    }
  });
  return smells;
}

function analyzeCpp(code: string): CodeSmell[] {
  return [...checkLongFunctionJS(code), ...checkDeepNesting(code), ...checkCppRawPointers(code), ...checkMagicNumbers(code), ...checkLargeClass(code), ...checkLongParameterListJS(code), ...checkLargeSwitchStatements(code), ...checkMessageChains(code), ...checkDuplicateCode(code), ...checkPrimitiveObsession(code), ...checkCommentsAsDeodorant(code)];
}

// ===================== NEW SMELL DETECTORS =====================

// --- Large Class (all brace-delimited languages) ---
function checkLargeClass(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\bclass\s+(\w+)/);
    if (!match) continue;
    let braceCount = 0, started = false, end = i;
    for (let j = i; j < lines.length; j++) {
      braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
      if ((lines[j].match(/{/g) || []).length > 0) started = true;
      if (started && braceCount <= 0) { end = j; break; }
      end = j;
    }
    const len = end - i;
    if (len > 300) {
      smells.push(createSmell("large_class", "error", `Class '${match[1]}' is ${len} lines long`, "Split into smaller, focused classes following Single Responsibility Principle", i + 1, 80));
    } else if (len > 150) {
      smells.push(createSmell("large_class", "warning", `Class '${match[1]}' is ${len} lines long`, "Consider splitting this class into smaller, more focused classes", i + 1, 60));
    }
  }
  return smells;
}

// --- Large Class (Python) ---
function checkLargeClassPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^class\s+(\w+)/);
    if (!match) continue;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") { end = j; continue; }
      const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
      if (indent === 0) { end = j - 1; break; }
      end = j;
    }
    const len = end - i;
    if (len > 100) {
      smells.push(createSmell("large_class", "error", `Class '${match[1]}' is ${len} lines long`, "Split into smaller, focused classes following Single Responsibility Principle", i + 1, 80));
    } else if (len > 50) {
      smells.push(createSmell("large_class", "warning", `Class '${match[1]}' is ${len} lines long`, "Consider splitting this class into smaller, more focused classes", i + 1, 60));
    }
  }
  return smells;
}

// --- Data Class (Python) ---
function checkDataClassPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/^class\s+(\w+)/);
    if (!classMatch) continue;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") { end = j; continue; }
      const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
      if (indent === 0) { end = j - 1; break; }
      end = j;
    }
    const body = lines.slice(i, end + 1);
    const hasMethods = body.some(l => /^\s{4}def\s+(?!__init__)/.test(l));
    const hasFields = body.some(l => /^\s+self\.\w+\s*=/.test(l));
    const hasInit = body.some(l => /^\s+def\s+__init__/.test(l));
    if (hasInit && hasFields && !hasMethods) {
      smells.push(createSmell("data_class", "info", `Class '${classMatch[1]}' is a Data Class — only stores data, no behavior`, "Add behavior to this class or use a dataclass/namedtuple", i + 1, 40));
    }
  }
  return smells;
}

// --- Lazy Class (Python) — class with only pass or a single trivial method ---
function checkLazyClassPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/^class\s+(\w+)/);
    if (!classMatch) continue;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") { end = j; continue; }
      const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
      if (indent === 0) { end = j - 1; break; }
      end = j;
    }
    const body = lines.slice(i + 1, end + 1).filter(l => l.trim() !== "");
    const nonCommentBody = body.filter(l => !l.trim().startsWith("#"));
    // Lazy: only pass, or only __init__ with pass, or body <= 2 meaningful lines
    const isLazy = nonCommentBody.every(l => /^\s*(pass|\.\.\.)$/.test(l.trim()) || /^\s*def\s+\w+/.test(l) || /^\s*"""/.test(l)) && nonCommentBody.filter(l => /^\s*def\s+\w+/.test(l)).length <= 1 && nonCommentBody.filter(l => /^\s*(pass|\.\.\.)$/.test(l.trim())).length >= 1;
    if (isLazy && nonCommentBody.length <= 4) {
      smells.push(createSmell("lazy_class", "info", `Class '${classMatch[1]}' does almost nothing — possible Lazy Class`, "Inline this class into its caller or give it real responsibility", i + 1, 35));
    }
  }
  return smells;
}

// --- Refused Bequest (Python) — subclass overrides parent methods only to raise NotImplementedError ---
function checkRefusedBequestPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/^class\s+(\w+)\s*\((.+)\)/);
    if (!classMatch) continue;
    const parent = classMatch[2].trim();
    if (!parent || parent === "object") continue;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") { end = j; continue; }
      const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
      if (indent === 0) { end = j - 1; break; }
      end = j;
    }
    const body = lines.slice(i + 1, end + 1);
    const methods = body.filter(l => /^\s{4}def\s+/.test(l)).length;
    const refusals = body.filter(l => /raise\s+NotImplementedError/.test(l)).length;
    if (methods > 0 && refusals > 0 && refusals >= methods) {
      smells.push(createSmell("refused_bequest", "warning", `Class '${classMatch[1]}' inherits from '${parent}' but refuses inherited behavior with NotImplementedError`, "Prefer composition over inheritance when a subclass doesn't use the parent's interface", i + 1, 65));
    }
  }
  return smells;
}

// --- Inappropriate Intimacy (Python) — code directly accesses internal fields of another object ---
function checkInappropriateIntimacyPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("#")) continue;
    // Accessing _private or __dunder fields of another object (not self)
    const match = trimmed.match(/\b(?!self\b)(\w+)\.__?\w+/);
    if (match) {
      smells.push(createSmell("inappropriate_intimacy", "warning", `Direct access to internal field of '${match[1]}' — Inappropriate Intimacy`, "Respect encapsulation; access object internals only through public methods", i + 1, 60));
    }
  }
  return smells;
}

// --- Primitive Obsession (Python) — many self.x = primitive assignments in __init__ ---
function checkPrimitiveObsessionPython(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/^class\s+(\w+)/);
    if (!classMatch) continue;
    // Find __init__
    let initStart = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s{4}def\s+__init__/.test(lines[j])) { initStart = j; break; }
      if (lines[j].trim() !== "" && (lines[j].match(/^(\s*)/)?.[1].length || 0) === 0) break;
    }
    if (initStart === -1) continue;
    const initIndent = lines[initStart].match(/^(\s*)/)?.[1].length || 0;
    let primitiveCount = 0;
    for (let j = initStart + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") continue;
      const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
      if (indent <= initIndent) break;
      // Count self.x = "string" or self.x = 123 or self.x = True/False
      if (/self\.\w+\s*=\s*(?:["']|\d|True|False|None)/.test(lines[j])) primitiveCount++;
    }
    if (primitiveCount >= 4) {
      smells.push(createSmell("primitive_obsession", "warning", `Class '${classMatch[1]}' stores ${primitiveCount} raw primitive fields — possible Primitive Obsession`, "Group related primitives into value objects (e.g., Address, Money)", i + 1, 55));
    }
  }
  return smells;
}

// --- Long Parameter List (JS/TS/Java/Go/C#) ---
function checkLongParameterListJS(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:function)?\s*)\(([^)]+)\)/);
    if (!match) continue;
    const params = match[1].split(",").filter(p => p.trim().length > 0);
    if (params.length > 5) {
      smells.push(createSmell("too_many_parameters", "warning", `Function has ${params.length} parameters`, "Group related parameters into an object/struct to reduce parameter count", i + 1, 65));
    }
  }
  return smells;
}

// --- Switch Statements (large switches) ---
function checkLargeSwitchStatements(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/\bswitch\s*\(/.test(lines[i])) continue;
    let braceCount = 0, started = false, caseCount = 0;
    for (let j = i; j < lines.length; j++) {
      braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
      if ((lines[j].match(/{/g) || []).length > 0) started = true;
      if (/\bcase\b/.test(lines[j])) caseCount++;
      if (started && braceCount <= 0) break;
    }
    if (caseCount > 5) {
      smells.push(createSmell("large_switch", "warning", `Switch statement has ${caseCount} cases`, "Replace large switch statements with polymorphism or a strategy/map pattern", i + 1, 60));
    }
  }
  return smells;
}

// --- Message Chains (a.b().c().d()) ---
function checkMessageChains(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("#")) continue;
    const chainMatches = trimmed.match(/\.\w+\s*\([^)]*\)/g);
    if (chainMatches && chainMatches.length >= 4) {
      smells.push(createSmell("message_chain", "warning", `Long message chain detected (${chainMatches.length} chained calls)`, "Introduce intermediate variables or use the Law of Demeter to reduce chaining", i + 1, 55));
    }
  }
  return smells;
}

// --- Duplicate Code (identical non-trivial lines) ---
function checkDuplicateCode(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  const seen = new Map<string, number>();
  const reported = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Only flag non-trivial lines (length > 20, not comments, not braces-only)
    if (trimmed.length < 20 || /^[{}()\[\];,]$/.test(trimmed) || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;
    if (seen.has(trimmed) && !reported.has(trimmed)) {
      reported.add(trimmed);
      smells.push(createSmell("duplicate_code", "warning", `Duplicate code block detected (first seen at line ${seen.get(trimmed)})`, "Extract duplicated logic into a shared function or module", i + 1, 60));
    } else if (!seen.has(trimmed)) {
      seen.set(trimmed, i + 1);
    }
  }
  return smells;
}

// --- Data Class (class with only getters/setters/fields, no real methods) ---
function checkDataClass(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/\bclass\s+(\w+)/);
    if (!classMatch) continue;
    let braceCount = 0, started = false, end = i;
    let methodCount = 0, getterSetterCount = 0;
    for (let j = i; j < lines.length; j++) {
      braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
      if ((lines[j].match(/{/g) || []).length > 0) started = true;
      if (/\b(?:get|set)\s+\w+|get\w+\(|set\w+\(/.test(lines[j])) getterSetterCount++;
      if (/\b(?:function|def|fun|func)\s+(?!get|set)\w+/.test(lines[j])) methodCount++;
      if (started && braceCount <= 0) { end = j; break; }
      end = j;
    }
    const classLen = end - i;
    if (classLen > 10 && getterSetterCount >= 3 && methodCount === 0) {
      smells.push(createSmell("data_class", "info", `Class '${classMatch[1]}' appears to be a Data Class (only getters/setters, no behavior)`, "Consider adding behavior to this class or using a plain data structure", i + 1, 40));
    }
  }
  return smells;
}

// --- Speculative Generality (abstract/interface with single implementor, TODO/FIXME markers) ---
function checkSpeculativeGenerality(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b/.test(line)) {
      smells.push(createSmell("speculative_generality", "info", "TODO/FIXME/HACK marker found — possible speculative or incomplete code", "Address the TODO or remove speculative abstractions that are not yet needed", i + 1, 35));
    }
    if (/\b(?:abstract\s+class|interface)\s+(\w+)/.test(line)) {
      smells.push(createSmell("speculative_generality", "info", "Abstract class or interface detected — verify it has multiple implementors", "Remove unnecessary abstractions that exist for only one use case (YAGNI principle)", i + 1, 30));
    }
  }
  return smells;
}

// --- Comments as Deodorant (long comment blocks masking complex code) ---
function checkCommentsAsDeodorant(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  let consecutiveComments = 0;
  let commentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*") || trimmed.startsWith("/*");
    if (isComment) {
      if (consecutiveComments === 0) commentStart = i + 1;
      consecutiveComments++;
    } else {
      if (consecutiveComments >= 3) {
        smells.push(createSmell("comments_as_deodorant", "info", `Large comment block (${consecutiveComments} lines) starting at line ${commentStart} — may be masking complex code`, "Refactor the code to be self-explanatory instead of relying on extensive comments", commentStart, 35));
      }
      consecutiveComments = 0;
    }
  }
  return smells;
}

// --- Feature Envy (function heavily accesses another object's fields) ---
function checkFeatureEnvy(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functions = extractFunctionsJS(code);
  const lines = code.split("\n");
  for (const func of functions) {
    const body = lines.slice(func.lineno - 1, func.endLineno).join("\n");
    const accessMatches = body.match(/\b(\w+)\.(\w+)/g) || [];
    const objectAccess = new Map<string, number>();
    for (const m of accessMatches) {
      const obj = m.split(".")[0];
      if (["this", "self", "console", "Math", "Object", "Array", "String"].includes(obj)) continue;
      objectAccess.set(obj, (objectAccess.get(obj) || 0) + 1);
    }
    for (const [obj, count] of objectAccess) {
      if (count >= 5) {
        smells.push(createSmell("feature_envy", "warning", `Function at line ${func.lineno} accesses '${obj}' ${count} times — possible Feature Envy`, "Move this logic closer to the data it operates on (into the '${obj}' class/module)", func.lineno, 60));
        break;
      }
    }
  }
  return smells;
}

// --- Middle Man (class/module that only delegates to another) ---
function checkMiddleMan(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/\bclass\s+(\w+)/);
    if (!classMatch) continue;
    let braceCount = 0, started = false;
    let totalMethods = 0, delegatingMethods = 0;
    for (let j = i; j < lines.length; j++) {
      braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
      if ((lines[j].match(/{/g) || []).length > 0) started = true;
      if (/\bfunction\s+\w+|\bdef\s+\w+|\bfun\s+\w+/.test(lines[j])) totalMethods++;
      if (/return\s+this\.\w+\.|return\s+self\.\w+\./.test(lines[j])) delegatingMethods++;
      if (started && braceCount <= 0) break;
    }
    if (totalMethods >= 3 && delegatingMethods / totalMethods >= 0.7) {
      smells.push(createSmell("middle_man", "warning", `Class '${classMatch[1]}' appears to be a Middle Man (most methods just delegate)`, "Remove the middle man and let clients call the delegate directly", i + 1, 55));
    }
  }
  return smells;
}

// --- Temporary Field (fields assigned only in some paths) ---
function checkTemporaryField(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  const fieldAssignments = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    // this.field = ... or self.field = ...
    const match = lines[i].match(/(?:this|self)\.(\w+)\s*=(?!=)/);
    if (match) {
      const field = match[1];
      if (!fieldAssignments.has(field)) fieldAssignments.set(field, []);
      fieldAssignments.get(field)!.push(i + 1);
    }
  }
  // Fields assigned inside conditionals (if/else) are suspicious
  for (let i = 0; i < lines.length; i++) {
    if (!/\bif\b/.test(lines[i])) continue;
    const match = lines[i + 1]?.match(/(?:this|self)\.(\w+)\s*=(?!=)/);
    if (match) {
      smells.push(createSmell("temporary_field", "info", `Field '${match[1]}' is only assigned inside a conditional — possible Temporary Field`, "Avoid fields that are only valid in certain states; use local variables or a separate object", i + 1, 45));
    }
  }
  return smells;
}

// --- Primitive Obsession (many primitive fields instead of small objects) ---
function checkPrimitiveObsession(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/\bclass\s+(\w+)/);
    if (!classMatch) continue;
    let braceCount = 0, started = false, primitiveCount = 0;
    for (let j = i; j < lines.length; j++) {
      braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
      if ((lines[j].match(/{/g) || []).length > 0) started = true;
      if (/:\s*(?:string|number|boolean|int|float|double|bool|str|char)\b/.test(lines[j])) primitiveCount++;
      if (started && braceCount <= 0) break;
    }
    if (primitiveCount >= 6) {
      smells.push(createSmell("primitive_obsession", "warning", `Class '${classMatch[1]}' has ${primitiveCount} primitive fields — possible Primitive Obsession`, "Group related primitives into small value objects (e.g., Address, Money, DateRange)", i + 1, 55));
    }
  }
  return smells;
}

// ---------- Java Rules ----------

function checkJavaNullPointer(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return;
    // Direct call on a value that could be null without null check
    if (/\.equals\s*\(null\)/.test(trimmed)) {
      smells.push(createSmell("null_check", "warning", "Calling .equals(null) — use == null instead", "Use '== null' for null checks to avoid NullPointerException", i + 1, 60));
    }
    if (/catch\s*\(\s*Exception\s+\w+\s*\)/.test(trimmed)) {
      smells.push(createSmell("broad_catch", "warning", "Catching generic Exception — too broad", "Catch specific exception types instead of the base Exception class", i + 1, 65));
    }
    if (/System\.out\.print/.test(trimmed)) {
      smells.push(createSmell("print_statement", "warning", "System.out.print found — use a logger", "Replace System.out.print with a proper logging framework (SLF4J, Log4j)", i + 1, 45));
    }
  });
  return smells;
}

function checkJavaPublicFields(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    if (/^\s*public\s+(?!class|interface|enum|static|final|void|\w+\s*\()(?:static\s+)?(?!final)\w+\s+\w+\s*;/.test(line)) {
      smells.push(createSmell("public_field", "warning", "Public mutable field exposes internal state", "Make fields private and expose them via getters/setters", i + 1, 60));
    }
  });
  return smells;
}

function analyzeJava(code: string): CodeSmell[] {
  return [
    ...checkLongFunctionJS(code),
    ...checkDeepNesting(code),
    ...checkMagicNumbers(code),
    ...checkLargeClass(code),
    ...checkLongParameterListJS(code),
    ...checkLargeSwitchStatements(code),
    ...checkMessageChains(code),
    ...checkDuplicateCode(code),
    ...checkDataClass(code),
    ...checkSpeculativeGenerality(code),
    ...checkCommentsAsDeodorant(code),
    ...checkFeatureEnvy(code),
    ...checkMiddleMan(code),
    ...checkTemporaryField(code),
    ...checkPrimitiveObsession(code),
    ...checkJavaNullPointer(code),
    ...checkJavaPublicFields(code),
  ];
}

// ---------- Go Rules ----------

function checkGoErrorIgnored(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return;
    // Assignment where error is discarded with _
    if (/,\s*_\s*:?=/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
      smells.push(createSmell("ignored_error", "warning", "Error return value is being ignored (_)", "Always handle errors in Go — ignoring them can hide critical failures", i + 1, 70));
    }
    if (/\bpanic\s*\(/.test(trimmed)) {
      smells.push(createSmell("panic_usage", "error", "Use of panic() detected", "Avoid panic() in production code; return errors instead", i + 1, 80));
    }
  });
  return smells;
}

function checkGoGlobalVar(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");
  let inFunc = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^func\s/.test(lines[i])) { inFunc = true; continue; }
    if (inFunc && /^}/.test(lines[i])) { inFunc = false; continue; }
    if (!inFunc && /^var\s+\w+/.test(lines[i].trim())) {
      smells.push(createSmell("global_variable", "warning", "Package-level var declaration — possible global state", "Avoid mutable global state; pass dependencies explicitly", i + 1, 60));
    }
  }
  return smells;
}

function analyzeGo(code: string): CodeSmell[] {
  return [
    ...checkLongFunctionJS(code),
    ...checkDeepNesting(code),
    ...checkMagicNumbers(code),
    ...checkLargeClass(code),
    ...checkLongParameterListJS(code),
    ...checkLargeSwitchStatements(code),
    ...checkMessageChains(code),
    ...checkDuplicateCode(code),
    ...checkSpeculativeGenerality(code),
    ...checkCommentsAsDeodorant(code),
    ...checkTemporaryField(code),
    ...checkGoErrorIgnored(code),
    ...checkGoGlobalVar(code),
  ];
}

// ---------- C# Rules ----------

function checkCSharpSpecific(code: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  code.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return;
    if (/\.Result\b|\.Wait\s*\(/.test(trimmed) && /async|Task/.test(trimmed)) {
      smells.push(createSmell("async_deadlock", "error", ".Result or .Wait() on async Task can cause deadlocks", "Use 'await' instead of .Result/.Wait() to avoid deadlocks", i + 1, 85));
    }
    if (/catch\s*\(\s*Exception\s+\w+\s*\)/.test(trimmed)) {
      smells.push(createSmell("broad_catch", "warning", "Catching generic Exception — too broad", "Catch specific exception types", i + 1, 65));
    }
    if (/Console\.Write/.test(trimmed)) {
      smells.push(createSmell("print_statement", "warning", "Console.Write found — use a logger", "Replace Console.Write with a proper logging framework (ILogger, Serilog)", i + 1, 45));
    }
    if (/^\s*public\s+(?!class|interface|enum|static|readonly|const|void|\w+\s*[({])(?:static\s+)?(?!readonly|const)\w+\s+\w+\s*[;{]/.test(line)) {
      smells.push(createSmell("public_field", "warning", "Public mutable field — use a property instead", "Replace public fields with properties (get; set;) for proper encapsulation", i + 1, 60));
    }
  });
  return smells;
}

function analyzeCSharp(code: string): CodeSmell[] {
  return [
    ...checkLongFunctionJS(code),
    ...checkDeepNesting(code),
    ...checkMagicNumbers(code),
    ...checkLargeClass(code),
    ...checkLongParameterListJS(code),
    ...checkLargeSwitchStatements(code),
    ...checkMessageChains(code),
    ...checkDuplicateCode(code),
    ...checkDataClass(code),
    ...checkSpeculativeGenerality(code),
    ...checkCommentsAsDeodorant(code),
    ...checkFeatureEnvy(code),
    ...checkMiddleMan(code),
    ...checkTemporaryField(code),
    ...checkPrimitiveObsession(code),
    ...checkCSharpSpecific(code),
  ];
}

// ===================== ANALYSIS ENGINE =====================

function analyzeJavaScript(code: string): CodeSmell[] {
  return [
    ...checkLongFunctionJS(code),
    ...checkDeepNesting(code),
    ...checkMagicNumbers(code),
    ...checkUnusedVariables(code),
    ...checkConsoleLog(code),
    ...checkEvalJS(code),
    ...checkLargeClass(code),
    ...checkLongParameterListJS(code),
    ...checkLargeSwitchStatements(code),
    ...checkMessageChains(code),
    ...checkDuplicateCode(code),
    ...checkDataClass(code),
    ...checkSpeculativeGenerality(code),
    ...checkCommentsAsDeodorant(code),
    ...checkFeatureEnvy(code),
    ...checkMiddleMan(code),
    ...checkTemporaryField(code),
    ...checkPrimitiveObsession(code),
  ];
}

function analyzePython(code: string): CodeSmell[] {
  return [
    ...checkLongFunctionPython(code),
    ...checkTooManyParametersPython(code),
    ...checkWildcardImportPython(code),
    ...checkBareExceptPython(code),
    ...checkMutableDefaultPython(code),
    ...checkDeepNestingPython(code),
    ...checkEvalExecPython(code),
    ...checkIsLiteralPython(code),
    ...checkLargeClassPython(code),
    ...checkDataClassPython(code),
    ...checkLazyClassPython(code),
    ...checkRefusedBequestPython(code),
    ...checkInappropriateIntimacyPython(code),
    ...checkPrimitiveObsessionPython(code),
    ...checkMessageChains(code),
    ...checkDuplicateCode(code),
    ...checkSpeculativeGenerality(code),
    ...checkCommentsAsDeodorant(code),
    ...checkTemporaryField(code),
  ];
}

function analyzeCode(code: string, language: string): CodeSmell[] {
  switch (language) {
    case "python":
      return analyzePython(code);
    case "javascript":
    case "typescript":
      return analyzeJavaScript(code);
    case "java":
      return analyzeJava(code);
    case "go":
      return analyzeGo(code);
    case "csharp":
      return analyzeCSharp(code);
    case "ruby":
      return analyzeRuby(code);
    case "rust":
      return analyzeRust(code);
    case "php":
      return analyzePHP(code);
    case "swift":
      return analyzeSwift(code);
    case "kotlin":
      return analyzeKotlin(code);
    case "cpp":
      return analyzeCpp(code);
    default:
      return [];
  }
}

function calculateOverallScore(smells: CodeSmell[]): number {
  if (smells.length === 0) return 100; // perfect score when no smells
  const totalScore = smells.reduce((sum, s) => sum + s.score, 0);
  return Math.min(100, Math.round(totalScore / smells.length));
}

// ===================== API HANDLER =====================

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.code || !body.language) {
      return NextResponse.json(
        { detail: "Code and language are required" },
        { status: 400 }
      );
    }

    if (body.code.length > 1024 * 1024) {
      return NextResponse.json(
        { detail: "Code size exceeds maximum limit of 1MB" },
        { status: 400 }
      );
    }

    const supportedLanguages = ["javascript", "typescript", "python", "java", "go", "csharp", "ruby", "rust", "php", "swift", "kotlin", "cpp"];
    if (!supportedLanguages.includes(body.language)) {
      return NextResponse.json(
        { detail: "Unsupported language" },
        { status: 400 }
      );
    }

    const smells = analyzeCode(body.code, body.language);
    const overallScore = calculateOverallScore(smells);

    const bySeverity = {
      error: smells.filter((s) => s.severity === "error").length,
      warning: smells.filter((s) => s.severity === "warning").length,
      info: smells.filter((s) => s.severity === "info").length,
    };

    const result = {
      analysis_id: generateId(),
      smells,
      summary: {
        total_smells: smells.length,
        by_severity: bySeverity,
        overall_score: overallScore,
        language: body.language,
        analyzed_at: new Date().toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
