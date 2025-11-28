"""Tests for backend/response_handler.py"""
import pytest
from pathlib import Path
from unittest.mock import patch, mock_open, AsyncMock
from backend.response_handler import (
    save_conversation_turn,
    get_turn_number,
    list_conversations,
    get_conversation_content,
    delete_conversation
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_conversation_turn(sample_conversation):
    """Test saving a conversation turn."""
    with patch('aiofiles.open', create=True) as mock_file:
        mock_aiofile = AsyncMock()
        mock_aiofile.__aenter__.return_value.write = AsyncMock()
        mock_file.return_value = mock_aiofile

        with patch('pathlib.Path.mkdir'):
            await save_conversation_turn(
                thread_id=sample_conversation["thread_id"],
                question=sample_conversation["question"],
                answer=sample_conversation["answer"],
                turn_number=sample_conversation["turn_number"]
            )

            # Verify file was written
            mock_file.assert_called()


@pytest.mark.unit
def test_get_turn_number_new_thread():
    """Test getting turn number for a new thread."""
    with patch('pathlib.Path.exists', return_value=False):
        turn_number = get_turn_number("new-thread")
        assert turn_number == 1


@pytest.mark.unit
def test_get_turn_number_existing_thread():
    """Test getting turn number for existing thread."""
    mock_content = "Συζήτηση 1\n\nΣυζήτηση 2\n"

    with patch('pathlib.Path.exists', return_value=True):
        with patch('builtins.open', mock_open(read_data=mock_content)):
            turn_number = get_turn_number("existing-thread")
            assert turn_number == 3  # Next turn after 2 existing


@pytest.mark.unit
def test_list_conversations_empty():
    """Test listing conversations when directory is empty."""
    with patch('pathlib.Path.exists', return_value=True):
        with patch('pathlib.Path.iterdir', return_value=[]):
            conversations = list_conversations()
            assert conversations == []


@pytest.mark.unit
def test_list_conversations_with_files():
    """Test listing conversations with existing files."""
    mock_file = Mock()
    mock_file.is_file.return_value = True
    mock_file.suffix = '.md'
    mock_file.name = 'test_conversation.md'
    mock_file.stat.return_value.st_mtime = 1234567890

    with patch('pathlib.Path.exists', return_value=True):
        with patch('pathlib.Path.iterdir', return_value=[mock_file]):
            conversations = list_conversations()
            assert len(conversations) == 1
            assert conversations[0]['filename'] == 'test_conversation.md'


@pytest.mark.unit
def test_get_conversation_content_not_found():
    """Test getting conversation content for non-existent file."""
    with patch('pathlib.Path.exists', return_value=False):
        content = get_conversation_content("nonexistent.md")
        assert content is None


@pytest.mark.unit
def test_get_conversation_content_success():
    """Test getting conversation content successfully."""
    mock_content = "# Test Conversation\n\nContent here"

    with patch('pathlib.Path.exists', return_value=True):
        with patch('builtins.open', mock_open(read_data=mock_content)):
            content = get_conversation_content("test.md")
            assert content == mock_content


@pytest.mark.unit
def test_delete_conversation_success():
    """Test deleting a conversation successfully."""
    with patch('pathlib.Path.exists', return_value=True):
        with patch('pathlib.Path.unlink') as mock_unlink:
            result = delete_conversation("test.md")
            assert result is True
            mock_unlink.assert_called_once()


@pytest.mark.unit
def test_delete_conversation_not_found():
    """Test deleting a non-existent conversation."""
    with patch('pathlib.Path.exists', return_value=False):
        result = delete_conversation("nonexistent.md")
        assert result is False
