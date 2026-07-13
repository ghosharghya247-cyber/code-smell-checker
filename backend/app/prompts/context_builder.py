from typing import List, Dict, Any, Optional


def build_analysis_context(
    code: str,
    language: str,
    smells: List[Dict[str, Any]],
    summary: Optional[Dict[str, Any]] = None,
    max_code_lines: int = 200,
) -> str:
    lines = code.splitlines()
    if len(lines) > max_code_lines:
        truncated = lines[:max_code_lines]
        code_section = "\n".join(truncated) + f"\n... [{len(lines) - max_code_lines} more lines truncated]"
    else:
        code_section = code

    parts = [
        f"## Source Code ({language})\n```{language}\n{code_section}\n```",
    ]

    if summary:
        score = summary.get("overall_score", "N/A")
        total = summary.get("total_smells", 0)
        by_sev = summary.get("by_severity", {})
        parts.append(
            f"## Analysis Summary\n"
            f"- Overall Score: {score}/100\n"
            f"- Total Smells: {total} "
            f"(errors: {by_sev.get('error', 0)}, "
            f"warnings: {by_sev.get('warning', 0)}, "
            f"info: {by_sev.get('info', 0)})"
        )

    if smells:
        smell_lines = ["## Detected Code Smells"]
        for s in smells:
            loc = s.get("location", {})
            smell_lines.append(
                f"- [{s.get('severity', '').upper()}] {s.get('type', '')} "
                f"at line {loc.get('line', '?')}: {s.get('message', '')} "
                f"— {s.get('recommendation', '')}"
            )
        parts.append("\n".join(smell_lines))
    else:
        parts.append("## Detected Code Smells\nNo smells detected.")

    return "\n\n".join(parts)
