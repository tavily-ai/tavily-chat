import logging
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.ERROR, format="%(message)s")
import json
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.graph import CompiledGraph
from pydantic import BaseModel

from backend.chatbot import SimpleChatbot

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    in_memory_checkpointer = MemorySaver()
    simple_chatbot = SimpleChatbot(checkpointer=in_memory_checkpointer)
    app.state.agent = simple_chatbot.build_graph()
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


@app.get("/")
async def ping():
    return {"message": "Alive"}


@app.post("/stream_agent")
async def stream_agent(
    body: AgentRequest,
    agent: CompiledGraph = Depends(get_agent),
):
    agent_runnable = agent["agent"]

    formatted_input = {"messages": [HumanMessage(content=body.input)]}

    async def event_generator():
        config = {"configurable": {"thread_id": body.thread_id}}

        async for event in agent_runnable.astream_events(
            input=formatted_input,
            config=config,
        ):
            kind = event["event"]
            tags = event.get("tags", [])

            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if "chatbot" in tags:
                    yield (
                        json.dumps(
                            {
                                "type": "chatbot",
                                "content": content,
                            }
                        )
                        + "\n"
                    )
            elif kind == "on_custom_event":
                if event["name"] in [
                    "tavily_results",
                    "tavily_status",
                    "router",
                    "auto_tavily_parameters",
                ]:
                    yield (
                        json.dumps(
                            {
                                "type": event["name"],
                                "content": event["data"],
                            }
                        )
                        + "\n"
                    )

    return StreamingResponse(event_generator(), media_type="application/json")


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080)
