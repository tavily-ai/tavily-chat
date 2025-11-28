"""Pytest configuration and fixtures."""
import os
import pytest
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient
from langgraph.checkpoint.memory import MemorySaver


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing."""
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("VITE_APP_URL", "http://localhost:5173")


@pytest.fixture
def mock_checkpointer():
    """Mock MemorySaver checkpointer."""
    return MemorySaver()


@pytest.fixture
def mock_llm():
    """Mock LLM for testing."""
    llm = Mock()
    llm.invoke = Mock(return_value=Mock(content="Mocked summary"))
    return llm


@pytest.fixture
async def mock_tavily_response():
    """Mock Tavily API response."""
    return {
        "results": [
            {
                "url": "https://example.com",
                "favicon": "https://example.com/favicon.ico",
                "raw_content": "Example content",
                "title": "Example Title"
            }
        ]
    }


@pytest.fixture
def app_client(mock_env_vars):
    """Create test client for FastAPI app."""
    # Import here to ensure env vars are set
    from app import app
    return TestClient(app)


@pytest.fixture
def sample_conversation():
    """Sample conversation data for testing."""
    return {
        "thread_id": "test-thread-123",
        "question": "What is the weather today?",
        "answer": "The weather is sunny with a high of 75°F.",
        "turn_number": 1
    }
