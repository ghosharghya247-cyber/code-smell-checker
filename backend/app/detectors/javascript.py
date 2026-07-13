from typing import Any, Dict, List
from app.detectors.base import BaseDetector
from app.rules.js_rules import (
    LongFunctionJSRule,
    DeepNestingRule,
    MagicNumberRule,
    UnusedVariableRule,
)


class JavaScriptDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.name = "javascript"
        self.rules = [
            LongFunctionJSRule(),
            DeepNestingRule(),
            MagicNumberRule(),
            UnusedVariableRule(),
        ]

    def detect(self, code: str) -> Dict[str, Any]:
        try:
            parsed = {
                "code": code,
                "functions": self._extract_functions(code),
                "variables": self._extract_variables(code),
            }
        except Exception as e:
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

        return {
            "smells": all_smells,
            "overall_score": overall_score,
            "total_smells": len(all_smells),
            "by_severity": severity_counts,
        }

    def _extract_functions(self, code: str) -> List[Dict]:
        import re
        functions = []
        lines = code.split("\n")

        for i, line in enumerate(lines):
            if re.search(r"function\s+\w+|const\s+\w+\s*=.*=>|async\s+function", line):
                functions.append({
                    "lineno": i + 1,
                    "end_lineno": min(i + 50, len(lines)),
                })

        return functions

    def _extract_variables(self, code: str) -> List[Dict]:
        import re
        variables = []
        lines = code.split("\n")

        for i, line in enumerate(lines):
            matches = re.findall(r"(?:const|let|var)\s+(\w+)", line)
            for match in matches:
                variables.append({
                    "name": match,
                    "lineno": i + 1,
                })

        return variables
