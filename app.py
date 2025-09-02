import logging
import os
import sys
from pathlib import Path

from langgraph.checkpoint.memory import MemorySaver

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
from langgraph.graph.state import CompiledStateGraph as CompiledGraph
from pydantic import BaseModel

from backend.agent import WebAgent
from backend.prompts import REASONING_PROMPT, SIMPLE_PROMPT
from backend.utils import check_api_key
from redis import Redis
try:
    from langgraph.checkpoint.redis import AsyncRedisSaver as RedisCheckpointSaver
except Exception:
    RedisCheckpointSaver = None

load_dotenv()


REDIS_URI = "redis://default:Di49bXLlNk4R5veC3YfKFNuhu99W8wLw@redis-18621.c100.us-east-1-4.ec2.redns.redis-cloud.com:18621"

nano = ChatOpenAI(
    model="gpt-4.1-nano", api_key=os.getenv("OPENAI_API_KEY")
).with_config({"tags": ["streaming"]})

kimik2 = ChatGroq(
    model="moonshotai/kimi-k2-instruct", api_key=os.getenv("GROQ_API_KEY")
).with_config({"tags": ["streaming"]})

# Connect to your Redis instance
# redis_client = Redis(host="localhost", port=6379, db=0)

"""
Use async Redis checkpointer when available; otherwise fall back to in-memory.
This avoids NotImplementedError on aget_tuple during async streaming.
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with RedisCheckpointSaver.from_conn_string(REDIS_URI) as checkpointer:
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
            api_key=api_key, llm=nano, prompt=SIMPLE_PROMPT, summary_llm=nano, user_message=body.input
        )
        print("Fast agent running")
    elif body.agent_type == "deep":
        agent_runnable = agent["agent"].build_graph(
            api_key=api_key, llm=kimik2, prompt=REASONING_PROMPT, summary_llm=nano, user_message=body.input
        )
        print("Deep agent running")
    else:
        raise HTTPException(status_code=400, detail="Invalid agent type")

    async def event_generator():
        config = {"configurable": {"thread_id": body.thread_id}}
        operation_counter = 0
        events_with_content = []  # List to store events with their content and langgraph step

        async for event in agent_runnable.astream_events(
            input={"messages": [HumanMessage(content=body.input)]},
            config=config,
        ):
 
            # Collect events with content and their langgraph step
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"]
                if hasattr(content, "content") and content.content:
                    # Get langgraph step from metadata
                    langgraph_step = event.get("metadata", {}).get("langgraph_step", 0)
                    events_with_content.append({
                        "content": content.content,
                        "langgraph_step": langgraph_step,
                        "event_type": "chat_model_stream"
                    })

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

                # Determine tool type from tool name
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
                print(f"Tool start: {tool_name} {tool_type} {operation_counter}")

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

                # Determine tool type from tool name
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
                            "operation_index": operation_counter,  # Match with start event
                            "content": serializable_output,
                        }
                    )
                    + "\n"
                )
                print(f"Tool end: {tool_name} {tool_type} {operation_counter}")
                operation_counter += 1

        # After all events are processed, stream the final agent response
        if events_with_content:
            # Find the maximum langgraph step
            max_step = max(event["langgraph_step"] for event in events_with_content)
            
            # Collect content only from events with the maximum step
            final_content = ""
            for event in events_with_content:
                if event["langgraph_step"] == max_step:
                    final_content += event["content"]
            
            # Filter out internal thoughts and only keep the final answer
            # Look for "Final Answer:" section and extract only that
            final_answer = ""
            lines = final_content.split('\n')
            
            # Extract final answer if it exists
            in_final_answer = False
            for line in lines:
                if "Final Answer:" in line:
                    in_final_answer = True
                    final_answer += line.replace("Final Answer:", "").strip() + "\n"
                elif in_final_answer and line.strip():
                    final_answer += line + "\n"
                elif in_final_answer and not line.strip():
                    break
            
            # If no "Final Answer:" section found, use the entire response
            # but filter out obvious internal thought patterns
            if not final_answer.strip():
                filtered_response = ""
                lines = final_content.split('\n')
                
                for line in lines:
                    # Skip internal thought patterns
                    if not any(pattern in line for pattern in ["Thought:", "Action:", "Action Input:", "Observation:"]):
                        filtered_response += line + "\n"
                
                final_answer = filtered_response.strip()
            else:
                final_answer = final_answer.strip()

            if final_content:
                # Yield each character one at a time
                for char in final_answer:
                    yield (
                        json.dumps(
                            {
                                "type": "chatbot",
                                "content": char,
                            }
                        )
                        + "\n"
                    )

    return StreamingResponse(event_generator(), media_type="application/json")


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080)