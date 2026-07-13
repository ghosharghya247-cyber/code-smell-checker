from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from typing import List, Dict, Any, Optional
from app.services.ai_chat_service import AIChatService

router = APIRouter(prefix="/api/chat", tags=["ai-chat"])
_service = AIChatService()

MAX_MESSAGE_LENGTH = 4000
MAX_CODE_LENGTH = 100_000


class ChatRequest(BaseModel):
    message: str
    code: str = ""
    language: str = "python"
    smells: List[Dict[str, Any]] = []
    summary: Optional[Dict[str, Any]] = None
    history: List[Dict[str, str]] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message exceeds {MAX_MESSAGE_LENGTH} characters")
        return v

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if len(v) > MAX_CODE_LENGTH:
            return v[:MAX_CODE_LENGTH]
        return v


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        async for chunk in _service.stream_response(
            user_message=request.message,
            code=request.code,
            language=request.language,
            smells=request.smells,
            summary=request.summary,
            history=request.history,
        ):
            # SSE format
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
