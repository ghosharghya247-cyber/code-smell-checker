import os
from typing import List, Dict, Any, Optional, AsyncIterator
from app.prompts.prompt_templates import build_messages


class AIChatService:
    """Communicates with the configured LLM provider and streams responses."""

    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "openai").lower()
        self.model = os.getenv("AI_MODEL", "gpt-4o-mini")
        self.api_key = os.getenv("AI_API_KEY", "")
        self.streaming_enabled = os.getenv("STREAMING_ENABLED", "true").lower() == "true"
        self.max_history = int(os.getenv("MAX_CHAT_HISTORY", "10"))
        self.max_context_lines = int(os.getenv("MAX_CONTEXT_LINES", "200"))

    def _get_client(self):
        if self.provider == "openai":
            from openai import AsyncOpenAI
            return AsyncOpenAI(api_key=self.api_key)
        if self.provider == "anthropic":
            from anthropic import AsyncAnthropic
            return AsyncAnthropic(api_key=self.api_key)
        raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def stream_response(
        self,
        user_message: str,
        code: str,
        language: str,
        smells: List[Dict[str, Any]],
        summary: Optional[Dict[str, Any]],
        history: List[Dict[str, str]],
    ) -> AsyncIterator[str]:
        if not self.api_key:
            yield "AI_API_KEY is not configured. Please set it in your environment variables."
            return

        messages = build_messages(
            user_message, code, language, smells, summary, history, self.max_history
        )

        try:
            client = self._get_client()

            if self.provider == "openai":
                async for chunk in await self._stream_openai(client, messages):
                    yield chunk
            elif self.provider == "anthropic":
                async for chunk in self._stream_anthropic(client, messages):
                    yield chunk

        except Exception as e:
            yield f"Error communicating with AI provider: {str(e)}"

    async def _stream_openai(self, client, messages: List[Dict]) -> AsyncIterator[str]:
        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
            max_tokens=2048,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def _stream_anthropic(self, client, messages: List[Dict]) -> AsyncIterator[str]:
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]

        async with client.messages.stream(
            model=self.model,
            max_tokens=2048,
            system=system_msg,
            messages=user_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
