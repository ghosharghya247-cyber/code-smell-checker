export const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "cpp", label: "C++" },
];

export const SEVERITY_LEVELS = {
  info: { label: "Info", color: "blue" },
  warning: { label: "Warning", color: "yellow" },
  error: { label: "Error", color: "red" },
};

export const CODE_SMELL_TYPES = {
  long_method: "Long Method",
  deep_nesting: "Deep Nesting",
  complexity: "High Complexity",
  unused_variable: "Unused Variable",
  magic_number: "Magic Number",
  poor_naming: "Poor Naming",
  duplicate_code: "Duplicate Code",
  large_class: "Large Class",
  too_many_parameters: "Too Many Parameters",
  wildcard_imports: "Wildcard Imports",
  bare_except: "Bare Exception",
  mutable_default: "Mutable Default Argument",
};

export const MAX_CODE_SIZE = 1024 * 1024; // 1MB
