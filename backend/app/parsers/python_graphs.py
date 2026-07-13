import ast
from typing import Dict, List, Set, Any, Optional

class Scope:
    def __init__(self, name: str, parent: Optional['Scope'] = None):
        self.name = name
        self.parent = parent
        self.symbols: Set[str] = set()
        self.children: List['Scope'] = []

    def add_symbol(self, name: str):
        self.symbols.add(name)

    def resolve(self, name: str) -> bool:
        if name in self.symbols:
            return True
        if self.parent:
            return self.parent.resolve(name)
        return False

class SymbolTableVisitor(ast.NodeVisitor):
    def __init__(self):
        self.global_scope = Scope("global")
        self.current_scope = self.global_scope
        self.scopes: Dict[ast.AST, Scope] = {None: self.global_scope}

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.current_scope.add_symbol(node.name)
        func_scope = Scope(node.name, parent=self.current_scope)
        self.current_scope.children.append(func_scope)
        self.current_scope = func_scope
        self.scopes[node] = func_scope
        
        for arg in node.args.args:
            self.current_scope.add_symbol(arg.arg)
            
        self.generic_visit(node)
        self.current_scope = self.current_scope.parent

    def visit_ClassDef(self, node: ast.ClassDef):
        self.current_scope.add_symbol(node.name)
        class_scope = Scope(node.name, parent=self.current_scope)
        self.current_scope.children.append(class_scope)
        self.current_scope = class_scope
        self.scopes[node] = class_scope
        
        self.generic_visit(node)
        self.current_scope = self.current_scope.parent

    def visit_Assign(self, node: ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.current_scope.add_symbol(target.id)
        self.generic_visit(node)

class CallGraphVisitor(ast.NodeVisitor):
    def __init__(self):
        self.call_graph: Dict[str, List[str]] = {}
        self.current_context = "global"

    def visit_FunctionDef(self, node: ast.FunctionDef):
        prev_context = self.current_context
        self.current_context = node.name
        if self.current_context not in self.call_graph:
            self.call_graph[self.current_context] = []
        self.generic_visit(node)
        self.current_context = prev_context

    def visit_Call(self, node: ast.Call):
        callee = None
        if isinstance(node.func, ast.Name):
            callee = node.func.id
        elif isinstance(node.func, ast.Attribute):
            callee = node.func.attr
        
        if callee:
            if self.current_context not in self.call_graph:
                self.call_graph[self.current_context] = []
            self.call_graph[self.current_context].append(callee)
            
        self.generic_visit(node)

class BasicCFGNode:
    def __init__(self, name: str):
        self.name = name
        self.successors: List['BasicCFGNode'] = []

class ControlFlowVisitor(ast.NodeVisitor):
    def __init__(self):
        self.entry = BasicCFGNode("entry")
        self.current_node = self.entry
        self.nodes = [self.entry]
        self.complexity = 1

    def new_node(self, name: str) -> BasicCFGNode:
        node = BasicCFGNode(name)
        self.nodes.append(node)
        return node

    def visit_If(self, node: ast.If):
        self.complexity += 1
        if_node = self.new_node(f"If_{node.lineno}")
        self.current_node.successors.append(if_node)
        
        # Then branch
        self.current_node = if_node
        for stmt in node.body:
            self.visit(stmt)
        then_end = self.current_node
        
        # Else branch
        self.current_node = if_node
        if node.orelse:
            for stmt in node.orelse:
                self.visit(stmt)
        else_end = self.current_node
        
        merge_node = self.new_node(f"Merge_If_{node.lineno}")
        then_end.successors.append(merge_node)
        else_end.successors.append(merge_node)
        self.current_node = merge_node

    def visit_For(self, node: ast.For):
        self.complexity += 1
        for_node = self.new_node(f"For_{node.lineno}")
        self.current_node.successors.append(for_node)
        
        self.current_node = for_node
        for stmt in node.body:
            self.visit(stmt)
        
        self.current_node.successors.append(for_node) # Loop back
        merge_node = self.new_node(f"Merge_For_{node.lineno}")
        for_node.successors.append(merge_node)
        self.current_node = merge_node

    def visit_While(self, node: ast.While):
        self.complexity += 1
        while_node = self.new_node(f"While_{node.lineno}")
        self.current_node.successors.append(while_node)
        
        self.current_node = while_node
        for stmt in node.body:
            self.visit(stmt)
            
        self.current_node.successors.append(while_node)
        merge_node = self.new_node(f"Merge_While_{node.lineno}")
        while_node.successors.append(merge_node)
        self.current_node = merge_node
