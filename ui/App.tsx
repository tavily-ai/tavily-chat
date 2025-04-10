import { useEffect, useState } from "react";
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

export interface ChatbotResponse {
  type: ConversationType;
  isSearching: boolean;
  recapMessage?: string;
  autoSearchParams?: object;
  searchResults?: SearchResult[];
  error?: string;
}

export interface Message {
  userMessage: string;
  response?: ChatbotResponse;
}

export interface ChatbotEvent {
  type: string;
  content: any;
}

enum MessageTypes {
  TAVILY_STATUS = "tavily_status",
  AUTO_TAVILY_PARAMETERS = "auto_tavily_parameters",
  TAVILY_RESULTS = "tavily_results",
  CHATBOT_RESPONSE = "chatbot_response",
  CHATBOT = "chatbot",
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recapMessage, setRecapMessage] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);

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

      return updatedMessages;
    });
  }

  const fetchStreamingData = async (query: string) => {
    setRecapMessage("");

    let id = undefined;
    if (!threadId) {
      id = cuid();
      setThreadId(id);
    }

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

      const processQueue = () => {
        if (isProcessing || messageQueue.length === 0) return;
        isProcessing = true;

        const message = messageQueue.shift();
        if (message) {
          if (message.type === MessageTypes.TAVILY_STATUS) {
            updateLastMessageResponse({
              type: ConversationType.TAVILY,
              isSearching: true,
            });
          } else if (message.type === MessageTypes.CHATBOT_RESPONSE) {
            updateLastMessageResponse({
              type: ConversationType.CHATBOT,
            });
          } else if (message.type === MessageTypes.AUTO_TAVILY_PARAMETERS) {
            updateLastMessageResponse({
              autoSearchParams: message.content as object,
            });
          } else if (message.type === MessageTypes.TAVILY_RESULTS) {
            updateLastMessageResponse({
              isSearching: false,
              searchResults: message.content as SearchResult[],
            });
          }
        }

        setTimeout(() => {
          isProcessing = false;
          processQueue();
        }, 1000);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });
        buffer += decodedChunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          try {
            const data = JSON.parse(line.trim());
            if (data.type === "chatbot") {
              setRecapMessage((prev) => prev + data.content);
            } else {
              messageQueue.push(data as ChatbotEvent);
            }
          } catch (error) {
            console.error("Error parsing line:", error);
          }
        }

        processQueue();
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
