from typing import List, Dict, Any, Optional
from app.prompts.system_prompt import SYSTEM_PROMPT
from app.prompts.context_builder import build_analysis_context


def build_messages(
    user_message: str,
    code: str,
    language: str,
    smells: List[Dict[str, Any]],
    summary: Optional[Dict[str, Any]],
    history: List[Dict[str, str]],
    max_history: int = 10,
) -> List[Dict[str, str]]:
    context = build_analysis_context(code, language, smells, summary)

    system_content = f"{SYSTEM_PROMPT}\n\n{context}"

    messages = [{"role": "system", "content": system_content}]

    # Trim history to last N turns (each turn = user + assistant)
    trimmed = history[-(max_history * 2):]
    messages.extend(trimmed)

    messages.append({"role": "user", "content": user_message})
    return messages
