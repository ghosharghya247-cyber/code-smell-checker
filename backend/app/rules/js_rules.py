from typing import Any, Dict, List
from app.rules.base import CodeSmellRule


class LongFunctionJSRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        code_lines = parsed_code["code"].split("\n")

        for func in parsed_code["functions"]:
            lines = (func["end_lineno"] or 0) - (func["lineno"] or 0)
            if lines > 100:
                smells.append(self.create_smell(
                    smell_type="long_function",
                    severity="error",
                    message=f"Function is {lines} lines long",
                    recommendation="Break down this function into smaller, more focused functions",
                    line=func["lineno"],
                    score=80,
                ))
            elif lines > 50:
                smells.append(self.create_smell(
                    smell_type="long_function",
                    severity="warning",
                    message=f"Function is {lines} lines long",
                    recommendation="Consider breaking down this function",
                    line=func["lineno"],
                    score=60,
                ))
        return smells


class DeepNestingRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        code_lines = parsed_code["code"].split("\n")

        max_nesting = 0
        current_nesting = 0
        nesting_line = 1

        for i, line in enumerate(code_lines):
            opening = line.count("{") + line.count("[") + line.count("(")
            closing = line.count("}") + line.count("]") + line.count(")")
            current_nesting += opening - closing

            if current_nesting > max_nesting:
                max_nesting = current_nesting
                nesting_line = i + 1

            if max_nesting > 4:
                smells.append(self.create_smell(
                    smell_type="deep_nesting",
                    severity="warning",
                    message=f"Deep nesting detected (level {max_nesting})",
                    recommendation="Refactor code to reduce nesting depth",
                    line=nesting_line,
                    score=65,
                ))
                break

        return smells


class MagicNumberRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        code_lines = parsed_code["code"].split("\n")

        for i, line in enumerate(code_lines):
            if any(line.strip().startswith(prefix) for prefix in ["//", "/*", "*"]):
                continue

            import re
            numbers = re.findall(r"\b\d{2,}\b", line)
            for num in numbers:
                if num not in ["0", "1", "-1"] and not any(
                    x in line for x in ["PORT", "TIMEOUT", "MAX", "MIN", "="]
                ):
                    smells.append(self.create_smell(
                        smell_type="magic_number",
                        severity="info",
                        message=f"Magic number '{num}' found in code",
                        recommendation="Replace magic numbers with named constants",
                        line=i + 1,
                        score=40,
                    ))
                    break

        return smells


class UnusedVariableRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        code = parsed_code["code"]

        import re
        for var in parsed_code["variables"]:
            pattern = rf"\b{var['name']}\b"
            count = len(re.findall(pattern, code))
            if count == 1:
                smells.append(self.create_smell(
                    smell_type="unused_variable",
                    severity="info",
                    message=f"Variable '{var['name']}' is declared but never used",
                    recommendation="Remove unused variables to clean up the code",
                    line=var["lineno"],
                    score=30,
                ))

        return smells
