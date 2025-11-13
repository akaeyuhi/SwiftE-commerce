"""
Data loading from file utilities
"""
from __future__ import annotations
import logging
import pandas as pd

logger = logging.getLogger(__name__)


class FileDataLoader:
    """Efficient data loading from file"""

    def __init__(self):
        pass

    def load_from_file(self, file_path: str) -> pd.DataFrame:
        """Load data from excel file"""
        try:
            df = pd.read_excel(file_path)
            logger.info(f"Loaded {len(df)} rows from {file_path}")
            return df
        except Exception as e:
            logger.error(f"Failed to load data from {file_path}: {e}")
            raise
