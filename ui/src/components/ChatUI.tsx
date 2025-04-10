import { useState, useRef, useEffect } from "react";
import { FaArrowRight } from "react-icons/fa";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import OptimizedParameters from "./OptimizedParameters";
import WebSearch from "./WebSearch";
import StreamingComponent from "./StreamingComponent";
import { Message } from "../App";
import { ConversationType } from "../common/enums";

interface ChatUIProps {
  onSubmit: (input: string) => void;
  messages: Message[];
  recapMessage: string;
}

const ChatUI: React.FC<ChatUIProps> = ({
  onSubmit,
  messages,
  recapMessage,
}) => {
  const [input, setInput] = useState("");
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-around min-h-screen">
      <div className="w-full max-w-3xl rounded-lg flex flex-col h-[90vh] relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
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
                          onLoad={() => setImageLoaded(true)}
                          onError={() => setImageLoaded(true)}
                        />
                        {imageLoaded && (
                          <>
                            <div className="text-sm text-gray-500">
                              {message.response.isSearching
                                ? "is searching"
                                : "searched"}
                            </div>
                            <div>
                              {message.response.isSearching ? (
                                <LoaderCircle className="h-6 w-6 animate-spin text-blue-500" />
                              ) : (
                                <CheckCircle2 className="h-6 w-6 text-blue-500" />
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {message.response.autoSearchParams && (
                        <div className="flex items-center justify-start mt-0">
                          <OptimizedParameters
                            autoSearchParams={message.response.autoSearchParams}
                          />
                        </div>
                      )}

                      {message.response.searchResults && (
                        <div className="flex items-center justify-start mt-0">
                          <WebSearch
                            searchResults={message.response.searchResults}
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
          ))}
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
