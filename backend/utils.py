import requests
from requests.exceptions import RequestException

TAVILY_API_ENDPOINT = "https://api.tavily.com"


def check_api_key(api_key: str) -> bool:
    """
    Check if the API key is authorized for the given use case

    Args:
        api_key: The API key to check

    Returns:
        bool: True if authorized
    """
    try:
        payload = {"api_key": api_key, "use_case": "chat"}

        response = requests.post(
            f"{TAVILY_API_ENDPOINT}/authorize-use-case", json=payload
        )

        response.raise_for_status()

        result = response.json()

        if not result.get("success"):
            raise requests.exceptions.HTTPError("Authorization failed")

        return True

    except requests.exceptions.HTTPError:
        raise
    except RequestException:
        raise
