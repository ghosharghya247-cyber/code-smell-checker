import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.detectors.python import PythonDetector

def test_new_python_rules():
    detector = PythonDetector()
    
    code = """
global_var = 1

def complex_func(x, y, z):
    global global_var
    unused = 5
    if x > 0 and y > 0 and z > 0 and x + y > z:
        return True
    return False
    """
    
    result = detector.detect(code)
    smell_types = [s["type"] for s in result["smells"]]
    
    assert "complex_conditionals" in smell_types, "complex_conditionals not detected"
    assert "global_variables" in smell_types, "global_variables not detected"
    assert "unused_variables" in smell_types, "unused_variables not detected"

if __name__ == '__main__':
    test_new_python_rules()
    print("Rule tests passed!")
