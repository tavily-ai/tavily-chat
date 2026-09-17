# Tavily Chat

A simple chat demo with live web research, streaming answers, and visible sources. Built with the Tavily landscape visual system: warm paper, local Suisse fonts, translucent surfaces, and a quiet chat layout.

The default demo needs **one Tavily API key**. It uses Tavily Research `mini` to search, synthesize, and cite answers, with no separate LLM key or database. The original LangGraph implementation remains available in [`app.py`](app.py), [`backend/`](backend), and [`ui/`](ui); see [the LangGraph setup guide](docs/langgraph-example.md).

## Run the chat demo

Requires Node.js 24 or newer.

```bash
git clone https://github.com/tavily-ai/tavily-chat.git
cd tavily-chat
npm ci
cp .env.example .env
# Set TAVILY_API_KEY in .env, or enter a key in the browser.
npm run dev
```

Open **http://127.0.0.1:3000**. Choose a suggested question or type your own. The saved example works without a key.

```bash
# Optional custom port
PORT=4317 npm run dev

# Production build and server
npm run build
npm start

# Tests, no API key or external network calls required
npm test
```

### Container

```bash
docker build -t tavily-chat .
docker run --rm -p 3000:3000 --env-file .env tavily-chat
```

The default `Dockerfile` serves the new Node chat demo on port 3000. The former Python server image is preserved as `Dockerfile.langgraph`, running the original API on port 8080:

```bash
docker build -f Dockerfile.langgraph -t tavily-chat-langgraph .
```

## What the demo shows

- Conversational follow-ups grounded in fresh web research.
- Actual planning, search queries, source discovery, and streamed answer chunks.
- Markdown lists, code blocks, and horizontally scrollable tables.
- Numbered citation links and a visible source list under each answer.
- Suggested questions, a saved example, stop/retry controls, and new-chat reset.
- A responsive layout, keyboard controls, visible focus states, and reduced-motion support.

Enter sends a message; Shift+Enter inserts a line break. Starting a new chat or refreshing clears the conversation. While an answer is running, use Stop to cancel the local stream.

## How it works

```text
React chat → POST /api/chat → Tavily /research (mini, stream: true)
           ← SSE activity, answer text, sources, completion ←
```

Each request includes the latest question and up to three completed question/answer pairs. Previous assistant text provides conversational context, not verified evidence. The prompt asks Tavily to recheck factual claims, answer concisely, and provide numbered citations. `output_length: "short"` keeps the default experience focused.

The server forwards real upstream events. It does not replay complete responses character by character, generate simulated progress, or require a second model provider. Tavily Research performs its own searches; this demo does not make a separate Search API request.

The final Tavily source list determines citation numbering. Unsafe URLs are removed without shifting remaining citation numbers. If only discovery sources arrive, they are displayed without assigning numbered citations. Citations indicate what the provider cited; the app does not independently verify every claim.

## Configuration

| Setting | Purpose |
| --- | --- |
| `TAVILY_API_KEY` | Optional server-side key. A key entered in the tab overrides it for that request. |
| `PORT` | Server port, default `3000`. |
| `HOST` | Bind address, default `127.0.0.1`; containers use `0.0.0.0`. |
| [`demo.config.mjs`](demo.config.mjs) | Suggested questions, Research model, 4-minute timeout, and input limits. |

A question can contain up to 2,000 characters. The browser retains the conversation only in memory; requests send at most six previous messages. Failed and stopped answers are excluded from follow-up context.

## API

`GET /api/health` returns readiness and whether a server key is configured, never the key itself.

`POST /api/chat` accepts:

```json
{
  "message": "How does that compare with lithium-ion?",
  "history": [
    {"role": "user", "content": "What is a sodium-ion battery?"},
    {"role": "assistant", "content": "A previous completed answer."}
  ],
  "apiKey": "optional-tab-key"
}
```

The response is `text/event-stream` with JSON `data:` payloads. Event types are `activity`, `discovery`, `content`, `sources`, `complete`, and `error`. Disconnecting the browser aborts the upstream HTTP connection. Tavily may already have incurred usage; stopping the local stream does not guarantee cancellation of provider billing.

## Project layout

```text
src/                     New React chat, Markdown citations, shared SSE parser
server/                  Small Node HTTP server and Tavily Research integration
public/                  Tavily assets, local fonts, saved example conversation
test/                    Streaming, context, citations, API, and failure tests
demo.config.mjs          Demo configuration
app.py, backend/, ui/    Original LangGraph agent and its frontend
docs/langgraph-example.md  Original agent setup and architecture
```

The new chat is started with the **root** npm scripts. Running npm scripts inside `ui/` starts the original LangGraph frontend, which uses the original Python backend and provider keys.

## Demo boundaries

- Questions and recent conversation context are sent to Tavily. Keys are held in memory or server environment variables; the app does not store keys or transcripts in browser storage, a database, analytics, or application logs.
- Research calls consume Tavily credits and can take longer than a conventional chat completion. The UI shows search progress while waiting.
- The server applies a request size bound, a short per-IP cooldown, and a two-request concurrency cap. It rejects browser cross-origin requests and renders Markdown without raw HTML or remote images.
- This is a local demo, not a public authenticated service. Put authentication and per-user quotas in front of a deployment that uses a shared server key.
- Saved examples are labeled and dated. Run a live question to refresh time-sensitive information.

## Documentation

- [Tavily Research API](https://docs.tavily.com/documentation/api-reference/endpoint/research)
- [Streaming events](https://docs.tavily.com/documentation/api-reference/endpoint/research-streaming)
- [Tavily usage](https://docs.tavily.com/documentation/api-reference/endpoint/research-usage)
- [Original LangGraph agent](docs/langgraph-example.md)

The original project license remains in [LICENSE](LICENSE). Tavily brand assets are reused from the other Tavily demo projects for this Tavily-branded demo.
