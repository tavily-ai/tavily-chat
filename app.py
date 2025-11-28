"""
Improved FastAPI application with security enhancements, rate limiting, and structured logging.
"""
import logging
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List

import structlog
from langgraph.checkpoint.memory import MemorySaver
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

sys.path.append(str(Path(__file__).parent.parent))

import json
import requests
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.file_handler import save_uploaded_file
from backend.response_handler import (
    save_conversation_turn,
    get_turn_number,
    list_conversations,
    get_conversation_content,
    delete_conversation,
)
from langchain.schema import HumanMessage
from langgraph.graph.state import CompiledStateGraph as CompiledGraph

from backend.agent import WebAgent
from backend.prompts import REASONING_PROMPT, SIMPLE_PROMPT
from backend.utils import check_api_key
from backend.config import settings
from backend.security import InputSanitizer, FileValidator

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize LLMs
nano = ChatOpenAI(
    model="gpt-4.1-nano", api_key=os.getenv("OPENAI_API_KEY")
).with_config({"tags": ["streaming"]})

kimik2 = ChatGroq(
    model="moonshotai/kimi-k2-instruct", api_key=os.getenv("GROQ_API_KEY")
).with_config({"tags": ["streaming"]})

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("application_startup", version="1.0.0")

    # Validate required environment variables
    required_vars = ["TAVILY_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        logger.error("missing_environment_variables", missing=missing)
        raise ValueError(f"Missing required environment variables: {missing}")

    checkpointer = MemorySaver()
    agent = WebAgent(checkpointer=checkpointer)
    app.state.agent = agent
    app.state.limiter = limiter

    logger.info("application_ready")
    yield

    # Shutdown
    logger.info("application_shutdown")


app = FastAPI(
    title="Tavily Chat Agent API",
    description="Conversational agent with real-time web access",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limit exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.vite_app_url] if settings.vite_app_url else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_agent():
    """Dependency to get the agent instance."""
    return {"agent": app.state.agent}


class AgentRequest(BaseModel):
    """Request model for agent interaction."""

    input: str = Field(..., min_length=1, max_length=10000, description="User query")
    thread_id: str = Field(..., min_length=1, max_length=100, description="Thread ID")
    agent_type: str = Field(..., pattern="^(fast|deep)$", description="Agent type")


# Store uploaded file contents per thread (should use Redis in production)
uploaded_file_contents: dict = {}


@app.get("/", tags=["Health"])
@limiter.limit("60/minute")
async def ping(request: Request):
    """Health check endpoint."""
    return JSONResponse(
        content={
            "status": "healthy",
            "message": "Tavily Chat Agent API is running",
            "version": "1.0.0",
        }
    )


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check with dependency status."""
    health_status = {
        "status": "healthy",
        "checks": {
            "agent": "ok",
            "environment": "ok",
        },
    }

    # Check if required env vars are set
    required_vars = ["TAVILY_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        health_status["checks"]["environment"] = f"missing: {missing}"
        health_status["status"] = "degraded"

    return JSONResponse(content=health_status)


@app.get("/conversations", tags=["Conversations"])
@limiter.limit("30/minute")
async def get_conversations(request: Request):
    """Get list of all saved conversations."""
    try:
        conversations = list_conversations()
        logger.info("conversations_listed", count=len(conversations))
        return {"conversations": conversations}
    except Exception as e:
        logger.exception("error_listing_conversations", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list conversations",
        )


@app.get("/conversations/{filename}", tags=["Conversations"])
@limiter.limit("30/minute")
async def get_conversation(filename: str, request: Request):
    """Get content of a specific conversation."""
    try:
        # Sanitize filename to prevent path traversal
        safe_filename = InputSanitizer.sanitize_filename(filename)

        content = get_conversation_content(safe_filename)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        logger.info("conversation_retrieved", filename=safe_filename)
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("error_retrieving_conversation", error=str(e), filename=filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation",
        )


@app.delete("/conversations/{filename}", tags=["Conversations"])
@limiter.limit("20/minute")
async def remove_conversation(filename: str, request: Request):
    """Delete a conversation."""
    try:
        safe_filename = InputSanitizer.sanitize_filename(filename)

        success = delete_conversation(safe_filename)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        logger.info("conversation_deleted", filename=safe_filename)
        return {"message": "Deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("error_deleting_conversation", error=str(e), filename=filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation",
        )


@app.post("/upload", tags=["Files"])
@limiter.limit("10/minute")
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    """Upload and process files with security validation."""
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 files allowed per upload",
        )

    results = []
    for file in files:
        try:
            # Validate file
            await FileValidator.validate_file(file)

            result = await save_uploaded_file(file)

            # Store content for later use in chat
            uploaded_file_contents[result["filename"]] = result["content"]
            results.append(result)

            logger.info(
                "file_uploaded",
                filename=result["filename"],
                size=len(result["content"]),
            )
        except HTTPException:
            raise
        except ValueError as e:
            logger.error("file_validation_error", error=str(e), filename=file.filename)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )
        except Exception as e:
            logger.exception("file_upload_error", error=str(e), filename=file.filename)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing {file.filename}: {str(e)}",
            )

    return {"uploaded": results}


@app.post("/stream_agent", tags=["Agent"])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def stream_agent(
    body: AgentRequest,
    fastapi_request: Request,
    agent: CompiledGraph = Depends(get_agent),
):
    """Stream agent responses with security validation."""
    api_key = fastapi_request.headers.get("Authorization")

    # Sanitize inputs
    try:
        safe_input = InputSanitizer.sanitize_text(body.input)
        safe_thread_id = InputSanitizer.validate_thread_id(body.thread_id)
    except HTTPException as e:
        logger.warning(
            "input_validation_failed",
            error=e.detail,
            thread_id=body.thread_id,
        )
        raise

    # Check authorization
    try:
        check_api_key(api_key=api_key)
    except requests.exceptions.HTTPError as e:
        logger.error(
            "api_key_validation_failed",
            status_code=e.response.status_code if e.response else None,
        )
        raise HTTPException(
            status_code=e.response.status_code if e.response else 401,
            detail="Invalid API key" if not e.response else e.response.json(),
        )

    # Build agent based on type
    if body.agent_type == "fast":
        agent_runnable = agent["agent"].build_graph(
            api_key=api_key,
            llm=nano,
            prompt=SIMPLE_PROMPT,
            summary_llm=nano,
            user_message=safe_input,
        )
        logger.info("agent_started", agent_type="fast", thread_id=safe_thread_id)
    elif body.agent_type == "deep":
        agent_runnable = agent["agent"].build_graph(
            api_key=api_key,
            llm=kimik2,
            prompt=REASONING_PROMPT,
            summary_llm=nano,
            user_message=safe_input,
        )
        logger.info("agent_started", agent_type="deep", thread_id=safe_thread_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid agent type"
        )

    async def event_generator():
        config = {"configurable": {"thread_id": safe_thread_id}}
        operation_counter = 0
        events_with_content = []

        try:
            async for event in agent_runnable.astream_events(
                input={"messages": [HumanMessage(content=safe_input)]},
                config=config,
            ):
                # Collect events with content
                if event["event"] == "on_chat_model_stream":
                    content = event["data"]["chunk"]
                    if hasattr(content, "content") and content.content:
                        langgraph_step = event.get("metadata", {}).get(
                            "langgraph_step", 0
                        )
                        events_with_content.append(
                            {
                                "content": content.content,
                                "langgraph_step": langgraph_step,
                                "event_type": "chat_model_stream",
                            }
                        )

                elif event["event"] == "on_tool_start":
                    tool_name = event.get("name", "unknown_tool")
                    tool_input = event["data"].get("input", {})

                    # Safely serialize tool input
                    try:
                        if isinstance(tool_input, dict):
                            serializable_input = {k: str(v) for k, v in tool_input.items()}
                        else:
                            serializable_input = str(tool_input)
                    except Exception:
                        serializable_input = "Unable to serialize input"

                    # Determine tool type
                    tool_type = "search"
                    if tool_name and "extract" in tool_name:
                        tool_type = "extract"
                    elif tool_name and "crawl" in tool_name:
                        tool_type = "crawl"

                    yield (
                        json.dumps(
                            {
                                "type": "tool_start",
                                "tool_name": tool_name,
                                "tool_type": tool_type,
                                "operation_index": operation_counter,
                                "content": serializable_input,
                            }
                        )
                        + "\n"
                    )

                elif event["event"] == "on_tool_end":
                    tool_name = event.get("name", "unknown_tool")
                    tool_output = event["data"].get("output")

                    # Safely serialize tool output
                    try:
                        if hasattr(tool_output, "content"):
                            serializable_output = str(tool_output.content)
                        elif isinstance(tool_output, dict):
                            serializable_output = {
                                k: str(v) for k, v in tool_output.items()
                            }
                        elif isinstance(tool_output, list):
                            serializable_output = [str(item) for item in tool_output]
                        else:
                            serializable_output = str(tool_output)
                    except Exception:
                        serializable_output = "Unable to serialize output"

                    # Determine tool type
                    tool_type = "search"
                    if tool_name and "extract" in tool_name:
                        tool_type = "extract"
                    elif tool_name and "crawl" in tool_name:
                        tool_type = "crawl"

                    yield (
                        json.dumps(
                            {
                                "type": "tool_end",
                                "tool_name": tool_name,
                                "tool_type": tool_type,
                                "operation_index": operation_counter,
                                "content": serializable_output,
                            }
                        )
                        + "\n"
                    )
                    operation_counter += 1

            # Stream final response in chunks instead of char-by-char
            if events_with_content:
                max_step = max(event["langgraph_step"] for event in events_with_content)

                final_content = ""
                for event in events_with_content:
                    if event["langgraph_step"] == max_step:
                        final_content += event["content"]

                # Extract final answer
                final_answer = ""
                lines = final_content.split("\n")

                in_final_answer = False
                for line in lines:
                    if "Final Answer:" in line:
                        in_final_answer = True
                        final_answer += line.replace("Final Answer:", "").strip() + "\n"
                    elif in_final_answer and line.strip():
                        final_answer += line + "\n"
                    elif in_final_answer and not line.strip():
                        break

                if not final_answer.strip():
                    filtered_response = ""
                    for line in lines:
                        if not any(
                            pattern in line
                            for pattern in [
                                "Thought:",
                                "Action:",
                                "Action Input:",
                                "Observation:",
                            ]
                        ):
                            filtered_response += line + "\n"
                    final_answer = filtered_response.strip()
                else:
                    final_answer = final_answer.strip()

                if final_content:
                    # Stream in chunks of 10 characters for better performance
                    CHUNK_SIZE = 10
                    for i in range(0, len(final_answer), CHUNK_SIZE):
                        chunk = final_answer[i : i + CHUNK_SIZE]
                        yield (
                            json.dumps({"type": "chatbot", "content": chunk}) + "\n"
                        )

                    # Save conversation
                    try:
                        turn_number = get_turn_number(safe_thread_id)
                        uploaded_files_list = (
                            list(uploaded_file_contents.keys())
                            if uploaded_file_contents
                            else None
                        )
                        await save_conversation_turn(
                            thread_id=safe_thread_id,
                            question=safe_input,
                            answer=final_answer,
                            turn_number=turn_number,
                            uploaded_files=uploaded_files_list,
                        )

                        logger.info(
                            "conversation_saved",
                            thread_id=safe_thread_id,
                            turn_number=turn_number,
                        )
                    except Exception as e:
                        logger.exception(
                            "error_saving_conversation",
                            error=str(e),
                            thread_id=safe_thread_id,
                        )

        except Exception as e:
            logger.exception(
                "agent_execution_error",
                error=str(e),
                thread_id=safe_thread_id,
                agent_type=body.agent_type,
            )
            yield (
                json.dumps(
                    {
                        "type": "error",
                        "content": "An error occurred while processing your request",
                    }
                )
                + "\n"
            )

    return StreamingResponse(event_generator(), media_type="application/json")


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080, log_config=None)
