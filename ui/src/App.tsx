import { useEffect, useState } from "react";
import ChatStart from "./components/ChatStart";
import ChatUI from "./components/ChatUI";
import Sidebar from "./components/Sidebar";
import cuid from "cuid";
import { ConversationType } from "./common/enums";
import Header from "./components/Header";

interface OrderedToolOperation {
  type: "search" | "extract" | "crawl";
  index: number;
  data: any;
  status: "active" | "complete";
  results?: any;
}

export interface ChatbotResponse {
  type: ConversationType;
  isSearching: boolean;
  isStreaming: boolean;
  toolType?: "search" | "extract" | "crawl";
  toolOperations?: {
    orderedOperations: OrderedToolOperation[];
  };
  recapMessage?: string;
  error?: string;
}

export interface Message {
  userMessage: string;
  response?: ChatbotResponse;
}

export interface ToolContent {
  query?: string;
  url?: string;
  urls?: string;
  [key: string]: unknown;
}

export interface ChatbotEvent {
  type: string;
  content: ToolContent | string;
  tool_name?: string;
  tool_type?: string;
  operation_index?: number;
}

enum MessageTypes {
  TOOL_START = "tool_start",
  TOOL_END = "tool_end",
  CHATBOT = "chatbot",
}

// Use proxy in development, fallback for production
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// StreamingManager class removed - was unused

// Removed unused ChatState interface

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recapMessage, setRecapMessage] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [selectedAgentType, setSelectedAgentType] = useState<string>("fast");
  const [currentConversation, setCurrentConversation] = useState<string | undefined>();
  const [viewingHistory, setViewingHistory] = useState(false);
  const [historyContent, setHistoryContent] = useState<string>("");

  const [apiKey, setApiKey] = useState<string>();
  const [showApiKeyDropdwown, setShowApiKeyDropdwown] =
    useState<boolean>(true);

  const handleNewChat = () => {
    setMessages([]);
    setThreadId(null);
    setRecapMessage("");
    setCurrentConversation(undefined);
    setViewingHistory(false);
    setHistoryContent("");
  };

  const handleSelectConversation = async (filename: string) => {
    try {
      const response = await fetch(`${BASE_URL}/conversations/${filename}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryContent(data.content);
        setCurrentConversation(filename);
        setViewingHistory(true);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // console.log("App render - messages:", messages);
  // console.log("App render - messages.length:", messages.length);
  // console.log("App render - should show ChatUI:", messages.length > 0);

  const submitMessage = async (input: string, fileContext?: string) => {
    const message = { userMessage: input };
    setMessages((prev) => [...prev, message]);

    // If there's file context, prepend it to the query
    const queryWithContext = fileContext 
      ? `Context from uploaded files:\n${fileContext}\n\nUser question: ${input}`
      : input;

    await fetchStreamingData(queryWithContext);
  };

  useEffect(() => {
    if (recapMessage) {
      updateLastMessageResponse({ recapMessage });
    }
  }, [recapMessage]);

  function updateLastMessageResponse(updates: Partial<ChatbotResponse>) {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];

      if (!lastMessage.response) {
        lastMessage.response = {} as ChatbotResponse;
      }

      lastMessage.response = {
        ...lastMessage.response,
        ...updates,
      };

      // console.log("Updated response:", lastMessage.response);
      return updatedMessages;
    });
  }

  const fetchStreamingData = async (query: string) => {
    setRecapMessage("");
    if (!apiKey) {
      updateLastMessageResponse({
        error: "No API key provided. Cannot chat",
      });
      return;
    }
    const id = threadId || cuid();
    if (!threadId) {
      setThreadId(id);
    }

    // Initialize response immediately to show loading state
    updateLastMessageResponse({
      type: ConversationType.CHATBOT,
      isSearching: false,
      isStreaming: true,
    });

    try {
      const response = await fetch(`${BASE_URL}/stream_agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          input: query,
          thread_id: threadId || id,
          agent_type: selectedAgentType,
        }),
      });

      if (!response.body) {
        console.error("No body in response");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      const messageQueue: ChatbotEvent[] = [];
      let isProcessing = false;
      const processedEvents = new Set<string>();

      const processQueue = () => {
        if (isProcessing || messageQueue.length === 0) return;
        isProcessing = true;

        const message = messageQueue.shift();
        if (message) {
          // console.log("Processing queued message:", message);

          // Create unique event ID to prevent duplicate processing
          const eventId = `${message.type}-${message.tool_name}-${JSON.stringify(message.content)}`;
          if (processedEvents.has(eventId)) {
            // console.log("Skipping duplicate event:", eventId);
            setTimeout(() => {
              isProcessing = false;
              processQueue();
            }, 50);
            return;
          }
          processedEvents.add(eventId);

          if (
            message.type === MessageTypes.TOOL_START &&
            message.tool_name?.includes("tavily")
          ) {
            // console.log(
            //   "Tool start detected:",
            //   message.tool_name,
            //   "Query:",
            //   typeof message.content === "object" ? message.content?.query : ""
            // );

            // Use tool_type from backend or determine from tool name
            let toolType: "search" | "extract" | "crawl" = (message.tool_type as any) || "search";
            if (!message.tool_type && message.tool_name?.includes("extract")) {
              toolType = "extract";
            } else if (!message.tool_type && message.tool_name?.includes("crawl")) {
              toolType = "crawl";
            }

            // Update the last message to track multiple operations
            setMessages((prevMessages) => {
              const updatedMessages = [...prevMessages];
              const lastMessage = updatedMessages[updatedMessages.length - 1];

              if (!lastMessage.response) {
                lastMessage.response = {
                  type: ConversationType.TAVILY,
                  isSearching: true,
                  isStreaming: true,
                  toolType: toolType,
                  toolOperations: {
                    orderedOperations: [] as OrderedToolOperation[],
                  },
                };
              }

              // Initialize toolOperations if not present
              if (!lastMessage.response.toolOperations) {
                lastMessage.response.toolOperations = {
                  orderedOperations: [] as OrderedToolOperation[],
                };
              }

              // Add to ordered operations - check if we should replace the last active operation
              const operationIndex = message.operation_index ?? lastMessage.response.toolOperations.orderedOperations.length;
              const operationData = typeof message.content === "object" ? message.content : { query: message.content };
              
              const orderedOps = lastMessage.response.toolOperations.orderedOperations;
              const lastOperation = orderedOps.length > 0 ? orderedOps[orderedOps.length - 1] : null;
              
              // If the last operation is active and of the same type, replace it
              if (lastOperation && lastOperation.status === "active" && lastOperation.type === toolType) {
                lastOperation.data = operationData;
                lastOperation.status = "active";
                // console.log(`Replaced last active operation: ${toolType} ${lastOperation.index}`);
              } else {
                // Add new operation
                lastMessage.response.toolOperations.orderedOperations.push({
                  type: toolType,
                  index: operationIndex,
                  data: operationData,
                  status: "active"
                });
                // console.log(`Added new operation: ${toolType} ${operationIndex}`);
              }

              lastMessage.response.type = ConversationType.TAVILY;
              lastMessage.response.isSearching = true;
              lastMessage.response.toolType = toolType;

              return updatedMessages;
            });
          } else if (
            message.type === MessageTypes.TOOL_END &&
            message.tool_name?.includes("tavily")
          ) {
            // console.log("Tool end detected:", message.tool_name);

            // Use tool_type from backend or determine from tool name
            let toolType: "search" | "extract" | "crawl" = (message.tool_type as any) || "search";
            if (!message.tool_type && message.tool_name?.includes("extract")) {
              toolType = "extract";
            } else if (!message.tool_type && message.tool_name?.includes("crawl")) {
              toolType = "crawl";
            }
            // Parse the tool results from stringified JSON
            try {
              const toolOutput =
                typeof message.content === "string"
                  ? JSON.parse(message.content)
                  : message.content;

              // console.log("Parsed tool output:", toolOutput);

              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];

                if (!lastMessage.response?.toolOperations)
                  return updatedMessages;

                // Update the last active operation of the same type with results
                const orderedOps = lastMessage.response.toolOperations.orderedOperations;
                if (orderedOps.length > 0) {
                  // Find the last active operation of the same type
                  for (let i = orderedOps.length - 1; i >= 0; i--) {
                    const operation = orderedOps[i];
                    if (operation.status === "active" && operation.type === toolType) {
                      operation.status = "complete";
                      operation.results = toolOutput;
                      // console.log(`complete operation: ${operation.type} ${operation.index}`);
                      break;
                    }
                  }
                }

                // Check if all operations are done
                const allActiveOperations = orderedOps.filter(op => op.status === "active");
                lastMessage.response.isSearching = allActiveOperations.length > 0;

                return updatedMessages;
              });
            } catch (error) {
              console.error("Error parsing tool output:", error);
              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                if (lastMessage.response?.toolOperations) {
                  // Find and mark the last active operation of the same type as failed
                  const orderedOps = lastMessage.response.toolOperations.orderedOperations;
                  for (let i = orderedOps.length - 1; i >= 0; i--) {
                    const operation = orderedOps[i];
                    if (operation.status === "active" && operation.type === toolType) {
                      operation.status = "complete";
                      operation.results = { error: "Failed to parse tool output" };
                      break;
                    }
                  }
                }
                return updatedMessages;
              });
            }
          }
        }

        setTimeout(() => {
          isProcessing = false;
          processQueue();
        }, 50); // Even faster processing for immediate UI updates
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });
        buffer += decodedChunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line.trim());
            // console.log("Received data:", data);

            if (data.type === MessageTypes.CHATBOT && data.content) {
              setRecapMessage((prev) => prev + data.content);
              // Don't change the type if we already have Tavily search results
              // This preserves the search results display while streaming the response
            } else if (
              data.type === MessageTypes.TOOL_START ||
              data.type === MessageTypes.TOOL_END
            ) {
              messageQueue.push(data as ChatbotEvent);
              // Process immediately for tool events
              processQueue();
            }
          } catch (error) {
            console.error("Error parsing line:", line, error);
          }
        }
      }

      // After loop, flush decoder
      const remaining = decoder.decode(undefined, { stream: false });
      if (remaining) buffer += remaining;

      // Stream is complete, set streaming to false
      updateLastMessageResponse({
        isStreaming: false,
      });
    } catch (err: unknown) {
      // Stream ended with error, set streaming to false
      updateLastMessageResponse({
        isStreaming: false,
      });
      
      if (err instanceof Error) {
        updateLastMessageResponse({
          error: err.message || "Error sending chat. Check your API key",
        });
        console.error(err);
      } else {
        updateLastMessageResponse({
          error: "Error sending chat",
        });
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        currentConversation={currentConversation}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-white relative overflow-auto">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_1px_1px,rgba(70,139,255,0.35)_1px,transparent_0)] bg-[length:24px_24px] bg-center pointer-events-none"></div>
        <Header />
        
        {viewingHistory ? (
          /* Viewing saved conversation */
          <div className="max-w-4xl mx-auto p-6 relative">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-700">Αποθηκευμένη Συνομιλία</h2>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Νέα Συνομιλία
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                  {historyContent}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          /* Active chat */
          <div className="max-w-5xl mx-auto space-y-8 relative">
            {!messages.length ? (
              <ChatStart
                onSubmit={submitMessage}
                apiKey={apiKey}
                setApiKey={setApiKey}
                showApiKeyDropdwown={showApiKeyDropdwown}
                setShowApiKeyDropdwown={setShowApiKeyDropdwown}
                agentType={selectedAgentType}
                setAgentType={setSelectedAgentType}
              />
            ) : (
              <ChatUI
                onSubmit={submitMessage}
                messages={messages}
                recapMessage={recapMessage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
