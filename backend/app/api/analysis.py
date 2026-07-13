from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import AnalyzeRequestSchema, AnalysisResultSchema
from app.services.analysis_service import AnalysisService
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import decode_token
from fastapi import Header
from typing import Optional

router = APIRouter(prefix="/api", tags=["analysis"])
analysis_service = AnalysisService()
settings = get_settings()


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None

    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if not payload:
            return None
        return payload.get("user_id")
    except:
        return None


@router.post("/analyze", response_model=AnalysisResultSchema)
async def analyze_code(
    request: AnalyzeRequestSchema,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user),
):
    if len(request.code) > settings.max_code_size:
        raise HTTPException(
            status_code=400,
            detail=f"Code size exceeds maximum limit of {settings.max_code_size} bytes",
        )

    if request.language not in ["javascript", "python", "java", "go", "csharp"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language",
        )

    try:
        result = analysis_service.analyze(request.code, request.language, user_id, request.source_name)

        if user_id:
            analysis_service.save_analysis(db, request.code, request.language, user_id, request.source_name)

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
