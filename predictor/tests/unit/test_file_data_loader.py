"""
Unit tests for FileDataLoader
"""
import pytest
import pandas as pd
from unittest.mock import patch
from predictor.file_data_loader import FileDataLoader


class TestFileDataLoader:
    """Test FileDataLoader functionality"""

    @pytest.fixture
    def file_data_loader(self):
        """Fixture for FileDataLoader"""
        return FileDataLoader()

    def test_load_from_file_success(self, file_data_loader, tmp_path):
        """Test successful loading from a file"""
        # Create a dummy Excel file
        data = {'col1': [1, 2], 'col2': ['A', 'B']}
        df = pd.DataFrame(data)
        file_path = tmp_path / "test.xlsx"
        df.to_excel(file_path, index=False)

        loaded_df = file_data_loader.load_from_file(str(file_path))

        pd.testing.assert_frame_equal(loaded_df, df)

    def test_load_from_file_not_found(self, file_data_loader):
        """Test loading from a non-existent file"""
        with pytest.raises(FileNotFoundError):
            file_data_loader.load_from_file("non_existent_file.xlsx")

    def test_load_from_file_invalid_format(self, file_data_loader, tmp_path):
        """Test loading from a file with invalid format"""
        # Create a dummy text file
        file_path = tmp_path / "test.txt"
        file_path.write_text("this is not an excel file")

        with pytest.raises(Exception):  # pandas will raise an exception for invalid format
            file_data_loader.load_from_file(str(file_path))
