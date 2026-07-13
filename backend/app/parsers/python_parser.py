import ast
from typing import Any, Dict, List
from app.parsers.base import BaseParser
from app.parsers.python_graphs import SymbolTableVisitor, CallGraphVisitor, ControlFlowVisitor


class PythonParser(BaseParser):
    def parse(self, code: str) -> Dict[str, Any]:
        try:
            tree = ast.parse(code)
            
            # Generate advanced analysis graphs
            sym_table_visitor = SymbolTableVisitor()
            sym_table_visitor.visit(tree)
            
            call_graph_visitor = CallGraphVisitor()
            call_graph_visitor.visit(tree)
            
            cfg_visitor = ControlFlowVisitor()
            cfg_visitor.visit(tree)

            return {
                "tree": tree,
                "code": code,
                "functions": self.get_functions(tree),
                "variables": self.get_variables(tree),
                "imports": self.get_imports(tree),
                "call_graph": call_graph_visitor.call_graph,
                "symbol_table": sym_table_visitor,
                "complexity": cfg_visitor.complexity,
            }
        except SyntaxError as e:
            raise ValueError(f"Syntax error in Python code: {e}")

    def get_functions(self, tree: ast.AST) -> List[Dict]:
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    "name": node.name,
                    "lineno": node.lineno,
                    "end_lineno": node.end_lineno,
                    "args_count": len(node.args.args),
                    "lines_of_code": (node.end_lineno or 0) - (node.lineno or 0),
                    "node": node,
                })
        return functions

    def get_variables(self, tree: ast.AST) -> List[Dict]:
        variables = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        variables.append({
                            "name": target.id,
                            "lineno": node.lineno,
                        })
        return variables

    def get_imports(self, tree: ast.AST) -> List[Dict]:
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "type": "import",
                        "name": alias.name,
                        "lineno": node.lineno,
                    })
            elif isinstance(node, ast.ImportFrom):
                imports.append({
                    "type": "from_import",
                    "module": node.module,
                    "names": [alias.name for alias in node.names],
                    "lineno": node.lineno,
                })
        return imports
