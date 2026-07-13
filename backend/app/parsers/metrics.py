import ast
from typing import Dict, Any, List
import math

class MetricsCalculator:
    def __init__(self, parsed_data: Dict[str, Any]):
        self.parsed_data = parsed_data
        self.tree = parsed_data.get("tree")
        
    def calculate(self) -> Dict[str, Any]:
        if not self.tree:
            return {}
            
        loc = self._calculate_loc()
        complexity = self.parsed_data.get("complexity", 1)
        halstead = self._calculate_halstead()
        
        # Maintainability Index (simplified formula)
        # MI = max(0, (171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)) * 100 / 171)
        volume = halstead.get("volume", 0)
        
        mi = 100.0
        if volume > 0 and loc > 0:
            mi_raw = 171 - 5.2 * math.log(volume) - 0.23 * complexity - 16.2 * math.log(loc)
            mi = max(0.0, (mi_raw * 100) / 171)
            
        # Fan-out: Number of unique functions called
        call_graph = self.parsed_data.get("call_graph", {})
        fan_out = sum(len(set(calls)) for calls in call_graph.values())
        
        return {
            "loc": loc,
            "cyclomatic_complexity": complexity,
            "halstead_volume": round(volume, 2),
            "halstead_difficulty": round(halstead.get("difficulty", 0), 2),
            "maintainability_index": round(mi, 2),
            "fan_out": fan_out
        }
        
    def _calculate_loc(self) -> int:
        code = self.parsed_data.get("code", "")
        # Logical lines of code (non-empty, non-comment)
        lines = code.split('\n')
        lloc = 0
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                lloc += 1
        return lloc
        
    def _calculate_halstead(self) -> Dict[str, float]:
        operators = set()
        operands = set()
        N1 = 0 # Total operators
        N2 = 0 # Total operands
        
        for node in ast.walk(self.tree):
            if isinstance(node, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Eq, ast.NotEq, ast.Lt, ast.Gt, ast.And, ast.Or, ast.Not)):
                operators.add(type(node).__name__)
                N1 += 1
            elif isinstance(node, ast.Name):
                operands.add(node.id)
                N2 += 1
            elif isinstance(node, ast.Constant):
                operands.add(str(node.value))
                N2 += 1
                
        n1 = len(operators)
        n2 = len(operands)
        
        N = N1 + N2
        n = n1 + n2
        
        volume = 0
        difficulty = 0
        
        if n > 0:
            volume = N * math.log2(n)
        if n2 > 0:
            difficulty = (n1 / 2) * (N2 / n2)
            
        return {
            "volume": volume,
            "difficulty": difficulty
        }
