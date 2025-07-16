import logging
import os
import sys
from pathlib import Path

import weave
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

sys.path.append(str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.ERROR, format="%(message)s")
import json
from contextlib import asynccontextmanager

import requests
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain.schema import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.graph import CompiledGraph
from pydantic import BaseModel

from backend.agent import WebAgent
from backend.prompts import REASONING_PROMPT, SIMPLE_PROMPT
from backend.utils import check_api_key

load_dotenv()

nano = ChatOpenAI(
    model="gpt-4.1-nano", api_key=os.getenv("OPENAI_API_KEY")
).with_config({"tags": ["streaming"]})

kimik2 = ChatGroq(
    model="moonshotai/kimi-k2-instruct", api_key=os.getenv("GROQ_API_KEY")
).with_config({"tags": ["streaming"]})


@asynccontextmanager
async def lifespan(app: FastAPI):

    checkpointer = MemorySaver()
    agent = WebAgent(checkpointer=checkpointer)
    app.state.agent = agent
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("VITE_APP_URL")] if os.getenv("VITE_APP_URL") else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_agent():
    return {
        "agent": app.state.agent,
    }


class AgentRequest(BaseModel):
    input: str
    thread_id: str
    agent_type: str


@app.get("/")
async def ping():
    return {"message": "Alive"}


@app.post("/stream_agent")
async def stream_agent(
    body: AgentRequest,
    fastapi_request: Request,
    agent: CompiledGraph = Depends(get_agent),
):
    api_key = fastapi_request.headers.get("Authorization")
    try:
        # Check authorization before proceeding
        check_api_key(api_key=api_key)

    except requests.exceptions.HTTPError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=e.response.json()
        )
    if body.agent_type == "fast":
        agent_runnable = agent["agent"].build_graph(
            api_key=api_key, llm=nano, prompt=SIMPLE_PROMPT
        )
        print("Fast agent running")
    elif body.agent_type == "deep":
        agent_runnable = agent["agent"].build_graph(
            api_key=api_key, llm=kimik2, prompt=REASONING_PROMPT
        )
        print("Deep agent running")
    else:
        raise HTTPException(status_code=400, detail="Invalid agent type")

    async def event_generator():
        config = {"configurable": {"thread_id": body.thread_id}}
        weave.op()
        async for event in agent_runnable.astream_events(
            input={"messages": [HumanMessage(content=body.input)]},
            config=config,
        ):
            # Filter for chat model streaming events
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"]
                # Check if the chunk has content
                if hasattr(content, "content") and content.content:
                    print(content.content, end="", flush=True)
                    yield (
                        json.dumps(
                            {
                                "type": "chatbot",
                                "content": content.content,
                            }
                        )
                        + "\n"
                    )

            elif event["event"] == "on_tool_start":
                tool_name = event.get("name", "unknown_tool")
                tool_input = event["data"].get("input", {})

                # Safely serialize tool input
                try:
                    if isinstance(tool_input, dict):
                        # Extract just the query or main parameters
                        serializable_input = {k: str(v) for k, v in tool_input.items()}
                    else:
                        serializable_input = str(tool_input)
                except:
                    serializable_input = "Unable to serialize input"

                yield (
                    json.dumps(
                        {
                            "type": "tool_start",
                            "tool_name": tool_name,
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
                        # Handle ToolMessage objects
                        serializable_output = str(tool_output.content)
                    elif isinstance(tool_output, dict):
                        serializable_output = {
                            k: str(v) for k, v in tool_output.items()
                        }
                    elif isinstance(tool_output, list):
                        serializable_output = [str(item) for item in tool_output]
                    else:
                        serializable_output = str(tool_output)
                except:
                    serializable_output = "Unable to serialize output"

                yield (
                    json.dumps(
                        {
                            "type": "tool_end",
                            "tool_name": tool_name,
                            "content": serializable_output,
                        }
                    )
                    + "\n"
                )

    return StreamingResponse(event_generator(), media_type="application/json")


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080)
