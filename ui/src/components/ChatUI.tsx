import React, { useState, useRef, useEffect } from "react";
import { FaArrowRight } from "react-icons/fa";
import { CheckCircle2, LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from 'react-markdown';
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

// Helper function to clean markdown for preview
const cleanMarkdownForPreview = (content: string): string => {
  return content
    // Remove image references
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/!\[.*?\]/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up extra whitespace
    .trim();
};

const ChatUI: React.FC<ChatUIProps> = ({
  onSubmit,
  messages,
  recapMessage,
}) => {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedExtracts, setExpandedExtracts] = useState<{[key: number]: boolean}>({});
  const [expandedCrawls, setExpandedCrawls] = useState<{[key: number]: boolean}>({});
  const [expandedQueries, setExpandedQueries] = useState<{[key: number]: boolean}>({});
  const [hoveredExtractIndex, setHoveredExtractIndex] = useState<{[key: number]: number | null}>({});
  const [hoveredCrawlIndex, setHoveredCrawlIndex] = useState<{[key: number]: number | null}>({});
  const [showAllCrawlResults, setShowAllCrawlResults] = useState<{[key: number]: boolean}>({});
  const [showAllExtractResults, setShowAllExtractResults] = useState<{[key: number]: boolean}>({});

  console.log('ChatUI render - received messages:', messages);
  console.log('ChatUI render - recapMessage:', recapMessage);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Log before rendering
  console.log('ChatUI - about to map messages, count:', messages.length);

  return (
    <div className="flex flex-col items-center justify-around min-h-screen">
      <div className="w-full max-w-3xl rounded-lg flex flex-col h-[90vh] relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((message, index) => {
            console.log(`ChatUI - rendering message ${index}:`, message);
            console.log(`ChatUI - message ${index} response:`, message.response);
            
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
                            const toolType = message.response.toolType || 'search';
                            const toolOps = message.response.toolOperations;
                            
                            if (message.response.isSearching) {
                              if (toolOps) {
                                if (toolType === 'search') {
                                  const active = toolOps.search.active;
                                  const completed = toolOps.search.completed;
                                  const total = active + completed;
                                  if (total > 1) {
                                    return `is searching (${completed}/${total} complete)`;
                                  }
                                  return 'is searching';
                                } else if (toolType === 'extract') {
                                  const active = toolOps.extract.active;
                                  const completed = toolOps.extract.completed;
                                  const total = active + completed;
                                  if (total > 1) {
                                    return `is extracting (${completed}/${total} complete)`;
                                  }
                                  return 'is extracting';
                                } else if (toolType === 'crawl') {
                                  const active = toolOps.crawl.active;
                                  const completed = toolOps.crawl.completed;
                                  const total = active + completed;
                                  if (total > 1) {
                                    return `is crawling (${completed}/${total} complete)`;
                                  }
                                  return 'is crawling';
                                }
                              }
                              return toolType === 'search' ? 'is searching' 
                                   : toolType === 'extract' ? 'is extracting'
                                   : toolType === 'crawl' ? 'is crawling'
                                   : 'is working';
                            } else {
                              if (toolOps) {
                                if (toolType === 'search') {
                                  const completed = toolOps.search.completed;
                                  if (completed > 1) {
                                    return `searched (${completed} queries)`;
                                  }
                                  return 'searched';
                                } else if (toolType === 'extract') {
                                  const completed = toolOps.extract.completed;
                                  if (completed > 1) {
                                    return `extracted (${completed} operations)`;
                                  }
                                  return 'extracted';
                                } else if (toolType === 'crawl') {
                                  const completed = toolOps.crawl.completed;
                                  if (completed > 1) {
                                    return `crawled (${completed} operations)`;
                                  }
                                  return 'crawled';
                                }
                              }
                              return toolType === 'search' ? 'searched' 
                                   : toolType === 'extract' ? 'extracted'
                                   : toolType === 'crawl' ? 'crawled'
                                   : 'completed';
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

                      {/* Query Details - show if multiple queries were performed */}
                      {message.response.toolOperations?.search.totalQueries && 
                       message.response.toolOperations.search.totalQueries.length > 1 && (
                        <div className="flex items-center justify-start mt-2">
                          <div className="p-2 rounded-lg w-full">
                            <div
                              className="flex items-center cursor-pointer space-x-2"
                              onClick={() => setExpandedQueries(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                            >
                              <span className="text-sm text-gray-600 font-medium">
                                View search queries ({message.response.toolOperations.search.totalQueries.length})
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
                                  Search queries performed:
                                </div>
                                <ul className="space-y-1">
                                  {message.response.toolOperations.search.totalQueries.map((query, queryIndex) => (
                                    <li key={queryIndex} className="text-sm text-gray-700">
                                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                        {queryIndex + 1}. "{query}"
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Search Results */}
                      {message.response.searchResults && (() => {
                        console.log(`ChatUI - rendering WebSearch for message ${index}`);
                        return (
                          <div className="flex items-center justify-start mt-0">
                            <WebSearch
                              searchResults={message.response.searchResults}
                              operationCount={message.response.toolOperations?.search.completed}
                            />
                          </div>
                        );
                      })()}

                                            {/* Extract Results */}
                      {message.response.extractResults && (
                        <div className="flex items-center justify-start mt-0">
                          <ExtractResults
                            extractResults={message.response.extractResults}
                            operationCount={message.response.toolOperations?.extract.completed}
                          />
                        </div>
                      )}

                                            {/* Crawl Results */}
                      {message.response.crawlResults && (
                        <div className="flex items-center justify-start mt-0">
                          <CrawlResults
                            crawlResults={message.response.crawlResults}
                            operationCount={message.response.toolOperations?.crawl.completed}
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
