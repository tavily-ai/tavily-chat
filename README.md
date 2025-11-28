# Tavily Agent Example

<div align="center">
  <img src="images/chatbot.gif" alt="Tavily Agent Demo" width="800"/>
</div>

## 👋 Welcome to the Tavily Chat Web Agent Repository!

This repository provides a simple yet powerful example of building a conversational agent with real-time web access, leveraging Tavily's search, extract, and crawl capabilities.

Designed for ease of customization, you can extend this core implementation to:
- Integrate proprietary data
- Modify the chatbot architecture
- Modify LLMs

## Features

### Core Functionality
- 🔍 Intelligent question routing between base knowledge and Tavily search, extract, and crawl
- 🧠 Conversational memory with LangGraph
- 🚀 FastAPI backend with async support
- 🔄 Streaming of agentic substeps in real-time
- 💬 Markdown support in chat responses
- 🔗 Citations for web results
- 👁️ Observability with Weave

### Security & Performance
- 🔒 Rate limiting on all API endpoints
- 🛡️ Input sanitization and validation
- 📁 Secure file upload with type and size validation
- ⚡ Redis caching for improved performance
- 🔐 API key validation and secure handling
- 📊 Structured logging with sensitive data filtering

### Testing & Quality
- ✅ Comprehensive test suite (pytest + Vitest)
- 🤖 GitHub Actions CI/CD pipeline
- 📈 Code coverage reporting
- 🔍 Automated linting and code quality checks
- 🔬 Security scanning with Trivy

### DevOps & Deployment
- 🐳 Docker and Docker Compose support
- 🗄️ PostgreSQL database integration
- 🚀 Multi-stage Dockerfile for optimized builds
- 📦 Production-ready deployment configuration
- 💾 Redis caching layer

## Architecture Diagram
![Chatbot Demo](images/web-agent.svg)

## 📂 Repository Structure

This repository includes everything required to create a functional chatbot with web access:

### 📡 Backend ([`backend/`](./backend))
The core backend logic, powered by Tavily and LangGraph:
- [`agent.py`](./backend/agent.py) – Defines the ReAct agent architecture, state management, and processing nodes
- [`prompts.py`](./backend/prompts.py) – Contains customizable prompt templates
- [`config.py`](./backend/config.py) – Centralized configuration management
- [`security.py`](./backend/security.py) – Input sanitization and validation utilities
- [`cache.py`](./backend/cache.py) – Redis caching implementation
- [`models.py`](./backend/models.py) – Database models for conversation persistence
- [`utils.py`](./backend/utils.py) – API key validation and helper functions

### 🌐 Frontend ([`ui/`](./ui))
Interactive React frontend built with TypeScript and Tailwind CSS:
- Modern, responsive UI with real-time streaming
- File upload with drag-and-drop support
- Conversation history management
- Syntax highlighting for code blocks
- Agent type selection (Fast/Deep reasoning)

### Server
- [`app.py`](./app.py) – FastAPI server with security enhancements, rate limiting, and structured logging

### Testing
- [`tests/`](./tests) – Comprehensive test suite for backend (pytest)
- [`ui/src/components/__tests__/`](./ui/src/components/__tests__/) – Frontend component tests (Vitest)

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to get started:

```bash
# Clone the repository
git clone https://github.com/tavily-ai/chat.git
cd chat

# Copy environment file and add your API keys
cp .env.sample .env
# Edit .env with your API keys

# Start all services (backend, frontend, database, cache)
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application at `http://localhost:5173`

### Option 2: Manual Setup

#### 1. Set up environment variables

   a. Create a `.env` file in the root directory:
   ```bash
   cp .env.sample .env
   ```

   Then edit `.env` with your API keys:
   ```bash
   TAVILY_API_KEY="your-tavily-api-key"
   OPENAI_API_KEY="your-openai-api-key"
   GROQ_API_KEY="your-groq-api-key"
   VITE_APP_URL=http://localhost:5173
   ```

   b. Create a `.env` file in the `ui` directory:
   ```bash
   cd ui
   cp .env.sample .env
   ```

   Edit `ui/.env`:
   ```bash
   VITE_BACKEND_URL=http://localhost:8080
   ```

### Backend Setup
#### Python Virtual Environment
1. Create a virtual environment and activate it:
```bash
python3.11 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
python3.11 -m pip install -r requirements.txt
```

3. From the root of the project, run the backend server:
```bash
python app.py
```


### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```
Open the app in your browser at the locally hosted url (e.g. http://localhost:5173/)

## API Endpoints

### Core Endpoints

- `POST /stream_agent` - Stream agent responses with real-time tool execution
- `POST /upload` - Upload files (PDF, DOCX, TXT, CSV, HTML, MD)
- `GET /conversations` - List all saved conversations
- `GET /conversations/{filename}` - Get specific conversation content
- `DELETE /conversations/{filename}` - Delete a conversation

### Health & Monitoring

- `GET /` - Basic health check
- `GET /health` - Detailed health check with dependency status

All endpoints include:
- Rate limiting (configurable per endpoint)
- Input validation and sanitization
- Structured error responses
- Request/response logging

See the [API documentation](./docs/API.md) for detailed information (coming soon).

---

## Testing

### Backend Tests

```bash
# Run all backend tests
pytest tests/

# Run with coverage
pytest tests/ --cov=backend --cov=app --cov-report=html

# Run specific test file
pytest tests/test_agent.py -v
```

### Frontend Tests

```bash
cd ui

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### CI/CD

The project includes GitHub Actions workflows for:
- Automated testing on push/PR
- Code quality checks (linting, formatting, type checking)
- Security scanning
- Docker build validation
- Deployment automation

---

## Security

This project implements multiple security best practices:

- **Input Validation**: All user inputs are sanitized and validated
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **File Upload Security**: Strict file type validation and size limits
- **CORS Protection**: Configured for specific frontend URL only
- **Structured Logging**: No sensitive data in logs
- **Docker Security**: Non-root users, minimal images, health checks

For more information, see [SECURITY.md](./SECURITY.md).

---

## Configuration

All configuration is managed through environment variables. See [.env.sample](./.env.sample) for all available options:

- API keys and credentials
- Security settings (rate limits, file size limits)
- Agent configuration (search depth, result limits)
- Database and caching URLs
- Logging levels

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup instructions
- Code style guidelines
- Testing requirements
- Pull request process
- Commit message conventions

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run tests and linters
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## Documentation

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](./SECURITY.md) - Security best practices and reporting
- [Changelog](./CHANGELOG.md) - Version history and changes
- [Developer Guide](./claude.md) - Detailed guide for AI assistants

---

## Tech Stack

### Backend
- Python 3.11+ with FastAPI
- LangChain & LangGraph for agent orchestration
- OpenAI GPT-4 Nano (fast agent)
- Groq Kimi-K2 (deep reasoning agent)
- Tavily API for web search, extract, and crawl
- PostgreSQL for data persistence (optional)
- Redis for caching (optional)
- SQLAlchemy ORM
- Pydantic for validation

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Markdown for rendering
- Axios for HTTP requests
- Lucide React for icons

### DevOps
- Docker & Docker Compose
- GitHub Actions for CI/CD
- pytest for backend testing
- Vitest for frontend testing
- Ruff & Black for Python linting
- ESLint & Prettier for TypeScript linting

---

## Performance

- **Caching**: Redis-based caching reduces API calls for common queries
- **Streaming**: Chunked response streaming for faster perceived performance
- **Database**: Optional PostgreSQL for scalable conversation storage
- **Connection Pooling**: Efficient database connection management
- **Docker**: Multi-stage builds for minimal image size

---

## Roadmap

- [ ] User authentication and multi-user support
- [ ] Conversation search and filtering
- [ ] Export conversations (PDF, JSON)
- [ ] Custom tool integration
- [ ] Voice input/output
- [ ] Dark mode
- [ ] Mobile app
- [ ] Advanced analytics dashboard

---

## 📞 Contact Us

Have questions, feedback, or looking to build something custom? We'd love to hear from you!

- Email our team directly:
  - [Dean Sacoransky](mailto:deansa@tavily.com)
  - [Michael Griff](mailto:michaelgriff@tavily.com)

---

<div align="center">
  <img src="images/logo_circle.png" alt="Tavily Logo" width="80"/>
  <p>Powered by <a href="https://tavily.com">Tavily</a> - The web API Built for AI Agents</p>
</div>
