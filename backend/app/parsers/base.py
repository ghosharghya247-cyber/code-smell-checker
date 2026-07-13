from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseParser(ABC):
    @abstractmethod
    def parse(self, code: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_functions(self, tree: Any) -> List[Dict]:
        pass

    @abstractmethod
    def get_variables(self, tree: Any) -> List[Dict]:
        pass
