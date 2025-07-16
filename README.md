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

- 🔍 Intelligent question routing between base knowledge and tavily search, extract, and crawl.
- 🧠 Conversational memory with LangGraph
- 🚀 FastAPI backend with async support
- 🔄 Streaming of Agentic Substeps
- 💬 Markdown support in chat responses
- 🔗 Citations for web results
- 👁️ Observability with Weave

## Architecture Diagram
![Chatbot Demo](images/web-agent.svg)

## 📂 Repository Structure

This repository includes everything required to create a functional chatbot with web access:

### 📡 Backend ([`backend/`](./backend))
The core backend logic, powered by Tavily and LangGraph:
- [`agent.py`](./backend/agent.py) – Defines the ReAct agent architecture, state management, and processing nodes.
- [`prompts.py`](./backend/prompts.py) – Contains customizable prompt templates.


### 🌐 Frontend ([`ui/`](./ui))
Interactive React frontend for dynamic user interactions and chatbot responses.

### Server
- [`app.py`](./app.py) – FastAPI server that handles API endpoints and streaming responses.

---

## Setup Instructions

#### Set up environment variables:

   a. Create a `.env` file in the root directory with:
   ```bash
   TAVILY_API_KEY="your-tavily-api-key"
   OPENAI_API_KEY="your-openai-api-key"
   GROQ_API_KEY="your-groq-api-key"
   VITE_APP_URL=http://localhost:5173
   ```

   b. Create a `.env` file in the `ui` directory with:
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

- `POST /stream_agent`: Chat endpoint that handles streamed LangGraph execution

---

## Contributing

Feel free to submit issues and enhancement requests!

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
