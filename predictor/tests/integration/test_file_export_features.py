"""
Integration tests for file-based feature export pipeline
"""
import pytest
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from predictor.file_export_features import FileFeatureExporter


@pytest.mark.integration
class TestFileExportPipeline:
    """Test complete file-based export pipeline"""

    @pytest.fixture
    def exporter(self):
        """Create FileFeatureExporter instance"""
        return FileFeatureExporter()

    @pytest.fixture
    def sample_excel_file(self, tmp_path):
        """Create a dummy Excel file for testing"""
        data = {
            'InvoiceNo': ['536365', '536365', '536366'],
            'StockCode': ['85123A', '71053', '22752'],
            'Description': ['WHITE HANGING HEART T-LIGHT HOLDER', 'WHITE METAL LANTERN', 'SET 7 BABUSHKA NESTING BOXES'],
            'Quantity': [6, 6, 2],
            'InvoiceDate': ['2010-12-01 08:26:00', '2010-12-01 08:26:00', '2010-12-01 08:28:00'],
            'UnitPrice': [2.55, 3.39, 7.65],
            'CustomerID': ['17850', '17850', '17850'],
            'Country': ['United Kingdom', 'United Kingdom', 'France']
        }
        df = pd.DataFrame(data)
        file_path = tmp_path / "Online Retail.xlsx"
        df.to_excel(file_path, index=False)
        return str(file_path)

    def test_export_features_from_file(
            self,
            exporter,
            temp_data_dir,
            sample_excel_file
    ):
        """Test exporting features from an Excel file"""
        output_path = temp_data_dir / "features_from_file.csv"

        exporter.exportFeatures(
            inputFile=sample_excel_file,
            outputCsv=str(output_path),
            batchSize=10
        )

        # Verify output exists
        assert output_path.exists()

        df = pd.read_csv(output_path)

        # Verify basic structure
        assert len(df) > 0
        assert 'productId' in df.columns
        assert 'snapshotDate' in df.columns
        assert 'sales7d' in df.columns
        assert 'stockout14d' in df.columns
