# CLAUDE.md - Developer Guide for AI Assistants

## Project Overview

This is the **Tavily Chat Web Agent** - a conversational AI agent with real-time web access capabilities. The project demonstrates building a ReAct agent that can intelligently route questions, perform web searches, extract content, and crawl websites using Tavily's API.

### Key Technologies
- **Backend**: Python 3.11, FastAPI, LangGraph, LangChain
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **AI/LLM**: OpenAI (GPT-4.1-nano), Groq (Kimi-K2)
- **Web Tools**: Tavily (Search, Extract, Crawl)
- **Observability**: Weave integration

## Architecture

### Backend Architecture (`backend/`)
The backend implements a ReAct agent pattern with three main components:

1. **Agent (`backend/agent.py`)**
   - `WebAgent` class: Orchestrates the LangGraph workflow
   - Uses `create_react_agent` from LangGraph prebuilt
   - Wraps Tavily tools with summarization capabilities
   - Implements `create_output_summarizer()` for processing tool outputs
   - Tools: TavilySearch, TavilyExtract, TavilyCrawl

2. **Prompts (`backend/prompts.py`)**
   - `REASONING_PROMPT`: For complex queries requiring multi-step reasoning
   - `SIMPLE_PROMPT`: For straightforward queries
   - Customizable prompt templates for agent behavior

3. **Server (`app.py`)**
   - FastAPI application with CORS support
   - Streaming responses via `/stream_agent` endpoint
   - Conversation management (save, list, get, delete)
   - File upload support for document processing
   - Uses `MemorySaver` for conversation checkpointing

4. **Utilities**
   - `backend/utils.py`: API key validation
   - `backend/response_handler.py`: Conversation persistence
   - `backend/file_handler.py`: Document upload handling

### Frontend Architecture (`ui/`)
- **React + TypeScript**: Type-safe component architecture
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first styling
- **Streaming UI**: Real-time display of agent reasoning steps
- **Markdown Support**: Rich text rendering with `react-markdown`
- **Citations**: Displays web sources with favicons

## Development Setup

### Backend Setup
```bash
# Create and activate virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
python3.11 -m pip install -r requirements.txt

# Set up environment variables (see below)

# Run server from project root
python app.py
```

### Frontend Setup
```bash
cd ui
npm install
npm run dev  # Starts on http://localhost:5173
```

### Environment Variables

**Root `.env`:**
```bash
TAVILY_API_KEY="your-tavily-api-key"
OPENAI_API_KEY="your-openai-api-key"
GROQ_API_KEY="your-groq-api-key"
VITE_APP_URL=http://localhost:5173
```

**`ui/.env`:**
```bash
VITE_BACKEND_URL=http://localhost:8080
```

## Key Files and Their Purpose

### Backend Files
- `app.py` (312 lines): FastAPI server, routing, streaming logic
- `backend/agent.py` (153 lines): Core agent logic, tool wrapping, summarization
- `backend/prompts.py`: System prompts for agent behavior
- `backend/response_handler.py`: Conversation persistence layer
- `backend/file_handler.py`: Document upload and processing
- `backend/utils.py`: Helper functions, API key validation

### Frontend Files
- `ui/src/`: React components and application logic
- `ui/index.html`: Entry point
- `ui/vite.config.ts`: Vite configuration
- `ui/tailwind.config.js`: TailwindCSS configuration
- `ui/tsconfig.json`: TypeScript configuration

## Common Development Tasks

### Modifying Agent Behavior
1. Edit prompts in `backend/prompts.py`
2. Adjust tool configurations in `backend/agent.py` (lines 87-101)
3. Modify summarization logic in `create_output_summarizer()` (lines 15-62)

### Adding New Tools
1. Import the tool in `backend/agent.py`
2. Initialize in `build_graph()` method
3. Add to tools list when calling `create_react_agent()` (line 147)
4. Optionally wrap with summarization logic

### Changing LLM Models
Modify the model initialization in `app.py`:
```python
nano = ChatOpenAI(model="gpt-4.1-nano", api_key=os.getenv("OPENAI_API_KEY"))
kimik2 = ChatGroq(model="moonshotai/kimi-k2-instruct", api_key=os.getenv("GROQ_API_KEY"))
```

### Customizing UI
- Components are in `ui/src/`
- Styling uses TailwindCSS utility classes
- Markdown rendering configured in relevant components

### Running Tests
```bash
# Backend (if tests are added)
pytest

# Frontend
cd ui
npm run lint        # Check linting
npm run format      # Format code
```

## API Endpoints

### POST `/stream_agent`
Streams agent execution responses with reasoning steps.

**Request Body:**
```json
{
  "messages": [{"role": "user", "content": "query"}],
  "thread_id": "unique-thread-id"
}
```

**Response:** Server-Sent Events (SSE) stream with agent steps

### Conversation Management
- `POST /save_conversation_turn`: Save conversation history
- `GET /list_conversations`: List all conversations
- `GET /get_conversation/{id}`: Get specific conversation
- `DELETE /delete_conversation/{id}`: Delete conversation

### File Upload
- `POST /upload_file`: Upload documents for processing

## Important Notes for AI Assistants

### Code Style
- Backend: Python type hints, async/await patterns
- Frontend: TypeScript strict mode, functional components
- Use ESLint for frontend (`npm run lint:fix`)
- Use Prettier for formatting (`npm run format`)

### Testing Considerations
- Test with both OpenAI and Groq models
- Validate Tavily API responses
- Test streaming behavior
- Check CORS settings for frontend-backend communication

### Common Gotchas
1. **API Keys**: Must be set in `.env` files before running
2. **CORS**: `VITE_APP_URL` must match frontend dev server
3. **Python Version**: Requires Python 3.11
4. **Port Conflicts**: Backend runs on 8080, frontend on 5173
5. **Streaming**: Response handler removes callback managers to avoid Pydantic issues (lines 107-131 in `agent.py`)

### When Making Changes
1. **Read before modifying**: Always read the full file before making edits
2. **Preserve patterns**: Follow existing code patterns and structure
3. **Test both sides**: Changes to API contracts affect both backend and frontend
4. **Update prompts carefully**: Prompt changes significantly affect agent behavior
5. **Check dependencies**: Keep `requirements.txt` and `package.json` in sync with code

## Extending the Project

### Adding New Data Sources
1. Integrate new tools in `backend/agent.py`
2. Add API keys to `.env`
3. Update prompts to instruct agent when to use new tools

### Customizing Agent Architecture
- Modify `create_react_agent` call or implement custom LangGraph
- Adjust state management and checkpointing
- Add custom nodes and edges to the graph

### Enhancing UI
- Add new React components in `ui/src/`
- Extend Markdown rendering capabilities
- Implement additional visualization for tool outputs

## Resources

- [Tavily Documentation](https://docs.tavily.com)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Documentation](https://python.langchain.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## Contact

For questions or custom implementations:
- Dean Sacoransky: deansa@tavily.com
- Michael Griff: michaelgriff@tavily.com
