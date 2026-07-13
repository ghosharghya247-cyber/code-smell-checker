from tree_sitter import Language, Parser
from typing import Any, Dict, List
from app.parsers.base import BaseParser


class JavaScriptParser(BaseParser):
    def __init__(self):
        try:
            self.language = Language("./node_modules/tree-sitter-javascript/tree-sitter-javascript.so", "javascript")
        except:
            self.language = Language("./node_modules/tree-sitter-javascript/tree-sitter-javascript.so", "tsx")
        self.parser = Parser()
        self.parser.set_language(self.language)

    def parse(self, code: str) -> Dict[str, Any]:
        try:
            tree = self.parser.parse(code.encode("utf-8"))
            return {
                "tree": tree,
                "code": code,
                "functions": self.get_functions(tree),
                "variables": self.get_variables(tree),
            }
        except Exception as e:
            raise ValueError(f"Error parsing JavaScript code: {e}")

    def get_functions(self, tree: Any) -> List[Dict]:
        functions = []
        self._traverse_tree(tree.root_node, functions, "function")
        return functions

    def get_variables(self, tree: Any) -> List[Dict]:
        variables = []
        self._traverse_tree(tree.root_node, variables, "variable")
        return variables

    def _traverse_tree(self, node: Any, collection: List, node_type: str) -> None:
        if node_type == "function" and node.type in ["function_declaration", "arrow_function", "function"]:
            collection.append({
                "lineno": node.start_point[0] + 1,
                "end_lineno": node.end_point[0] + 1,
                "node": node,
            })
        elif node_type == "variable" and node.type in ["variable_declarator", "identifier"]:
            collection.append({
                "lineno": node.start_point[0] + 1,
                "node": node,
            })

        for child in node.children:
            self._traverse_tree(child, collection, node_type)
