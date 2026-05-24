import os
from pathlib import Path
from typing import Optional
import aiofiles
from fastapi import UploadFile
import pypdf
import docx

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".csv", ".html"}


async def save_uploaded_file(file: UploadFile) -> dict:
    """Save uploaded file and extract text content."""
    ext = Path(file.filename).suffix.lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    file_path = UPLOAD_DIR / file.filename
    
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    text_content = await extract_text(file_path, ext)
    
    return {
        "filename": file.filename,
        "path": str(file_path),
        "content": text_content,
        "size": len(content)
    }


async def extract_text(file_path: Path, ext: str) -> str:
    """Extract text from various file formats."""
    
    if ext in [".txt", ".md", ".html"]:
        async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
            return await f.read()
    
    elif ext == ".pdf":
        text = ""
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    
    elif ext == ".docx":
        doc = docx.Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    
    elif ext == ".csv":
        async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
            return await f.read()
    
    return ""
