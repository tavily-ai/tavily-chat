import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  LoaderCircle,
  Paperclip
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Message } from "../App";
import { ConversationType } from "../common/enums";
import CrawlResults from "./CrawlResults";
import ExtractResults from "./ExtractResults";
import StreamingComponent from "./StreamingComponent";
import WebSearch from "./WebSearch";
import FileUpload, { UploadedFile } from "./FileUpload";

interface ChatUIProps {
  onSubmit: (input: string, fileContext?: string) => void;
  messages: Message[];
  recapMessage: string;
}

interface ToolCall {
  type: string;
  index: number;
  data: any;
  color: string;
  label: string;
  status?: "active" | "complete";
}

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
  const [activeTabs, setActiveTabs] = useState<{
    [key: string]: string;
  }>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
  };

  const handleSubmit = (inputText: string) => {
    if (uploadedFiles.length > 0) {
      const fileContext = uploadedFiles
        .map(f => `--- File: ${f.filename} ---\n${f.content}`)
        .join('\n\n');
      onSubmit(inputText, fileContext);
      setUploadedFiles([]); // Clear files after submit
    } else {
      onSubmit(inputText);
    }
    setShowFileUpload(false);
  };

  // console.log("ChatUI render - received messages:", messages);
  // console.log("ChatUI render - recapMessage:", recapMessage);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // console.log("ChatUI - about to map messages, count:", messages.length);

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
    }, 150);
    setTooltipTimeout(timeout);
  };

  const keepTooltipVisible = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  };

  // Helper function to get status text
  const getStatusText = (message: Message) => {
    if (!message.response || message.response.isStreaming) {
      return "processing";
    }
    return "complete";
  };

  // Helper function to build tool calls array from ordered operations
  const buildToolCalls = (toolOps: any): ToolCall[] => {
    const toolCalls: ToolCall[] = [];

    // Only use ordered operations
    if (toolOps?.orderedOperations && toolOps.orderedOperations.length > 0) {
      toolOps.orderedOperations.forEach((operation: any) => {
        const colorMap = {
          search: 'blue',
          extract: 'red',
          crawl: 'yellow'
        };
        
        const labelMap = {
          search: 'Search',
          extract: 'Extract',
          crawl: 'Crawl'
        };

        toolCalls.push({
          type: operation.type,
          index: operation.index,
          data: operation.data,
          color: colorMap[operation.type as keyof typeof colorMap] || 'blue',
          label: labelMap[operation.type as keyof typeof labelMap] || 'Tool',
          status: operation.status
        });
      });
    }

    return toolCalls;
  };

  // Helper function to get color classes
  const getColorClasses = (color: string, isActive: boolean = false) => {
    const baseClasses = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        hover: 'hover:bg-blue-100',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        active: 'bg-white text-blue-700 border border-blue-200 border-b-0',
        inactive: 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        hover: 'hover:bg-red-100',
        border: 'border-red-200',
        dot: 'bg-red-500',
        active: 'bg-white text-red-700 border border-red-200 border-b-0',
        inactive: 'text-red-600 hover:text-red-700 hover:bg-red-100'
      },
      yellow: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        hover: 'hover:bg-yellow-100',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500',
        active: 'bg-white text-yellow-700 border border-yellow-200 border-b-0',
        inactive: 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100'
      }
    };

    const colorConfig = baseClasses[color as keyof typeof baseClasses];
    return isActive ? colorConfig.active : colorConfig.inactive;
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

  // Helper function to render tool call buttons
  const renderToolCallButtons = (toolCalls: ToolCall[], messageIndex: number) => {
    if (toolCalls.length === 0) return null;

    return (
      <div className="flex items-center justify-start mt-2">
        <div className="flex items-center gap-1.5">
          {toolCalls.map((toolCall, toolCallIndex) => (
            <div key={`${toolCall.type}-${toolCall.index}`} className="flex items-center">
              <button
                onClick={() => {
                  const key = `${toolCall.type}-${toolCall.index}-${messageIndex}`;
                  const isCurrentlyExpanded = expandedQueries[key];

                  // Close all other dropdowns first
                  const newExpandedQueries = Object.keys(expandedQueries).reduce((acc, existingKey) => {
                    acc[existingKey] = false;
                    return acc;
                  }, {} as { [key: string]: boolean });

                  // Toggle the clicked dropdown
                  newExpandedQueries[key] = !isCurrentlyExpanded;

                  setExpandedQueries(newExpandedQueries);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 ${toolCall.color === 'blue'
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  : toolCall.color === 'red'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                  }`}
              >
                {toolCall.status === "active" ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-blue-500" />
                )}
                {toolCall.label}
                {expandedQueries[`${toolCall.type}-${toolCall.index}-${messageIndex}`] ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {toolCallIndex < toolCalls.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 ml-1.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to render parameter display
  const renderParameters = (data: any, toolType: string) => {
    const colorConfig = {
      search: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
      extract: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
      crawl: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700' }
    };

    const config = colorConfig[toolType as keyof typeof colorConfig];

    return (
      <div className="space-y-2">
        <div className={`bg-white rounded p-2 border ${config.border}`}>
          <div className={`text-xs font-semibold ${config.text} mb-1`}>
            {toolType.charAt(0).toUpperCase() + toolType.slice(1)} Parameters:
          </div>
          <div className="space-y-2">
            {/* Show all parameters for all operations */}
            {typeof data === "object" && data !== null ? (
              Object.entries(data).map(([key, value]) => {
                // Handle special cases for better display
                let displayValue: string;
                let displayKey = key.replace(/_/g, " ");

                // Special formatting for different data types
                if (key === "query" && toolType === "search") {
                  displayValue = `"${value}"`;
                } else if (Array.isArray(value)) {
                  displayValue = value.join(', ');
                } else if (typeof value === "object" && value !== null) {
                  displayValue = JSON.stringify(value);
                } else {
                  displayValue = String(value);
                }

                return (
                  <div key={key}>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {displayKey}:
                    </span>
                    <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mt-1 break-all">
                      {displayValue}
                    </div>
                  </div>
                );
              })
            ) : (
              // Handle case where data is a string (for search queries)
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Query:</span>
                <div className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mt-1">
                  "{data}"
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to render tool details from ordered operations
  const renderToolDetails = (message: Message, messageIndex: number) => {
    // console.log("renderToolDetails ops", message.response?.toolOperations);
    // console.log("renderToolDetails message", message);
    const toolOps = message.response?.toolOperations;
    if (!toolOps) return [];

    const details: React.ReactNode[] = [];

    // Only use ordered operations
    if (toolOps.orderedOperations && toolOps.orderedOperations.length > 0) {
      toolOps.orderedOperations.forEach((operation: any) => {
        const operationKey = `${operation.type}-${operation.index}-${messageIndex}`;
        if (expandedQueries[operationKey]) {
          const tabKey = operationKey;
          const activeTab = activeTabs[tabKey] || 'params';

          const colorConfig = {
            search: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
            extract: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500' },
            crawl: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-500' }
          };

          const config = colorConfig[operation.type as keyof typeof colorConfig];
          const labelMap = { search: 'Search', extract: 'Extract', crawl: 'Crawl' };
          const label = labelMap[operation.type as keyof typeof labelMap] || 'Tool';

          details.push(
            <div key={`${operation.type}-${operation.index}`} className={`mt-2 ${config.bg} rounded-lg p-3 border ${config.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 ${config.dot} rounded-full`}></div>
                <span className={`text-sm font-semibold ${config.text}`}>{label}</span>
                <Tooltip
                  id={`${operation.type}-info-${operation.index}-${messageIndex}`}
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
                  <Info className={`h-3 w-3 ${config.text} hover:opacity-80 cursor-help`} />
                </Tooltip>
              </div>

              <div className={`flex border-b ${config.border} mb-3`}>
                <button
                  onClick={() => setActiveTabs(prev => ({ ...prev, [tabKey]: 'params' }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${getColorClasses(operation.type === 'search' ? 'blue' : operation.type === 'extract' ? 'red' : 'yellow', activeTab === 'params')}`}
                >
                  Parameters
                </button>
                <button
                  onClick={() => setActiveTabs(prev => ({ ...prev, [tabKey]: 'sources' }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${getColorClasses(operation.type === 'search' ? 'blue' : operation.type === 'extract' ? 'red' : 'yellow', activeTab === 'sources')}`}
                >
                  {operation.type === 'search' ? 'Sources' : 'Results'}
                </button>
              </div>

              {activeTab === 'params' && renderParameters(operation.data, operation.type)}
              {activeTab === 'sources' && operation.results && (
                <div className="bg-white rounded p-2 border border-gray-100">
                  {operation.type === 'search' && (
                    <WebSearch
                      searchResults={operation.results.results || []}
                      operationCount={1}
                    />
                  )}
                  {operation.type === 'extract' && (
                    <ExtractResults
                      extractResults={operation.results.results || []}
                      summary={operation.results.summary}
                      urls={operation.results.urls}
                      favicons={operation.results.favicons}
                      operationCount={1}
                    />
                  )}
                  {operation.type === 'crawl' && (
                    <CrawlResults
                      crawlResults={operation.results.results || []}
                      summary={operation.results.summary}
                      urls={operation.results.urls}
                      favicons={operation.results.favicons}
                      operationCount={1}
                      crawlBaseUrl={operation.results.base_url}
                    />
                  )}
                </div>
              )}
            </div>
          );
        }
      });
    }

    return details;
  };

  return (
    <div className="flex flex-col items-center justify-around min-h-screen">
      <div className="w-full max-w-4xl rounded-lg flex flex-col h-[90vh] relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.map((message, index) => {
            // console.log(`ChatUI - rendering message ${index}:`, message);
            // console.log(`ChatUI - message ${index} response:`, message.response);

            return (
              <div key={index} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="p-3 rounded-lg max-w-xs bg-[#468BFF] text-white self-end">
                    {message.userMessage}
                  </div>
                </div>

                <div className="flex items-center justify-start gap-2">
                  <img
                    src="/tavilylogo.png"
                    alt="Tavily Logo"
                    className="h-8 w-auto object-contain"
                  />
                  <div className="text-sm text-gray-500">
                    {getStatusText(message)}
                  </div>
                  <div>
                    {message.response && !message.response.isStreaming ? (
                      <CheckCircle2 className="h-6 w-6 text-blue-500" />
                    ) : (
                      <LoaderCircle className="h-6 w-6 animate-spin text-blue-500" />
                    )}
                  </div>
                </div>

                {message.response && message.response.type === ConversationType.TAVILY && (
                  <>
                    {/* Individual Tool Calls */}
                    {renderToolCallButtons(buildToolCalls(message.response.toolOperations), index)}

                    {/* Individual Tool Details */}
                    {renderToolDetails(message, index)}
                  </>
                )}

                <div className="flex items-center justify-start mt-0">
                  <StreamingComponent
                    recapMessage={
                      message.response?.recapMessage
                        ? message.response.recapMessage
                        : recapMessage
                          ? recapMessage
                          : ""
                    }
                    isSearching={message.response?.isSearching || false}
                    error={message.response?.error}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col w-full gap-2">
          {/* File Upload Area */}
          {showFileUpload && (
            <div className="w-full">
              <FileUpload
                onFilesUploaded={handleFilesUploaded}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
              />
            </div>
          )}

          {/* Uploaded Files Preview (when not showing full upload) */}
          {!showFileUpload && uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {uploadedFiles.map((file) => (
                <span 
                  key={file.filename}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                >
                  📎 {file.filename}
                  <button
                    onClick={() => handleRemoveFile(file.filename)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center w-full gap-2">
            {/* File Upload Button */}
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={`p-3 rounded-lg transition ${
                showFileUpload 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title="Upload files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploadedFiles.length > 0 ? "Ask about your files..." : "Follow up"}
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
                    if (!messages.some(message => 
                      message.response?.isStreaming || message.response?.isSearching
                    )) {
                      handleSubmit(input);
                      setInput("");
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  handleSubmit(input);
                  setInput("");
                }}
                disabled={messages.some(message => 
                  message.response?.isStreaming || message.response?.isSearching
                )}
                className={`absolute bottom-2 right-2 p-2 rounded-full transition ${
                  messages.some(message => 
                    message.response?.isStreaming || message.response?.isSearching
                  )
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;