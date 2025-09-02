import logging
from typing import Callable
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilyCrawl, TavilyExtract, TavilySearch
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
import json
import ast
from mem0 import Memory
import os
from datetime import datetime

REDIS_URI = "redis://default:Di49bXLlNk4R5veC3YfKFNuhu99W8wLw@redis-18621.c100.us-east-1-4.ec2.redns.redis-cloud.com:18621"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if OpenAI API key is set
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY environment variable is not set. Memory functionality may not work properly.")

config = {
     "vector_store": {
         "provider": "redis",
         "config": {
             "collection_name": "mem0",
             "embedding_model_dims": 1536,
             "redis_url": REDIS_URI
         }
     }, 
     "version": "v1.1"
}

# Initialize memory only when needed, not at import time
_memory = None

def get_memory():
    """Get or create memory instance with proper error handling."""
    global _memory
    if _memory is None:
        try:
            if os.getenv("OPENAI_API_KEY"):
                _memory = Memory.from_config(config)
            else:
                logger.warning("Cannot initialize memory without OPENAI_API_KEY")
                _memory = None
        except Exception as e:
            logger.error(f"Failed to initialize memory: {e}")
            _memory = None
    return _memory


def create_output_summarizer(nano_llm: ChatOpenAI) -> Callable[[str, str], dict]:
    def summarize_output(tool_output: str, user_message: str = "") -> dict:
        if not tool_output or tool_output.strip() == "":
            return {"summary": tool_output, "urls": []}

        try:
            parsed_output = json.loads(tool_output)
        except (json.JSONDecodeError, TypeError):
            try:
                parsed_output = ast.literal_eval(tool_output)
            except (ValueError, SyntaxError):
                return {"summary": tool_output, "urls": []}

        # Extract URLs, favicons, and content
        urls = []
        favicons = []
        content = ""
        
        if isinstance(parsed_output, dict) and 'results' in parsed_output:
            items = parsed_output['results']
        elif isinstance(parsed_output, list):
            items = parsed_output
        else:
            return {"summary": tool_output, "urls": [], "favicons": []}
        
        # Extract URLs, favicons and combine content
        for item in items:
            if isinstance(item, dict) and 'url' in item and 'raw_content' in item:
                urls.append(item['url'])
                favicons.append(item['favicon'])
        
        # Generate summary
        summary_prompt = f"""
        Summarize the following content into a relevant format that helps answer the user's question.
        Focus on the key information that would be most useful for answering: {user_message}
        Remove redundant information and highlight the most important findings.
        
        Content:
        {content}
        
        Provide a clear, organized summary that captures the essential information relevant to the user's question:
        """
        
        summary = nano_llm.invoke(summary_prompt).content
        
        return {"summary": summary, "urls": urls, "favicons": favicons}
    
    return summarize_output


class WebAgent:
    def __init__(
        self,
        checkpointer: MemorySaver = None,
    ):
        self.checkpointer = checkpointer
        self.memory = get_memory()

    def build_graph(self, api_key: str, llm: ChatOpenAI, prompt: str, summary_llm: ChatOpenAI, user_message: str = ""):
        """
        Build and compile the LangGraph workflow.
        
        Args:
            api_key: Tavily API key
            llm: Main LLM for the agent
            prompt: System prompt
            summary_llm: LLM for summarizing tool outputs
            user_message: The user's original message for context in summarization
        """
        if not api_key:
            raise ValueError("Error: Tavily API key not provided.")

        # Note: Tools are created directly in the custom classes below
        
        output_summarizer = create_output_summarizer(summary_llm)


        class TavilySearchWithMemory(TavilySearch):
            def _run(self, *args, **kwargs):
                kwargs.pop('run_manager', None)
                result = super()._run(*args, **kwargs)
                timestamp = datetime.now().isoformat()
                self.memory.add(result, metadata={
                    "category": "search", 
                    "input": args[0],
                    "timestamp": timestamp
                })
                return result
        
        class SummarizingTavilyExtract(TavilyExtract):
            def _run(self, *args, **kwargs):
                kwargs.pop('run_manager', None)
                result = super()._run(*args, **kwargs)
                timestamp = datetime.now().isoformat()
                
                # Store summary with URLs and timestamp
                self.memory.add(result, metadata={
                    "category": "extract", 
                    "input": args[0],
                    "urls": result["urls"],
                    "timestamp": timestamp
                })
                return result
        
        class SummarizingTavilyCrawl(TavilyCrawl):
            def _run(self, *args, **kwargs):
                kwargs.pop('run_manager', None)
                result = super()._run(*args, **kwargs)
                summary_data = output_summarizer(str(result), user_message)
                timestamp = datetime.now().isoformat()
                
                # Store summary with URLs and timestamp
                self.memory.add(summary_data["summary"], metadata={
                    "category": "crawl", 
                    "input": args[0],
                    "urls": summary_data["urls"],
                    "timestamp": timestamp
                })
                return summary_data["summary"]

        @tool
        def redis_semantic_memory_retrieval(query: str, url: str = None) -> str:
            """
            Retrieve semantic memory from Redis based on a query and optional URL.
            
            Args:
                query: The search query to retrieve memory for
                url: Optional URL to filter memory results
                
            Returns:
                Retrieved memory content as a string
            """
            return self.memory.retrieve(f"{query} {url}")
        
        tavily_search_with_redis = TavilySearchWithMemory(api_key=api_key)
        tavily_extract_with_redis = SummarizingTavilyExtract(api_key=api_key)
        tavily_crawl_with_redis = SummarizingTavilyCrawl(api_key=api_key)
        
        return create_react_agent(
            prompt=prompt,
            model=llm,
            tools=[
                tavily_search_with_redis,
                tavily_extract_with_redis,
                tavily_crawl_with_redis,
                redis_semantic_memory_retrieval
                ],
            checkpointer=self.checkpointer, # Initialized Redis Checkpointer
        )
