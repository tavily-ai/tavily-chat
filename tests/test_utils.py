"""Tests for backend/utils.py"""
import pytest
import requests
from unittest.mock import patch, Mock
from backend.utils import check_api_key


@pytest.mark.unit
def test_check_api_key_valid():
    """Test API key validation with valid key."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "authorized"}
        mock_get.return_value = mock_response

        # Should not raise an exception
        check_api_key("valid-api-key")

        # Verify the request was made correctly
        mock_get.assert_called_once()
        assert "valid-api-key" in str(mock_get.call_args)


@pytest.mark.unit
def test_check_api_key_invalid():
    """Test API key validation with invalid key."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": "Unauthorized"}
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        mock_get.return_value = mock_response

        with pytest.raises(requests.exceptions.HTTPError):
            check_api_key("invalid-api-key")


@pytest.mark.unit
def test_check_api_key_network_error():
    """Test API key validation with network error."""
    with patch('requests.get') as mock_get:
        mock_get.side_effect = requests.exceptions.ConnectionError("Network error")

        with pytest.raises(requests.exceptions.ConnectionError):
            check_api_key("any-api-key")


@pytest.mark.unit
def test_check_api_key_none():
    """Test API key validation with None."""
    with patch('requests.get') as mock_get:
        check_api_key(None)
        # Should still make the request even with None
        mock_get.assert_called_once()
