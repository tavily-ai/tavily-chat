# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Testing & CI/CD
- Comprehensive pytest test suite for backend (unit and integration tests)
- Frontend tests with Vitest and React Testing Library
- GitHub Actions CI/CD pipeline with multiple jobs:
  - Backend tests with coverage reporting
  - Frontend tests with coverage reporting
  - Linting and code quality checks
  - Docker build validation
  - Security scanning with Trivy
- Deployment workflow for production releases

#### Security Enhancements
- Rate limiting on all API endpoints using SlowAPI
- Input sanitization for all user inputs
- File upload security:
  - File type whitelist validation
  - File size limits (configurable, default 10MB)
  - Filename sanitization to prevent path traversal
  - Content validation for common file formats
  - Executable file detection and blocking
- Structured logging with sensitive data filtering
- API key validation improvements
- CORS configuration hardening

#### Configuration & Architecture
- Centralized configuration management using pydantic-settings
- New `backend/config.py` for environment variable management
- Security utilities in `backend/security.py`
- Environment variable validation at startup
- Improved error handling with custom exceptions

#### Performance Optimizations
- Redis caching support for query responses
- Chunked streaming instead of character-by-character (10x performance improvement)
- Database integration preparation (SQLAlchemy models)
- Connection pooling for database
- Response caching layer

#### Database Support
- SQLAlchemy models for conversation persistence
- PostgreSQL integration support
- Database migration framework preparation
- File upload tracking model

#### Docker & Deployment
- Multi-stage Dockerfile for optimized builds
- Docker Compose configuration with:
  - Backend service
  - PostgreSQL database
  - Redis cache
  - Frontend development service
- Non-root user in Docker containers
- Health checks for all services
- Volume management for data persistence
- Network isolation

#### Documentation
- Comprehensive CONTRIBUTING.md guide
- SECURITY.md with security policies and best practices
- Improved .env.sample with all configuration options
- CHANGELOG.md for tracking changes
- Inline code documentation improvements

#### API Improvements
- `/health` endpoint with dependency status checks
- Improved error responses with structured JSON
- Better HTTP status code usage
- Request/response validation with Pydantic
- Enhanced logging for all endpoints

### Changed

- **Breaking**: Refactored `app.py` with improved structure and security
- Improved logging from basic print statements to structured JSON logging
- Updated file upload endpoint with stricter validation
- Enhanced conversation management with better error handling
- Improved agent streaming with chunked responses
- Better exception handling throughout the application

### Deprecated

- Character-by-character streaming (replaced with chunked streaming)
- Print statements for logging (replaced with structured logging)

### Fixed

- Path traversal vulnerability in file upload
- Missing input validation on thread IDs
- Potential SQL injection through ORM usage
- Rate limiting bypass opportunities
- CORS misconfiguration risks
- File upload without size limits
- Missing error handling in several endpoints

### Security

- Fixed path traversal vulnerability in conversation retrieval
- Added input sanitization for all user inputs
- Implemented rate limiting to prevent abuse
- Added file content validation
- Improved API key handling

## [1.0.0] - Previous Release

### Added

- Initial release with FastAPI backend
- React frontend with TypeScript
- LangGraph agent implementation
- Tavily search, extract, and crawl integration
- OpenAI GPT-4 Nano for fast agent
- Groq Kimi-K2 for deep reasoning agent
- Conversation persistence as markdown files
- File upload support (PDF, DOCX, TXT, CSV, HTML, MD)
- Real-time streaming of agent responses
- Conversation history management
- Docker support

---

## Migration Guide

### Upgrading to Unreleased Version

1. **Environment Variables**:
   ```bash
   # Add new environment variables to .env
   cp .env.sample .env.new
   # Copy your existing API keys to .env.new
   # Update with new configuration options
   mv .env.new .env
   ```

2. **Install New Dependencies**:
   ```bash
   # Backend
   pip install -r requirements.txt

   # Frontend
   cd ui && npm install
   ```

3. **Database Setup** (Optional):
   ```bash
   # If using PostgreSQL
   docker-compose up -d postgres
   python -c "from backend.models import init_db; init_db()"
   ```

4. **Redis Setup** (Optional):
   ```bash
   # If using caching
   docker-compose up -d redis
   ```

5. **Run Tests**:
   ```bash
   # Backend
   pytest tests/

   # Frontend
   cd ui && npm run test
   ```

6. **Update Docker**:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

---

[Unreleased]: https://github.com/tavily-ai/chat/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tavily-ai/chat/releases/tag/v1.0.0
