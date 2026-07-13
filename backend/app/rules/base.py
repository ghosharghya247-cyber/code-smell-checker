from abc import ABC, abstractmethod
from typing import Any, Dict, List
from uuid import uuid4


class CodeSmellRule(ABC):
    def __init__(self):
        self.id = str(uuid4())
        self.name: str = ""
        self.severity: str = "warning"
        self.description: str = ""

    @abstractmethod
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        pass

    def create_smell(
        self,
        smell_type: str,
        severity: str,
        message: str,
        recommendation: str,
        line: int,
        column: int = 0,
        end_line: int = None,
        score: int = 50,
        examples: List[str] = None,
    ) -> Dict:
        return {
            "id": str(uuid4()),
            "type": smell_type,
            "severity": severity,
            "score": score,
            "location": {
                "line": line,
                "column": column,
                "end_line": end_line,
            },
            "message": message,
            "recommendation": recommendation,
            "examples": examples or [],
        }
