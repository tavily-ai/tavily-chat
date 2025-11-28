"""Security utilities for input validation and sanitization."""
import re
from typing import Any
from fastapi import HTTPException, UploadFile
from backend.config import settings


class InputSanitizer:
    """Sanitize and validate user inputs."""

    @staticmethod
    def sanitize_text(text: str, max_length: int = 10000) -> str:
        """
        Sanitize text input by removing potentially dangerous characters.

        Args:
            text: Input text to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized text

        Raises:
            HTTPException: If input is invalid
        """
        if not text:
            raise HTTPException(status_code=400, detail="Input text cannot be empty")

        if len(text) > max_length:
            raise HTTPException(
                status_code=400,
                detail=f"Input text too long. Maximum {max_length} characters allowed",
            )

        # Remove null bytes and control characters except newlines/tabs
        sanitized = re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]", "", text)

        # Trim excessive whitespace
        sanitized = re.sub(r"\s+", " ", sanitized)

        return sanitized.strip()

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent path traversal attacks.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename

        Raises:
            HTTPException: If filename is invalid
        """
        if not filename:
            raise HTTPException(status_code=400, detail="Filename cannot be empty")

        # Remove path separators and null bytes
        sanitized = re.sub(r'[/\\:\x00]', "", filename)

        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip(". ")

        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit(".", 1) if "." in sanitized else (sanitized, "")
            sanitized = name[:250] + (f".{ext}" if ext else "")

        if not sanitized:
            raise HTTPException(status_code=400, detail="Invalid filename")

        return sanitized

    @staticmethod
    def validate_thread_id(thread_id: str) -> str:
        """
        Validate thread ID format.

        Args:
            thread_id: Thread identifier

        Returns:
            Validated thread ID

        Raises:
            HTTPException: If thread ID is invalid
        """
        if not thread_id:
            raise HTTPException(status_code=400, detail="Thread ID cannot be empty")

        # Allow alphanumeric, hyphens, and underscores
        if not re.match(r"^[a-zA-Z0-9_-]+$", thread_id):
            raise HTTPException(
                status_code=400,
                detail="Thread ID can only contain alphanumeric characters, hyphens, and underscores",
            )

        if len(thread_id) > 100:
            raise HTTPException(
                status_code=400, detail="Thread ID too long. Maximum 100 characters"
            )

        return thread_id


class FileValidator:
    """Validate uploaded files."""

    @staticmethod
    async def validate_file(file: UploadFile) -> None:
        """
        Validate uploaded file for security.

        Args:
            file: Uploaded file to validate

        Raises:
            HTTPException: If file is invalid or unsafe
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        # Check file extension
        file_ext = "." + file.filename.rsplit(".", 1)[-1].lower()
        if file_ext not in settings.allowed_file_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(settings.allowed_file_extensions)}",
            )

        # Check file size
        max_size = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes
        contents = await file.read()
        file_size = len(contents)

        # Reset file position after reading
        await file.seek(0)

        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
            )

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        # Check for executable content in filename
        dangerous_patterns = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".dll", ".so"]
        if any(pattern in file.filename.lower() for pattern in dangerous_patterns):
            raise HTTPException(
                status_code=400, detail="Executable files are not allowed"
            )

    @staticmethod
    def validate_file_content(content: bytes, filename: str) -> None:
        """
        Validate file content for common malware signatures.

        Args:
            content: File content bytes
            filename: Original filename

        Raises:
            HTTPException: If content appears malicious
        """
        # Check for executable headers
        if content.startswith(b"MZ") or content.startswith(b"\x7fELF"):
            raise HTTPException(
                status_code=400, detail="Executable files are not allowed"
            )

        # Check PDF files start with PDF header
        if filename.endswith(".pdf") and not content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Invalid PDF file")


def sanitize_dict(data: dict[str, Any], max_depth: int = 5) -> dict[str, Any]:
    """
    Recursively sanitize dictionary values.

    Args:
        data: Dictionary to sanitize
        max_depth: Maximum recursion depth

    Returns:
        Sanitized dictionary
    """
    if max_depth <= 0:
        return {}

    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = InputSanitizer.sanitize_text(value, max_length=5000)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value, max_depth - 1)
        elif isinstance(value, (int, float, bool)):
            sanitized[key] = value
        elif isinstance(value, list):
            sanitized[key] = [
                (
                    InputSanitizer.sanitize_text(item, max_length=5000)
                    if isinstance(item, str)
                    else item
                )
                for item in value[:100]  # Limit array size
            ]

    return sanitized
