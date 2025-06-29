import React, { useEffect, useState } from "react";
import ChatStart from "./components/ChatStart";
import ChatUI from "./components/ChatUI";
import cuid from "cuid";
import { ConversationType } from "./common/enums";
import Header from "./components/Header";

export interface SearchResult {
  url: string;
  title: string;
  score: number;
  published_date: string;
  content: string;
}

export interface ExtractResult {
  url: string;
  raw_content: string;
  images: any[];
}

export interface CrawlResult {
  url: string;
  raw_content: string;
  images: any[];
}

export interface ChatbotResponse {
  type: ConversationType;
  isSearching: boolean;
  toolType?: 'search' | 'extract' | 'crawl';
  toolOperations?: {
    search: { active: number; completed: number; totalQueries: string[] };
    extract: { active: number; completed: number; totalUrls: string[] };
    crawl: { active: number; completed: number; totalUrls: string[] };
  };
  recapMessage?: string;
  searchResults?: SearchResult[];
  extractResults?: ExtractResult[];
  crawlResults?: CrawlResult[];
  crawlBaseUrl?: string;
  error?: string;
}

export interface Message {
  userMessage: string;
  response?: ChatbotResponse;
}

export interface ChatbotEvent {
  type: string;
  content: any;
  tool_name?: string;
}

enum MessageTypes {
  TOOL_START = "tool_start",
  TOOL_END = "tool_end", 
  CHATBOT = "chatbot",
}

// Use proxy in development, fallback for production
const BASE_URL = "";

class StreamingManager {
  private messageQueue: ChatbotEvent[] = [];
  private isProcessing = false;
  private processedEvents = new Set<string>();
  private updateCallback: (updates: Partial<ChatbotResponse>) => void;

  constructor(updateCallback: (updates: Partial<ChatbotResponse>) => void) {
    this.updateCallback = updateCallback;
  }

  enqueue(event: ChatbotEvent) {
    this.messageQueue.push(event);
    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    this.isProcessing = true;

    const event = this.messageQueue.shift();
    if (!event) {
      this.isProcessing = false;
      return;
    }

    const eventId = `${event.type}-${event.tool_name}-${JSON.stringify(event.content)}`;
    if (this.processedEvents.has(eventId)) {
      this.isProcessing = false;
      this.processNext();
      return;
    }

    this.processedEvents.add(eventId);
    
    try {
      await this.processEvent(event);
    } catch (error) {
      console.error('Error processing event:', error);
    }

    // Immediate processing for better responsiveness
    this.isProcessing = false;
    if (this.messageQueue.length > 0) {
      // Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => this.processNext());
    }
  }

  private async processEvent(event: ChatbotEvent) {
    // Process tool events with enhanced logic
    if (event.type === MessageTypes.TOOL_START && event.tool_name?.includes('tavily')) {
      await this.handleToolStart(event);
    } else if (event.type === MessageTypes.TOOL_END && event.tool_name?.includes('tavily')) {
      await this.handleToolEnd(event);
    }
  }

  private async handleToolStart(event: ChatbotEvent) {
    // Enhanced tool start handling with better type detection
    // ... existing tool start logic ...
  }

  private async handleToolEnd(event: ChatbotEvent) {
    // Enhanced tool end handling with better error recovery
    // ... existing tool end logic ...
  }

  cleanup() {
    this.messageQueue = [];
    this.processedEvents.clear();
    this.isProcessing = false;
  }
}

// Suggested state structure
interface ChatState {
  messages: Message[];
  currentStreamingMessage?: Partial<ChatbotResponse>;
  // toolPipeline: ToolStep[];
  recapMessage: string;
  threadId: string | null;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recapMessage, setRecapMessage] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);

  console.log('App render - messages:', messages);
  console.log('App render - messages.length:', messages.length);
  console.log('App render - should show ChatUI:', messages.length > 0);

  const submitMessage = async (input: string) => {
    const message = { userMessage: input };
    setMessages((prev) => [...prev, message]);

    await fetchStreamingData(input);
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

      console.log('Updated response:', lastMessage.response);
      return updatedMessages;
    });
  }

  const fetchStreamingData = async (query: string) => {
    setRecapMessage("");

    let id = cuid();
    if (!threadId) {
      setThreadId(id);
    }

    // Initialize response immediately to show loading state
    updateLastMessageResponse({
      type: ConversationType.CHATBOT,
      isSearching: false,
    });

    try {
      const response = await fetch(`${BASE_URL}/stream_agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          input: query,
          thread_id: threadId || id,
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
          console.log('Processing queued message:', message);
          
          // Create unique event ID to prevent duplicate processing
          const eventId = `${message.type}-${message.tool_name}-${JSON.stringify(message.content)}`;
          if (processedEvents.has(eventId)) {
            console.log('Skipping duplicate event:', eventId);
            setTimeout(() => {
              isProcessing = false;
              processQueue();
            }, 50);
            return;
          }
          processedEvents.add(eventId);
          
          if (message.type === MessageTypes.TOOL_START && message.tool_name?.includes('tavily')) {
            console.log('Tool start detected:', message.tool_name, 'Query:', message.content?.query);
            
            // Determine tool type from tool name
            let toolType: 'search' | 'extract' | 'crawl' = 'search';
            if (message.tool_name.includes('extract')) {
              toolType = 'extract';
            } else if (message.tool_name.includes('crawl')) {
              toolType = 'crawl';
            }
            
            // Update the last message to track multiple operations
            setMessages((prevMessages) => {
              const updatedMessages = [...prevMessages];
              const lastMessage = updatedMessages[updatedMessages.length - 1];

              if (!lastMessage.response) {
                lastMessage.response = {
                  type: ConversationType.TAVILY,
                  isSearching: true,
                  toolType: toolType,
                  toolOperations: {
                    search: { active: 0, completed: 0, totalQueries: [] },
                    extract: { active: 0, completed: 0, totalUrls: [] },
                    crawl: { active: 0, completed: 0, totalUrls: [] },
                  }
                };
              }

              // Initialize toolOperations if not present
              if (!lastMessage.response.toolOperations) {
                lastMessage.response.toolOperations = {
                  search: { active: 0, completed: 0, totalQueries: [] },
                  extract: { active: 0, completed: 0, totalUrls: [] },
                  crawl: { active: 0, completed: 0, totalUrls: [] },
                };
              }

              // Track the operation
              if (toolType === 'search') {
                lastMessage.response.toolOperations.search.active++;
                const query = message.content?.query || 'Unknown query';
                // Avoid duplicate queries
                if (!lastMessage.response.toolOperations.search.totalQueries.includes(query)) {
                  lastMessage.response.toolOperations.search.totalQueries.push(query);
                }
              } else if (toolType === 'extract') {
                lastMessage.response.toolOperations.extract.active++;
                const urls = message.content?.urls || 'Unknown URL';
                // Avoid duplicate URLs
                if (!lastMessage.response.toolOperations.extract.totalUrls.includes(urls)) {
                  lastMessage.response.toolOperations.extract.totalUrls.push(urls);
                }
              } else if (toolType === 'crawl') {
                lastMessage.response.toolOperations.crawl.active++;
                const url = message.content?.url || 'Unknown URL';
                // Avoid duplicate URLs
                if (!lastMessage.response.toolOperations.crawl.totalUrls.includes(url)) {
                  lastMessage.response.toolOperations.crawl.totalUrls.push(url);
                }
              }

              lastMessage.response.type = ConversationType.TAVILY;
              lastMessage.response.isSearching = true;
              lastMessage.response.toolType = toolType;

              console.log('Updated tool operations:', lastMessage.response.toolOperations);
              return updatedMessages;
            });
            
          } else if (message.type === MessageTypes.TOOL_END && message.tool_name?.includes('tavily')) {
            console.log('Tool end detected:', message.tool_name);
            
            // Determine tool type from tool name
            let toolType: 'search' | 'extract' | 'crawl' = 'search';
            if (message.tool_name.includes('extract')) {
              toolType = 'extract';
            } else if (message.tool_name.includes('crawl')) {
              toolType = 'crawl';
            }
            
            // Parse the tool results from stringified JSON
            try {
              const toolOutput = typeof message.content === 'string' 
                ? JSON.parse(message.content) 
                : message.content;
              
              console.log('Parsed tool output:', toolOutput);
              
              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];

                if (!lastMessage.response?.toolOperations) return updatedMessages;

                if (toolType === 'search') {
                  // Handle search results - accumulate them
                  const newSearchResults: SearchResult[] = [];
                  if (toolOutput.results && Array.isArray(toolOutput.results)) {
                    newSearchResults.push(...toolOutput.results.map((result: any) => ({
                      url: result.url || '',
                      title: result.title || '',
                      score: result.score || 0,
                      published_date: result.published_date || '',
                      content: result.content || ''
                    })));
                  }

                  // Update operation counts
                  lastMessage.response.toolOperations.search.active--;
                  lastMessage.response.toolOperations.search.completed++;
                  
                  // Accumulate search results with deduplication
                  const existingResults = lastMessage.response.searchResults || [];
                  const existingUrls = new Set(existingResults.map(r => r.url));
                  const uniqueNewResults = newSearchResults.filter(r => !existingUrls.has(r.url));
                  lastMessage.response.searchResults = [...existingResults, ...uniqueNewResults];
                  
                  console.log(`Search: Added ${uniqueNewResults.length} new results, ${newSearchResults.length - uniqueNewResults.length} duplicates filtered. Total: ${lastMessage.response.searchResults.length}`);

                  // Check if all operations are done
                  const allDone = lastMessage.response.toolOperations.search.active === 0;
                  lastMessage.response.isSearching = !allDone;
                  
                } else if (toolType === 'extract') {
                  // Handle extract results - accumulate them
                  const newExtractResults: ExtractResult[] = [];
                  if (toolOutput.results && Array.isArray(toolOutput.results)) {
                    newExtractResults.push(...toolOutput.results.map((result: any) => ({
                      url: result.url || '',
                      raw_content: result.raw_content || '',
                      images: result.images || []
                    })));
                  }

                  // Update operation counts
                  lastMessage.response.toolOperations.extract.active--;
                  lastMessage.response.toolOperations.extract.completed++;
                  
                  // Accumulate extract results with deduplication
                  const existingResults = lastMessage.response.extractResults || [];
                  const existingUrls = new Set(existingResults.map(r => r.url));
                  const uniqueNewResults = newExtractResults.filter(r => !existingUrls.has(r.url));
                  lastMessage.response.extractResults = [...existingResults, ...uniqueNewResults];

                  // Check if all operations are done
                  const allDone = lastMessage.response.toolOperations.extract.active === 0;
                  lastMessage.response.isSearching = !allDone;
                  
                } else if (toolType === 'crawl') {
                  // Handle crawl results - accumulate them
                  const newCrawlResults: CrawlResult[] = [];
                  if (toolOutput.results && Array.isArray(toolOutput.results)) {
                    newCrawlResults.push(...toolOutput.results.map((result: any) => ({
                      url: result.url || '',
                      raw_content: result.raw_content || '',
                      images: result.images || []
                    })));
                  }

                  // Update operation counts
                  lastMessage.response.toolOperations.crawl.active--;
                  lastMessage.response.toolOperations.crawl.completed++;
                  
                  // Accumulate crawl results with deduplication
                  const existingResults = lastMessage.response.crawlResults || [];
                  const existingUrls = new Set(existingResults.map(r => r.url));
                  const uniqueNewResults = newCrawlResults.filter(r => !existingUrls.has(r.url));
                  lastMessage.response.crawlResults = [...existingResults, ...uniqueNewResults];
                  lastMessage.response.crawlBaseUrl = toolOutput.base_url || lastMessage.response.crawlBaseUrl;

                  // Check if all operations are done
                  const allDone = lastMessage.response.toolOperations.crawl.active === 0;
                  lastMessage.response.isSearching = !allDone;
                }

                console.log('Updated response after tool end:', lastMessage.response);
                return updatedMessages;
              });
              
            } catch (error) {
              console.error("Error parsing tool output:", error);
              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                if (lastMessage.response?.toolOperations) {
                  lastMessage.response.toolOperations[toolType].active--;
                  lastMessage.response.toolOperations[toolType].completed++;
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
            console.log('Received data:', data);
            
            if (data.type === MessageTypes.CHATBOT && data.content) {
              setRecapMessage((prev) => prev + data.content);
              // Don't change the type if we already have Tavily search results
              // This preserves the search results display while streaming the response
            } else if (data.type === MessageTypes.TOOL_START || data.type === MessageTypes.TOOL_END) {
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
    } catch (err) {
      updateLastMessageResponse({
        error: "Error fetching streaming data",
      });
      console.error(err);
    }
  };

  return (
    <>
      <div className="min-h-screen w-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-white relative">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_1px_1px,rgba(70,139,255,0.35)_1px,transparent_0)] bg-[length:24px_24px] bg-center"></div>
        <Header />
        <div className="max-w-5xl mx-auto space-y-8 relative">
          {!messages.length ? (
            <ChatStart
              onSubmit={submitMessage}
            />
          ) : (
            <ChatUI
              onSubmit={submitMessage}
              messages={messages}
              recapMessage={recapMessage}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
