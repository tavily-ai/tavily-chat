import logging
from typing import Callable
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilyCrawl, TavilyExtract, TavilySearch
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
import json
import ast

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

        # Create the tools with the API key
        search = TavilySearch(
            max_results=10,
            api_key=api_key,
            include_favicon=True,
            search_depth="advanced",
            include_answer=False,
        )

        extract = TavilyExtract(
            extract_depth="advanced",
            api_key=api_key,
            include_favicon=True,
        )

        crawl = TavilyCrawl(api_key=api_key, include_favicon=True, limit=15)
        
        output_summarizer = create_output_summarizer(summary_llm)
        
        class SummarizingTavilyExtract(TavilyExtract):
            def _run(self, *args, **kwargs):
                # Remove callback manager from kwargs to avoid Pydantic issues
                kwargs.pop('run_manager', None)
                result = super()._run(*args, **kwargs)
                return output_summarizer(str(result), user_message)
            
            async def _arun(self, *args, **kwargs):
                # Remove callback manager from kwargs to avoid Pydantic issues
                kwargs.pop('run_manager', None)
                result = await super()._arun(*args, **kwargs)
                return output_summarizer(str(result), user_message)
        
        class SummarizingTavilyCrawl(TavilyCrawl):
            def _run(self, *args, **kwargs):
                # Remove callback manager from kwargs to avoid Pydantic issues
                kwargs.pop('run_manager', None)
                result = super()._run(*args, **kwargs)
                output = output_summarizer(str(result), user_message)
                return output
            
            async def _arun(self, *args, **kwargs):
                # Remove callback manager from kwargs to avoid Pydantic issues
                kwargs.pop('run_manager', None)
                result = await super()._arun(*args, **kwargs)
                output = output_summarizer(str(result), user_message)
                return output
        
        extract_with_summary = SummarizingTavilyExtract(
            extract_depth=extract.extract_depth,
            api_key=api_key,
            include_favicon=extract.include_favicon,
            description=extract.description
        )
        
        crawl_with_summary = SummarizingTavilyCrawl(
            api_key=api_key,
            include_favicon=crawl.include_favicon,
            limit=crawl.limit,
            description=crawl.description
        )
        
        return create_react_agent(
            prompt=prompt,
            model=llm,
            tools=[search, extract_with_summary, crawl_with_summary],
            checkpointer=self.checkpointer,
        )
