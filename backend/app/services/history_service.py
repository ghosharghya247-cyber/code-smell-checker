from sqlalchemy.orm import Session
from app.models.database import Analysis
from app.models.schemas import AnalysisHistorySchema, HistoryResponseSchema
from typing import List


class HistoryService:
    @staticmethod
    def get_user_history(db: Session, user_id: str, limit: int = 20, offset: int = 0) -> HistoryResponseSchema:
        query = db.query(Analysis).filter(Analysis.user_id == user_id).order_by(Analysis.created_at.desc())
        total = query.count()
        analyses = query.limit(limit).offset(offset).all()

        return HistoryResponseSchema(
            analyses=[AnalysisHistorySchema(
                id=str(a.id),
                source_name=a.source_name,
                language=a.language,
                total_smells=a.total_smells,
                overall_score=a.overall_score,
                created_at=a.created_at.isoformat(),
            ) for a in analyses],
            total=total,
        )

    @staticmethod
    def delete_analysis(db: Session, analysis_id: str, user_id: str) -> bool:
        analysis = db.query(Analysis).filter(
            Analysis.id == analysis_id,
            Analysis.user_id == user_id,
        ).first()
        if not analysis:
            return False

        db.delete(analysis)
        db.commit()
        return True

    @staticmethod
    def clear_user_history(db: Session, user_id: str) -> int:
        deleted = db.query(Analysis).filter(Analysis.user_id == user_id).delete()
        db.commit()
        return deleted
