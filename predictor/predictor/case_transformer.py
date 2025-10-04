"""
Case transformation utilities for API compatibility
"""
from typing import Any


class CaseTransformer:
    """Transform between camelCase and snake_case"""

    @staticmethod
    def camelToSnake(text: str) -> str:
        """Convert camelCase to snake_case"""
        result = []
        for i, char in enumerate(text):
            if char.isupper() and i > 0:
                result.append('_')
                result.append(char.lower())
            else:
                result.append(char.lower())
        return ''.join(result)

    @staticmethod
    def snakeToCamel(text: str) -> str:
        """Convert snake_case to camelCase"""
        components = text.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])

    @staticmethod
    def transformKeysToSnake(obj: Any) -> Any:
        """Recursively transform object keys to snake_case"""
        if isinstance(obj, dict):
            return {
                CaseTransformer.camelToSnake(k): CaseTransformer.transformKeysToSnake(v)
                for k, v in obj.items()
            }
        elif isinstance(obj, list):
            return [CaseTransformer.transformKeysToSnake(item) for item in obj]
        else:
            return obj

    @staticmethod
    def transformKeysToCamel(obj: Any) -> Any:
        """Recursively transform object keys to camelCase"""
        if isinstance(obj, dict):
            return {
                CaseTransformer.snakeToCamel(k): CaseTransformer.transformKeysToCamel(v)
                for k, v in obj.items()
            }
        elif isinstance(obj, list):
            return [CaseTransformer.transformKeysToCamel(item) for item in obj]
        else:
            return obj
