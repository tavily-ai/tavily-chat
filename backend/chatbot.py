import logging
import os
from datetime import datetime
from typing import Annotated

from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from tavily import TavilyClient
from typing_extensions import TypedDict

from .prompts import CHATBOT, DEFAULT_SYSTEM_PROMPT, ROUTER, TAVILY
from .utils import format_documents_for_llm, parse_messages, tavily_results_to_documents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class State(TypedDict):
    messages: Annotated[list, add_messages]
    search_results: Annotated[list, add_messages]
    response: str


class SimpleChatbot:
    def __init__(
        self,
        model_name: str = "gpt-4o",
        checkpointer: MemorySaver = None,
    ):
        self.llm = ChatOpenAI(model=model_name)
        self.router_chain = ROUTER | self.llm
        self.tavily_chain = TAVILY | self.llm.with_config({"tags": ["chatbot"]})
        self.chatbot_chain = CHATBOT | self.llm.with_config({"tags": ["chatbot"]})
        self.system_prompt = DEFAULT_SYSTEM_PROMPT.format(
            current_date=datetime.now().strftime("%Y-%m-%d")
        )
        self.checkpointer = checkpointer
        self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    def router(self, state: State):
        dispatch_custom_event("router", "routing...")
        messages = parse_messages(state)
        router_response = self.router_chain.invoke({"conversation": messages})
        route_decision = router_response.content.strip()
        return {"router_decision": route_decision}

    def tavily_node(self, state: State):
        dispatch_custom_event("tavily_status", "searching the web...")

        messages = parse_messages(state, num_messages=30)
        search_results = self.tavily_client.search(query=messages, auto_parameters=True)

        documents = tavily_results_to_documents(search_results)
        formatted_results = format_documents_for_llm(documents)
        dispatch_custom_event(
            "auto_tavily_parameters", search_results["auto_parameters"]
        )
        dispatch_custom_event("tavily_results", search_results["results"])

        response = self.tavily_chain.invoke(
            {
                "system_prompt": self.system_prompt,
                "search_results": formatted_results,
                "messages": messages,
            }
        )
        return {"messages": [response]}

    def chatbot_node(self, state: State):
        dispatch_custom_event("chatbot_response", "thinking...")
        messages = parse_messages(state, num_messages=30)
        response = self.chatbot_chain.invoke(
            {"system_prompt": self.system_prompt, "messages": messages}
        )
        return {"messages": [response]}

    def build_graph(self):
        """Build and compile the graph"""
        graph_builder = StateGraph(State)

        # Add router node
        graph_builder.add_node("router", self.router)

        # Add tavily node
        graph_builder.add_node("tavily", self.tavily_node)

        # Add chatbot node
        graph_builder.add_node("chatbot", self.chatbot_node)

        # Add edges
        graph_builder.add_edge(START, "router")

        def determine_route(output):
            return output["router_decision"].strip()

        graph_builder.add_conditional_edges(
            "router",
            determine_route,
            {"tavily": "tavily", "chatbot": "chatbot"},
        )

        graph_builder.add_edge("tavily", END)
        graph_builder.add_edge("chatbot", END)

        compiled_graph = graph_builder.compile(checkpointer=self.checkpointer)
        return compiled_graph
