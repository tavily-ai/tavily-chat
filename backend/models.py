"""Database models for conversation persistence."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.config import settings

Base = declarative_base()


class Conversation(Base):
    """Model for storing conversation history."""

    __tablename__ = "conversations"

    id = Column(String(100), primary_key=True)
    thread_id = Column(String(100), index=True, nullable=False)
    turn_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    agent_type = Column(String(20), nullable=True)
    uploaded_files = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Conversation(thread_id={self.thread_id}, turn={self.turn_number})>"

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "thread_id": self.thread_id,
            "turn_number": self.turn_number,
            "question": self.question,
            "answer": self.answer,
            "agent_type": self.agent_type,
            "uploaded_files": self.uploaded_files,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FileUpload(Base):
    """Model for tracking uploaded files."""

    __tablename__ = "file_uploads"

    id = Column(String(100), primary_key=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    thread_id = Column(String(100), index=True, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<FileUpload(filename={self.filename})>"

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "filename": self.filename,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "thread_id": self.thread_id,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


# Database setup
def get_engine():
    """Create database engine."""
    if not settings.database_url:
        return None

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )


def get_session_maker():
    """Create session maker."""
    engine = get_engine()
    if not engine:
        return None

    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables."""
    engine = get_engine()
    if engine:
        Base.metadata.create_all(bind=engine)


# Dependency for getting DB session
def get_db():
    """Get database session."""
    SessionLocal = get_session_maker()
    if not SessionLocal:
        return None

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
