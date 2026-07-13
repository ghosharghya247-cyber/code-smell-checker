import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.parsers.python_parser import PythonParser

def test_python_parser_advanced_graphs():
    code = """
def helper(x):
    return x + 1

class MyClass:
    def method_a(self, y):
        if y > 0:
            return helper(y)
        for i in range(5):
            helper(i)
        return y
    """
    
    parser = PythonParser()
    result = parser.parse(code)
    
    # 1. Test Call Graph
    call_graph = result.get("call_graph", {})
    assert "method_a" in call_graph, "method_a not in call graph"
    assert "helper" in call_graph["method_a"], "helper not called by method_a"
    assert "range" in call_graph["method_a"], "range not called by method_a"
    
    # 2. Test Complexity (Control Flow)
    complexity = result.get("complexity", 1)
    # entry (1) + if (1) + for (1) = 3
    assert complexity >= 3, f"Expected complexity >= 3, got {complexity}"
    
    # 3. Test Symbol Table
    symbol_table = result.get("symbol_table")
    assert symbol_table is not None, "Symbol table is missing"
    
    # helper and MyClass should be in global scope
    assert symbol_table.global_scope.resolve("helper") is True, "helper missing from global scope"
    assert symbol_table.global_scope.resolve("MyClass") is True, "MyClass missing from global scope"

if __name__ == '__main__':
    test_python_parser_advanced_graphs()
    print("All tests passed!")
