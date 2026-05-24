import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import FileUpload, { UploadedFile } from "./FileUpload";

interface ChartStartProps {
  onSubmit: (input: string, fileContext?: string) => void;
  apiKey: string | undefined;
  setApiKey: React.Dispatch<React.SetStateAction<string | undefined>>;
  showApiKeyDropdwown: boolean;
  setShowApiKeyDropdwown: React.Dispatch<React.SetStateAction<boolean>>;
  agentType: string;
  setAgentType: React.Dispatch<React.SetStateAction<string>>;
}

const ChatStart: React.FC<ChartStartProps> = ({
  onSubmit,
  apiKey,
  setApiKey,
  showApiKeyDropdwown,
  setShowApiKeyDropdwown,
  agentType,
  setAgentType,
}) => {
  const [query, setQuery] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [showKey, setShowKey] = useState<boolean>(false);

  const getSuggestedQueries = (type: string) => {
    if (type === "fast") {
      return [
        "Current weather in San Francisco",
        "Recent news in NYC",
        "What are the newest AI models?",
      ];
    } else {
      return [
        "Create a report summarizing Tavily's recent blog posts",
        "Find all developer docs on Tavily's website ",
      ];
    }
  };

  const suggestedQueries = getSuggestedQueries(agentType);

  const checkApiKey = () => {
    return apiKey?.includes("tvly-") && apiKey?.length >= 32;
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
  };

  const handleSubmit = (queryText: string) => {
    if (uploadedFiles.length > 0) {
      const fileContext = uploadedFiles
        .map(f => `--- File: ${f.filename} ---\n${f.content}`)
        .join('\n\n');
      onSubmit(queryText, fileContext);
    } else {
      onSubmit(queryText);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Main Text */}
      <h1 className="text-4xl font-semibold text-gray-800 mb-8">
        How can I help you today?
      </h1>

      {/* Agent Type Toggle */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setAgentType("fast")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              agentType === "fast"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Fast
          </button>
          <button
            onClick={() => setAgentType("deep")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              agentType === "deep"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Reasoning
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center mt-2">
          {agentType === "fast" 
            ? "Quick answers for simple queries" 
            : "Detailed analysis and reasoning for complex tasks"
          }
        </p>
      </div>

      {/* Input Box */}
      <div className="relative w-full max-w-lg">
        <textarea
          placeholder="Ask me anything"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-32 p-3 pr-10 border border-blue-300 rounded-lg focus:ring focus:ring-blue-300 outline-none resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(query);
            }
          }}
        ></textarea>
        <button
          className="absolute right-3 bottom-4 transform text-blue-500"
          onClick={() => handleSubmit(query)}
          disabled={!query?.length}
        >
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
            <FaArrowRight color="white" />
          </div>
        </button>
      </div>

      {/* File Upload */}
      <div className="mt-4">
        <FileUpload
          onFilesUploaded={handleFilesUploaded}
          uploadedFiles={uploadedFiles}
          onRemoveFile={handleRemoveFile}
        />
      </div>

      {/* Suggested Queries */}
      <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
        {suggestedQueries.map((query, index) => (
          <button
            key={index}
            className="border border-blue-300 bg-white text-blue-500 px-4 py-2 rounded-full hover:bg-blue-100 transition"
            onClick={() => handleSubmit(query)}
          >
            {query}
          </button>
        ))}
      </div>

      {/* API Key Toggle */}
      <div className="w-full max-w-lg mt-4">
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 cursor-pointer transition"
          onClick={() => setShowApiKeyDropdwown(!showApiKeyDropdwown)}
        >
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            <KeyRound className="h-5 w-5" />
            <span>Enter your Tavily API Key</span>
          </div>
          {checkApiKey() && <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />}
          {showApiKeyDropdwown ? (
            <ChevronUp className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-blue-600" />
          )}
        </div>
        <div
          className={`px-4 overflow-hidden transition-all duration-300 ${
            showApiKeyDropdwown
              ? "max-h-[200px] opacity-100 pb-4"
              : "max-h-0 opacity-0 pb-0"
          }`}
        >
          <div className="relative mt-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 pr-10 border border-blue-300 rounded-md focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="Tavily API Key"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600"
            >
              {showKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Each query will use 1 API credit.{" "}
            <a
              href="https://app.tavily.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500"
            >
              Don’t have a key?
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatStart;
