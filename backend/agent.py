import logging
import os

from langchain_openai import ChatOpenAI
from langchain_tavily import TavilyCrawl, TavilyExtract, TavilySearch
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from .prompts import PROMPT

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebAgent:
    def __init__(
        self,
    ):
        self.llm = ChatOpenAI(
            model="gpt-4.1-nano", api_key=os.getenv("OPENAI_API_KEY")
        ).with_config({"tags": ["streaming"]})

        # Define the LangChain search tool
        self.search = TavilySearch(
            max_results=10, topic="general", api_key=os.getenv("TAVILY_API_KEY")
        )

        # Define the LangChain extract tool
        self.extract = TavilyExtract(
            extract_depth="advanced", api_key=os.getenv("TAVILY_API_KEY")
        )
        # Define the LangChain crawl tool
        self.crawl = TavilyCrawl(api_key=os.getenv("TAVILY_API_KEY"))
        self.prompt = PROMPT
        self.checkpointer = MemorySaver()

    def build_graph(self):
        """
        Build and compile the LangGraph workflow.
        """
        return create_react_agent(
            prompt=self.prompt,
            model=self.llm,
            tools=[self.search, self.extract, self.crawl],
            checkpointer=self.checkpointer,
        )


# --- Example Usage (for reference) ---
if __name__ == "__main__":
    agent = WebAgent()
    compiled_agent = agent.build_graph()
    # Example state
    from langchain.schema import HumanMessage

    # Test the web agent
    inputs = {"messages": [HumanMessage(content="who is the ceo of tavily?")]}
    # Stream the web agent's response
    for s in compiled_agent.stream(inputs, stream_mode="values"):
        message = s["messages"][-1]
        if isinstance(message, tuple):
            print(message)
        else:
            message.pretty_print()
