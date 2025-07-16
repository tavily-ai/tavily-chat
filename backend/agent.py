import logging

from langchain_openai import ChatOpenAI
from langchain_tavily import TavilyCrawl, TavilyExtract, TavilySearch
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
import weave

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebAgent:
    def __init__(
        self,
        checkpointer: MemorySaver = None,
    ):
        self.checkpointer = checkpointer
        self.weave_client = weave.init("tavily-agent-demo")

    def build_graph(self, api_key: str, llm: ChatOpenAI, prompt: str):
        """
        Build and compile the LangGraph workflow.
        """
        if not api_key:
            raise ValueError("Error: Tavily API key not provided.")

        # Create the tools with the API key
        search = TavilySearch(
            max_results=10,
            topic="general",
            api_key=api_key,
            include_favicon=True,
        )

        extract = TavilyExtract(
            extract_depth="advanced",
            api_key=api_key,
            include_favicon=True,
        )

        crawl = TavilyCrawl(api_key=api_key, include_favicon=True)

        return create_react_agent(
            prompt=prompt,
            model=llm,
            tools=[search, extract, crawl],
            checkpointer=self.checkpointer,
        )
