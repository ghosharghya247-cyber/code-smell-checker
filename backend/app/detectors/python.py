from typing import Any, Dict, List
from app.detectors.base import BaseDetector
from app.parsers.python_parser import PythonParser
from app.parsers.metrics import MetricsCalculator
from app.rules.py_rules import (
    LongFunctionRule,
    TooManyParametersRule,
    WildcardImportRule,
    BareExceptRule,
    MutableDefaultArgumentRule,
    ComplexConditionalsRule,
    GlobalVariablesRule,
    UnusedVariablesRule,
)


class PythonDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.name = "python"
        self.parser = PythonParser()
        self.rules = [
            LongFunctionRule(),
            TooManyParametersRule(),
            WildcardImportRule(),
            BareExceptRule(),
            MutableDefaultArgumentRule(),
            ComplexConditionalsRule(),
            GlobalVariablesRule(),
            UnusedVariablesRule(),
        ]

    def detect(self, code: str) -> Dict[str, Any]:
        try:
            parsed = self.parser.parse(code)
        except ValueError as e:
            return {"smells": [], "error": str(e)}

        all_smells = []
        for rule in self.rules:
            smells = rule.check(parsed)
            all_smells.extend(smells)

        overall_score = self.calculate_overall_score(all_smells)
        severity_counts = {
            "error": len([s for s in all_smells if s["severity"] == "error"]),
            "warning": len([s for s in all_smells if s["severity"] == "warning"]),
            "info": len([s for s in all_smells if s["severity"] == "info"]),
        }
        
        metrics_calc = MetricsCalculator(parsed)
        metrics = metrics_calc.calculate()

        return {
            "smells": all_smells,
            "overall_score": overall_score,
            "total_smells": len(all_smells),
            "by_severity": severity_counts,
            "metrics": metrics,
        }
