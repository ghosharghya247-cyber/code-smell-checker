from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseDetector(ABC):
    def __init__(self):
        self.rules: List[Any] = []
        self.name: str = ""

    @abstractmethod
    def detect(self, code: str) -> Dict[str, Any]:
        pass

    def calculate_overall_score(self, smells: List[Dict]) -> int:
        if not smells:
            return 0

        total_score = sum(s.get("score", 50) for s in smells)
        avg_score = total_score / len(smells)
        return min(100, int(avg_score))
