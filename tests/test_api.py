"""Integration tests for FastAPI endpoints."""
import pytest
from unittest.mock import patch, Mock, AsyncMock
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_ping_endpoint(app_client):
    """Test the ping endpoint."""
    response = app_client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Alive"}


@pytest.mark.integration
def test_get_conversations_empty(app_client):
    """Test getting conversations when none exist."""
    with patch('backend.response_handler.list_conversations') as mock_list:
        mock_list.return_value = []

        response = app_client.get("/conversations")
        assert response.status_code == 200
        assert response.json() == {"conversations": []}


@pytest.mark.integration
def test_get_conversations_with_data(app_client):
    """Test getting conversations with existing data."""
    with patch('backend.response_handler.list_conversations') as mock_list:
        mock_list.return_value = [
            {"filename": "conv1.md", "title": "Test 1"},
            {"filename": "conv2.md", "title": "Test 2"}
        ]

        response = app_client.get("/conversations")
        assert response.status_code == 200
        assert len(response.json()["conversations"]) == 2


@pytest.mark.integration
def test_get_conversation_not_found(app_client):
    """Test getting a conversation that doesn't exist."""
    with patch('backend.response_handler.get_conversation_content') as mock_get:
        mock_get.return_value = None

        response = app_client.get("/conversations/nonexistent.md")
        assert response.status_code == 404


@pytest.mark.integration
def test_get_conversation_success(app_client):
    """Test getting a conversation successfully."""
    with patch('backend.response_handler.get_conversation_content') as mock_get:
        mock_get.return_value = "# Conversation content"

        response = app_client.get("/conversations/test.md")
        assert response.status_code == 200
        assert response.json()["content"] == "# Conversation content"


@pytest.mark.integration
def test_delete_conversation_success(app_client):
    """Test deleting a conversation successfully."""
    with patch('backend.response_handler.delete_conversation') as mock_delete:
        mock_delete.return_value = True

        response = app_client.delete("/conversations/test.md")
        assert response.status_code == 200
        assert response.json()["message"] == "Deleted"


@pytest.mark.integration
def test_delete_conversation_not_found(app_client):
    """Test deleting a conversation that doesn't exist."""
    with patch('backend.response_handler.delete_conversation') as mock_delete:
        mock_delete.return_value = False

        response = app_client.delete("/conversations/nonexistent.md")
        assert response.status_code == 404


@pytest.mark.integration
def test_upload_file_invalid_type(app_client):
    """Test uploading a file with invalid type."""
    from io import BytesIO

    files = {"files": ("test.exe", BytesIO(b"content"), "application/octet-stream")}

    with patch('backend.file_handler.save_uploaded_file') as mock_save:
        mock_save.side_effect = ValueError("Unsupported file type")

        response = app_client.post("/upload", files=files)
        assert response.status_code == 400


@pytest.mark.integration
def test_upload_file_success(app_client):
    """Test successful file upload."""
    from io import BytesIO

    files = {"files": ("test.txt", BytesIO(b"test content"), "text/plain")}

    with patch('backend.file_handler.save_uploaded_file') as mock_save:
        mock_save.return_value = {
            "filename": "test.txt",
            "content": "test content",
            "path": "/uploads/test.txt"
        }

        response = app_client.post("/upload", files=files)
        assert response.status_code == 200
        assert len(response.json()["uploaded"]) == 1


@pytest.mark.integration
def test_stream_agent_invalid_agent_type(app_client):
    """Test stream_agent with invalid agent type."""
    with patch('backend.utils.check_api_key'):
        response = app_client.post(
            "/stream_agent",
            json={
                "input": "Test question",
                "thread_id": "test-123",
                "agent_type": "invalid"
            },
            headers={"Authorization": "test-key"}
        )
        assert response.status_code == 400


@pytest.mark.integration
def test_stream_agent_unauthorized(app_client):
    """Test stream_agent without valid API key."""
    import requests

    with patch('backend.utils.check_api_key') as mock_check:
        error_response = Mock()
        error_response.status_code = 401
        error_response.json.return_value = {"error": "Unauthorized"}
        mock_check.side_effect = requests.exceptions.HTTPError(response=error_response)

        response = app_client.post(
            "/stream_agent",
            json={
                "input": "Test question",
                "thread_id": "test-123",
                "agent_type": "fast"
            },
            headers={"Authorization": "invalid-key"}
        )
        assert response.status_code == 401
