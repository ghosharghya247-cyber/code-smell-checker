import ast
from typing import Any, Dict, List
from app.rules.base import CodeSmellRule


class LongFunctionRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                lines = (node.end_lineno or 0) - (node.lineno or 0)
                if lines > 100:
                    smells.append(self.create_smell(
                        smell_type="long_function",
                        severity="error",
                        message=f"Function '{node.name}' is {lines} lines long",
                        recommendation="Consider breaking down this function into smaller, more focused functions",
                        line=node.lineno,
                        score=80,
                    ))
                elif lines > 50:
                    smells.append(self.create_smell(
                        smell_type="long_function",
                        severity="warning",
                        message=f"Function '{node.name}' is {lines} lines long",
                        recommendation="Consider breaking down this function",
                        line=node.lineno,
                        score=60,
                    ))
        return smells


class TooManyParametersRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                param_count = len(node.args.args)
                if param_count > 5:
                    smells.append(self.create_smell(
                        smell_type="too_many_parameters",
                        severity="warning",
                        message=f"Function '{node.name}' has {param_count} parameters",
                        recommendation="Consider grouping parameters into a single object or reducing the number of parameters",
                        line=node.lineno,
                        score=65,
                    ))
        return smells


class WildcardImportRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    if alias.name == "*":
                        smells.append(self.create_smell(
                            smell_type="wildcard_import",
                            severity="warning",
                            message=f"Wildcard import from module '{node.module}'",
                            recommendation="Explicitly import the items you need instead of using '*'",
                            line=node.lineno,
                            score=55,
                        ))
        return smells


class BareExceptRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                if node.type is None:
                    smells.append(self.create_smell(
                        smell_type="bare_except",
                        severity="error",
                        message="Bare 'except:' clause catches all exceptions",
                        recommendation="Specify the exception type(s) you want to catch",
                        line=node.lineno,
                        score=75,
                    ))
        return smells


class MutableDefaultArgumentRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        smells.append(self.create_smell(
                            smell_type="mutable_default",
                            severity="error",
                            message=f"Function '{node.name}' has a mutable default argument",
                            recommendation="Use immutable types (None, tuple) as defaults instead of mutable types (list, dict, set)",
                            line=node.lineno,
                            score=80,
                        ))
        return smells

class ComplexConditionalsRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.If):
                # Count boolean ops
                bool_op_count = 0
                for child in ast.walk(node.test):
                    if isinstance(child, ast.BoolOp):
                        bool_op_count += len(child.values) - 1
                
                if bool_op_count > 3:
                    smells.append(self.create_smell(
                        smell_type="complex_conditionals",
                        severity="warning",
                        message="Condition is too complex",
                        recommendation="Extract complex conditions into well-named variables or methods",
                        line=node.lineno,
                        score=60,
                    ))
        return smells

class GlobalVariablesRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        tree = parsed_code["tree"]

        for node in ast.walk(tree):
            if isinstance(node, ast.Global):
                for name in node.names:
                    smells.append(self.create_smell(
                        smell_type="global_variables",
                        severity="warning",
                        message=f"Use of global variable '{name}'",
                        recommendation="Avoid global variables. Pass variables as arguments or encapsulate in a class",
                        line=node.lineno,
                        score=70,
                    ))
        return smells

class UnusedVariablesRule(CodeSmellRule):
    def check(self, parsed_code: Dict[str, Any]) -> List[Dict]:
        smells = []
        
        # We can use the variables dict from parser
        variables = parsed_code.get("variables", [])
        tree = parsed_code["tree"]
        
        # Collect all Name reads
        reads = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                reads.add(node.id)
                
        # Check against assigned variables (naive approach)
        assigned = set([v["name"] for v in variables])
        unused = assigned - reads
        
        for var in variables:
            if var["name"] in unused and var["name"] != "_":
                smells.append(self.create_smell(
                    smell_type="unused_variables",
                    severity="info",
                    message=f"Variable '{var['name']}' is assigned but never used",
                    recommendation="Remove the unused variable or use it",
                    line=var["lineno"],
                    score=30,
                ))
        return smells
