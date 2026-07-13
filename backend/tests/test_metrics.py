import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.detectors.python import PythonDetector

def test_metrics():
    detector = PythonDetector()
    
    code = """
def math_func(a, b):
    if a > b:
        return a + b
    elif a == b:
        return a * b
    else:
        return a - b
    """
    
    result = detector.detect(code)
    metrics = result.get("metrics")
    
    assert metrics is not None, "Metrics should be calculated"
    assert metrics["loc"] == 8, f"Expected 8 LOC, got {metrics['loc']}"
    assert metrics["cyclomatic_complexity"] >= 3, "Expected complexity to be >= 3"
    assert "halstead_volume" in metrics, "Missing Halstead metrics"
    assert "maintainability_index" in metrics, "Missing MI"

if __name__ == '__main__':
    test_metrics()
    print("Metrics tests passed!")
