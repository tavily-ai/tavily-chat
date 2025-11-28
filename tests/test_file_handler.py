"""Tests for backend/file_handler.py"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from pathlib import Path
from backend.file_handler import save_uploaded_file


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_uploaded_file_txt():
    """Test saving a text file."""
    mock_file = Mock()
    mock_file.filename = "test.txt"
    mock_file.read = AsyncMock(return_value=b"Test content")

    with patch('aiofiles.open', create=True) as mock_open:
        mock_aiofile = AsyncMock()
        mock_aiofile.__aenter__.return_value.write = AsyncMock()
        mock_open.return_value = mock_aiofile

        result = await save_uploaded_file(mock_file)

        assert result["filename"] == "test.txt"
        assert result["content"] == "Test content"
        assert "uploads/test.txt" in result["path"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_uploaded_file_invalid_type():
    """Test saving a file with invalid extension."""
    mock_file = Mock()
    mock_file.filename = "test.exe"

    with pytest.raises(ValueError, match="Unsupported file type"):
        await save_uploaded_file(mock_file)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_uploaded_file_pdf():
    """Test saving a PDF file."""
    mock_file = Mock()
    mock_file.filename = "test.pdf"
    mock_file.read = AsyncMock(return_value=b"%PDF-1.4\nTest PDF content")

    with patch('aiofiles.open', create=True) as mock_open:
        mock_aiofile = AsyncMock()
        mock_aiofile.__aenter__.return_value.write = AsyncMock()
        mock_open.return_value = mock_aiofile

        with patch('PyPDF2.PdfReader') as mock_pdf_reader:
            mock_reader = Mock()
            mock_page = Mock()
            mock_page.extract_text.return_value = "Extracted PDF text"
            mock_reader.pages = [mock_page]
            mock_pdf_reader.return_value = mock_reader

            result = await save_uploaded_file(mock_file)

            assert result["filename"] == "test.pdf"
            assert "Extracted PDF text" in result["content"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_uploaded_file_markdown():
    """Test saving a markdown file."""
    mock_file = Mock()
    mock_file.filename = "test.md"
    mock_file.read = AsyncMock(return_value=b"# Markdown content\n\nTest")

    with patch('aiofiles.open', create=True) as mock_open:
        mock_aiofile = AsyncMock()
        mock_aiofile.__aenter__.return_value.write = AsyncMock()
        mock_open.return_value = mock_aiofile

        result = await save_uploaded_file(mock_file)

        assert result["filename"] == "test.md"
        assert "Markdown content" in result["content"]
