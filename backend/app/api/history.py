from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import HistoryResponseSchema, AnalysisResultSchema
from app.services.history_service import HistoryService
from app.services.analysis_service import AnalysisService
from app.core.database import get_db
from app.core.security import decode_token
from fastapi import Header
from typing import Optional

router = APIRouter(prefix="/api", tags=["history"])
history_service = HistoryService()
analysis_service = AnalysisService()


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload.get("user_id")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/history", response_model=HistoryResponseSchema)
async def get_history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return history_service.get_user_history(db, user_id, limit, offset)


@router.get("/history/{analysis_id}", response_model=AnalysisResultSchema)
async def get_analysis_detail(
    analysis_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        result = analysis_service.get_analysis_result(db, analysis_id)
        return result
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis not found")


@router.delete("/history/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    deleted = history_service.delete_analysis(db, analysis_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"success": True}


@router.delete("/history")
async def clear_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    deleted_count = history_service.clear_user_history(db, user_id)
    return {"deleted_count": deleted_count}
