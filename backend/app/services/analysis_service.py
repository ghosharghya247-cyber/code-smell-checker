from typing import Dict, Any
from sqlalchemy.orm import Session
from app.detectors.python import PythonDetector
from app.detectors.javascript import JavaScriptDetector
from app.models.database import Analysis, CodeSmell
from app.models.schemas import AnalysisResultSchema, CodeSmellSchema, LocationSchema
from datetime import datetime
from uuid import uuid4


class AnalysisService:
    def __init__(self):
        self.detectors = {
            "python": PythonDetector(),
            "javascript": JavaScriptDetector(),
            "java": JavaScriptDetector(),
            "go": JavaScriptDetector(),
            "csharp": JavaScriptDetector(),
        }

    def analyze(self, code: str, language: str, user_id: str = None, source_name: str = None) -> AnalysisResultSchema:
        detector = self.detectors.get(language)
        if not detector:
            raise ValueError(f"Unsupported language: {language}")

        result = detector.detect(code)

        if "error" in result:
            raise ValueError(result["error"])

        smells = result["smells"]
        overall_score = result["overall_score"]
        total_smells = result["total_smells"]
        by_severity = result["by_severity"]

        return AnalysisResultSchema(
            analysis_id=str(uuid4()),
            smells=[CodeSmellSchema(
                id=smell["id"],
                type=smell["type"],
                severity=smell["severity"],
                score=smell["score"],
                location=LocationSchema(
                    line=smell["location"]["line"],
                    column=smell["location"]["column"],
                    end_line=smell["location"].get("end_line"),
                ),
                message=smell["message"],
                recommendation=smell["recommendation"],
                examples=smell.get("examples"),
            ) for smell in smells],
            summary={
                "total_smells": total_smells,
                "by_severity": by_severity,
                "overall_score": overall_score,
                "language": language,
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        )

    def save_analysis(self, db: Session, code: str, language: str, user_id: str = None, source_name: str = None) -> Analysis:
        analysis_result = self.analyze(code, language, user_id, source_name)

        analysis = Analysis(
            user_id=user_id,
            source_code=code,
            language=language,
            source_name=source_name,
            overall_score=analysis_result.summary["overall_score"],
            total_smells=analysis_result.summary["total_smells"],
        )
        db.add(analysis)
        db.flush()

        for smell in analysis_result.smells:
            code_smell = CodeSmell(
                analysis_id=analysis.id,
                smell_type=smell.type,
                severity=smell.severity,
                severity_score=smell.score,
                line_number=smell.location.line,
                column_number=smell.location.column,
                end_line_number=smell.location.end_line,
                message=smell.message,
                recommendation=smell.recommendation,
                examples=smell.examples,
            )
            db.add(code_smell)

        db.commit()
        return analysis

    def get_analysis_result(self, db: Session, analysis_id: str) -> AnalysisResultSchema:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise ValueError("Analysis not found")

        smells = [CodeSmellSchema(
            id=str(smell.id),
            type=smell.smell_type,
            severity=smell.severity,
            score=smell.severity_score,
            location=LocationSchema(
                line=smell.line_number,
                column=smell.column_number,
                end_line=smell.end_line_number,
            ),
            message=smell.message,
            recommendation=smell.recommendation,
            examples=smell.examples or [],
        ) for smell in analysis.smells]

        return AnalysisResultSchema(
            analysis_id=str(analysis.id),
            smells=smells,
            summary={
                "total_smells": analysis.total_smells,
                "by_severity": {
                    "error": sum(1 for s in smells if s.severity == "error"),
                    "warning": sum(1 for s in smells if s.severity == "warning"),
                    "info": sum(1 for s in smells if s.severity == "info"),
                },
                "overall_score": analysis.overall_score,
                "language": analysis.language,
                "analyzed_at": analysis.created_at.isoformat(),
            },
        )
