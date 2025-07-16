import React, { useState, useRef, useEffect } from "react";
import { FaArrowRight } from "react-icons/fa";
import {
  CheckCircle2,
  LoaderCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import WebSearch from "./WebSearch";
import ExtractResults from "./ExtractResults";
import CrawlResults from "./CrawlResults";
import StreamingComponent from "./StreamingComponent";
import { Message } from "../App";
import { ConversationType } from "../common/enums";

interface ChatUIProps {
  onSubmit: (input: string) => void;
  messages: Message[];
  recapMessage: string;
}

// Removed unused markdown helper function

const ChatUI: React.FC<ChatUIProps> = ({
  onSubmit,
  messages,
  recapMessage,
}) => {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedQueries, setExpandedQueries] = useState<{
    [key: string]: boolean;
  }>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<number | null>(null);
  // Removed unused state variables for extracts and crawls

  console.log("ChatUI render - received messages:", messages);
  console.log("ChatUI render - recapMessage:", recapMessage);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Log before rendering
  console.log("ChatUI - about to map messages, count:", messages.length);

  // Helper functions for tooltip behavior
  const showTooltip = (id: string) => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setHoveredTooltip(id);
  };

  const hideTooltip = () => {
    const timeout = window.setTimeout(() => {
      setHoveredTooltip(null);
    }, 150); // 150ms delay for more forgiving behavior
    setTooltipTimeout(timeout);
  };

  const keepTooltipVisible = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  };

  // Tooltip component
  const Tooltip: React.FC<{ 
    id: string; 
    children: React.ReactNode; 
    content: React.ReactNode;
  }> = ({ id, children, content }) => (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => showTooltip(id)}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {hoveredTooltip === id && (
        <div 
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg shadow-lg max-w-sm w-auto"
          onMouseEnter={keepTooltipVisible}
          onMouseLeave={hideTooltip}
        >
          <div className="text-left">{content}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-around min-h-screen">
      <div className="w-full max-w-3xl rounded-lg flex flex-col h-[90vh] relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((message, index) => {
            console.log(`ChatUI - rendering message ${index}:`, message);
            console.log(
              `ChatUI - message ${index} response:`,
              message.response
            );

            return (
              <div key={index} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="p-3 rounded-lg max-w-xs bg-[#468BFF] text-white self-end">
                    {message.userMessage}
                  </div>
                </div>

                {message.response && (
                  <>
                    {message.response.type === ConversationType.TAVILY && (
                      <>
                        <div className="flex items-center justify-start gap-2">
                          <img
                            src="/tavilylogo.png"
                            alt="Tavily Logo"
                            className="h-8 w-auto object-contain"
                          />
                          <div className="text-sm text-gray-500">
                            {(() => {
                              const toolType =
                                message.response.toolType || "search";
                              const toolOps = message.response.toolOperations;

                              if (message.response.isSearching) {
                                if (toolOps) {
                                  if (toolType === "search") {
                                    return "is searching";
                                  } else if (toolType === "extract") {
                                    return "is extracting";
                                  } else if (toolType === "crawl") {
                                    return "is crawling";
                                  }
                                }
                                return toolType === "search"
                                  ? "is searching"
                                  : toolType === "extract"
                                    ? "is extracting"
                                    : toolType === "crawl"
                                      ? "is crawling"
                                      : "is working";
                              } else {
                                if (toolOps) {
                                  if (toolType === "search") {
                                    return "searched";
                                  } else if (toolType === "extract") {
                                    return "extracted";
                                  } else if (toolType === "crawl") {
                                    return "crawled";
                                  }
                                }
                                return toolType === "search"
                                  ? "searched"
                                  : toolType === "extract"
                                    ? "extracted"
                                    : toolType === "crawl"
                                      ? "crawled"
                                      : "completed";
                              }
                            })()}
                          </div>
                          <div>
                            {message.response.isSearching ? (
                              <LoaderCircle className="h-6 w-6 animate-spin text-blue-500" />
                            ) : (
                              <CheckCircle2 className="h-6 w-6 text-blue-500" />
                            )}
                          </div>
                        </div>

                        {/* Query Details - show if any queries were performed */}
                        {message.response.toolOperations?.search.totalQueries &&
                          message.response.toolOperations.search.totalQueries
                            .length > 0 && (
                            <div className="flex items-center justify-start mt-2">
                              <div className="p-2 rounded-lg w-full">
                                <div
                                  className="flex items-center cursor-pointer space-x-2"
                                  onClick={() =>
                                    setExpandedQueries((prev) => ({
                                      ...prev,
                                      [index]: !prev[index],
                                    }))
                                  }
                                >
                                  <span className="text-sm text-gray-600 font-medium">
                                    View search details (
                                    {
                                      message.response.toolOperations.search
                                        .totalQueries.length
                                    }
                                    )
                                  </span>
                                  {expandedQueries[index] ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>

                                {expandedQueries[index] && (
                                  <div className="mt-2 bg-gray-50 rounded-lg p-3">
                                    <div className="text-xs font-medium text-gray-600 mb-2">
                                      
                                    </div>
                                    <div className="space-y-3">
                                      {message.response.toolOperations.search.totalQueries.map(
                                        (queryData, queryIndex) => {
                                          const query = typeof queryData === "string" ? queryData : queryData?.query || "Unknown query";
                                          const isObject = typeof queryData === "object" && queryData !== null;
                                          
                                          return (
                                            <div key={queryIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                                Search {queryIndex + 1} Parameters
                                                <Tooltip
                                                  id={`search-info-${index}-${queryIndex}`}
                                                  content={
                                                    <div>
                                                      These parameters were automatically set by{" "}
                                                      <a 
                                                        href="https://python.langchain.com/docs/integrations/tools/tavily_search/" 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-blue-600 underline hover:text-blue-800"
                                                      >
                                                        Tavily-LangChain
                                                      </a>
                                                    </div>
                                                  }
                                                >
                                                  <Info className="h-3 w-3 text-gray-500 hover:text-gray-700 cursor-help" />
                                                </Tooltip>
                                              </div>
                                              <div className="space-y-2">
                                                <div>
                                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Query:</span>
                                                  <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm mt-1">
                                                    "{query}"
                                                  </div>
                                                </div>
                                                {isObject && Object.entries(queryData).map(([key, value]) => {
                                                  if (key === "query") return null; // Already displayed above
                                                  return (
                                                    <div key={key}>
                                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        {key.replace(/_/g, " ")}:
                                                      </span>
                                                      <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm mt-1">
                                                        {Array.isArray(value) || typeof value === "object" 
                                                          ? JSON.stringify(value) 
                                                          : String(value)}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Search Results */}
                        {message.response.searchResults &&
                          (() => {
                            console.log(
                              `ChatUI - rendering WebSearch for message ${index}`
                            );
                            return (
                              <div className="flex items-center justify-start mt-0">
                                <WebSearch
                                  searchResults={message.response.searchResults}
                                  operationCount={
                                    message.response.toolOperations?.search
                                      .completed
                                  }
                                />
                              </div>
                            );
                          })()}

                        {/* Extract Details */}
                        {message.response.toolOperations?.extract.totalUrls &&
                          message.response.toolOperations.extract.totalUrls
                            .length > 0 && (
                            <div className="flex items-center justify-start mt-2">
                              <div className="p-2 rounded-lg w-full">
                                <div
                                  className="flex items-center cursor-pointer space-x-2"
                                  onClick={() =>
                                    setExpandedQueries((prev) => ({
                                      ...prev,
                                      [`extract-${index}`]: !prev[`extract-${index}`],
                                    }))
                                  }
                                >
                                  <span className="text-sm text-gray-600 font-medium">
                                    View extract details (
                                    {
                                      message.response.toolOperations.extract
                                        .totalUrls.length
                                    }
                                    )
                                  </span>
                                  {expandedQueries[`extract-${index}`] ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>

                                {expandedQueries[`extract-${index}`] && (
                                  <div className="mt-2 bg-gray-50 rounded-lg p-3">
                                    <div className="space-y-3">
                                      {message.response.toolOperations.extract.totalUrls.map(
                                        (extractData, extractIndex) => {
                                          const isObject = typeof extractData === "object" && extractData !== null;
                                          
                                          return (
                                            <div key={extractIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                                Extract {extractIndex + 1} Parameters
                                                <Tooltip
                                                  id={`extract-info-${index}-${extractIndex}`}
                                                  content={
                                                    <div>
                                                      These parameters were automatically set by{" "}
                                                                                                              <a 
                                                          href="https://python.langchain.com/docs/integrations/tools/tavily_extract/" 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-blue-600 underline hover:text-blue-800"
                                                        >
                                                        Tavily-LangChain
                                                      </a>
                                                    </div>
                                                  }
                                                >
                                                  <Info className="h-3 w-3 text-gray-500 hover:text-gray-700 cursor-help" />
                                                </Tooltip>
                                              </div>
                                              <div className="space-y-2">
                                                {isObject && Object.entries(extractData).map(([key, value]) => {
                                                  if (key === "urls") return null; // Skip URLs field
                                                  return (
                                                    <div key={key}>
                                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        {key.replace(/_/g, " ")}:
                                                      </span>
                                                      <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm mt-1">
                                                        {Array.isArray(value) || typeof value === "object" 
                                                          ? JSON.stringify(value) 
                                                          : String(value)}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Extract Results */}
                        {message.response.extractResults && (
                          <div className="flex items-center justify-start mt-0">
                            <ExtractResults
                              extractResults={message.response.extractResults}
                              operationCount={
                                message.response.toolOperations?.extract
                                  .completed
                              }
                            />
                          </div>
                        )}

                        {/* Crawl Details */}
                        {message.response.toolOperations?.crawl.totalUrls &&
                          message.response.toolOperations.crawl.totalUrls
                            .length > 0 && (
                            <div className="flex items-center justify-start mt-2">
                              <div className="p-2 rounded-lg w-full">
                                <div
                                  className="flex items-center cursor-pointer space-x-2"
                                  onClick={() =>
                                    setExpandedQueries((prev) => ({
                                      ...prev,
                                      [`crawl-${index}`]: !prev[`crawl-${index}`],
                                    }))
                                  }
                                >
                                  <span className="text-sm text-gray-600 font-medium">
                                    View crawl details (
                                    {
                                      message.response.toolOperations.crawl
                                        .totalUrls.length
                                    }
                                    )
                                  </span>
                                  {expandedQueries[`crawl-${index}`] ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>

                                {expandedQueries[`crawl-${index}`] && (
                                  <div className="mt-2 bg-gray-50 rounded-lg p-3">
                                    <div className="space-y-3">
                                      {message.response.toolOperations.crawl.totalUrls.map(
                                        (crawlData, crawlIndex) => {
                                          const isObject = typeof crawlData === "object" && crawlData !== null;
                                          
                                          return (
                                            <div key={crawlIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                                Crawl {crawlIndex + 1} Parameters
                                                <Tooltip
                                                  id={`crawl-info-${index}-${crawlIndex}`}
                                                  content={
                                                    <div>
                                                      These parameters were automatically set by{" "}
                                                                                                              <a 
                                                          href="https://python.langchain.com/api_reference/tavily/tavily_crawl/langchain_tavily.tavily_crawl.TavilyCrawl.html" 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-blue-600 underline hover:text-blue-800"
                                                        >
                                                        Tavily-LangChain
                                                      </a>
                                                    </div>
                                                  }
                                                >
                                                  <Info className="h-3 w-3 text-gray-500 hover:text-gray-700 cursor-help" />
                                                </Tooltip>
                                              </div>
                                              <div className="space-y-2">
                                                {isObject && Object.entries(crawlData).map(([key, value]) => {
                                                  if (key === "url") return null; // Skip URL field
                                                  return (
                                                    <div key={key}>
                                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                        {key.replace(/_/g, " ")}:
                                                      </span>
                                                      <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm mt-1">
                                                        {Array.isArray(value) || typeof value === "object" 
                                                          ? JSON.stringify(value) 
                                                          : String(value)}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Crawl Results */}
                        {message.response.crawlResults && (
                          <div className="flex items-center justify-start mt-0">
                            <CrawlResults
                              crawlResults={message.response.crawlResults}
                              operationCount={
                                message.response.toolOperations?.crawl.completed
                              }
                              crawlBaseUrl={message.response.crawlBaseUrl}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-start mt-0">
                      <StreamingComponent
                        recapMessage={
                          message.response.recapMessage
                            ? message.response.recapMessage
                            : recapMessage
                              ? recapMessage
                              : ""
                        }
                        isSearching={message.response.isSearching}
                        error={message.response.error}
                      />
                    </div>
                  </>
                )}

                <div ref={chatEndRef} />
              </div>
            );
          })}
        </div>

        <div className=" flex items-center w-full ">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Follow up"
              className="w-full p-3 pr-12 border border-blue-300 rounded-lg focus:ring focus:ring-blue-300 outline-none resize-none overflow-auto"
              rows={1}
              style={{ minHeight: "40px", maxHeight: "200px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                if (target.scrollHeight <= 200) {
                  target.style.height = target.scrollHeight + "px";
                } else {
                  target.style.height = "200px";
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(input);
                  setInput("");
                }
              }}
            />
            <button
              onClick={() => {
                onSubmit(input);
                setInput("");
              }}
              className="absolute bottom-4 right-4 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
            >
              <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;
