"""Tests for backend/agent.py"""
import pytest
from unittest.mock import Mock, patch
from backend.agent import WebAgent, create_output_summarizer


@pytest.mark.unit
def test_web_agent_initialization(mock_checkpointer):
    """Test WebAgent initialization."""
    agent = WebAgent(checkpointer=mock_checkpointer)
    assert agent.checkpointer == mock_checkpointer


@pytest.mark.unit
def test_web_agent_build_graph_no_api_key(mock_checkpointer, mock_llm):
    """Test build_graph raises error without API key."""
    agent = WebAgent(checkpointer=mock_checkpointer)

    with pytest.raises(ValueError, match="Tavily API key not provided"):
        agent.build_graph(
            api_key=None,
            llm=mock_llm,
            prompt="Test prompt",
            summary_llm=mock_llm,
            user_message="Test message"
        )


@pytest.mark.unit
def test_web_agent_build_graph_with_api_key(mock_checkpointer, mock_llm):
    """Test build_graph creates agent with valid API key."""
    agent = WebAgent(checkpointer=mock_checkpointer)

    with patch('backend.agent.create_react_agent') as mock_create_agent:
        mock_create_agent.return_value = Mock()

        result = agent.build_graph(
            api_key="test-api-key",
            llm=mock_llm,
            prompt="Test prompt",
            summary_llm=mock_llm,
            user_message="Test message"
        )

        # Verify create_react_agent was called
        mock_create_agent.assert_called_once()
        call_kwargs = mock_create_agent.call_args[1]
        assert call_kwargs["prompt"] == "Test prompt"
        assert call_kwargs["model"] == mock_llm
        assert len(call_kwargs["tools"]) == 3  # search, extract, crawl


@pytest.mark.unit
def test_create_output_summarizer(mock_llm):
    """Test output summarizer creation."""
    summarizer = create_output_summarizer(mock_llm)

    # Test with valid JSON output
    test_output = '{"results": [{"url": "https://example.com", "favicon": "https://example.com/fav.ico", "raw_content": "Test content"}]}'
    result = summarizer(test_output, "Test user message")

    assert "summary" in result
    assert "urls" in result
    assert result["urls"] == ["https://example.com"]


@pytest.mark.unit
def test_output_summarizer_empty_output(mock_llm):
    """Test output summarizer with empty output."""
    summarizer = create_output_summarizer(mock_llm)

    result = summarizer("", "Test message")

    assert result["summary"] == ""
    assert result["urls"] == []


@pytest.mark.unit
def test_output_summarizer_invalid_json(mock_llm):
    """Test output summarizer with invalid JSON."""
    summarizer = create_output_summarizer(mock_llm)

    result = summarizer("Not valid JSON", "Test message")

    assert result["summary"] == "Not valid JSON"
    assert result["urls"] == []


@pytest.mark.unit
def test_output_summarizer_list_format(mock_llm):
    """Test output summarizer with list format."""
    summarizer = create_output_summarizer(mock_llm)

    test_output = '[{"url": "https://test.com", "favicon": "https://test.com/fav.ico", "raw_content": "Content"}]'
    result = summarizer(test_output, "Test message")

    assert "urls" in result
    assert result["urls"] == ["https://test.com"]
