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


interface ChartStartProps {
  onSubmit: (input: string) => void;
  apiKey: string | undefined;
  setApiKey: React.Dispatch<React.SetStateAction<string | undefined>>;
  showApiKeyDropdwown: boolean;
  setShowApiKeyDropdwown: React.Dispatch<React.SetStateAction<boolean>>;
  agentType: string;
  setAgentType: React.Dispatch<React.SetStateAction<string>>;
  llm: string | "";
  setLLM: React.Dispatch<React.SetStateAction<string | null>>;
}

const ChatStart: React.FC<ChartStartProps> = ({
  onSubmit,
  apiKey,
  setApiKey,
  showApiKeyDropdwown,
  setShowApiKeyDropdwown,
  agentType,
  setAgentType,
  llm,
  setLLM,
}) => {
  const [query, setQuery] = useState("");
  const [showKey, setShowKey] = useState<boolean>(false);

  // added
  const Spacer = ({ height = 20 }) => <div style={{ height }} />;

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

  const getLLMs = (type: string) => {
    if (type == "fast") {
      return [
        { value: 'gpt-4.1-nano', label: 'OpenAI GPT-4.1-nano' },
        { value: 'gpt-4.1-mini', label: 'OpenAI GPT-4.1-mini' },
        { value: 'gpt-4.1', label: 'OpenAI GPT-4.1' },
        { value: 'deepseek-ai/DeepSeek-V3-0324', label: 'deepseek-ai/DeepSeek-V3-0324' },
        { value: 'moonshotai/Kimi-K2-Instruct', label: 'moonshotai/Kimi-K2-Instruct' },
        { value: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', label: 'Qwen/Qwen3-Coder-480B-A35B-Instruct' },
      ];
    } else {
      return [
        { value: 'Kimi-K2-Instruct', label: 'Kimi-K2-Instruct' },
      ];
    }
  }
  const llms = getLLMs(agentType);
  const handleDefaultLLMSelect = (agentType: string) => {
    if (agentType == "fast") {
      setLLM('gpt-4.1-nano');
    } else {
      setLLM('Kimi-K2-Instruct');
    }
  };

  const checkApiKey = () => {
    return apiKey?.includes("tvly-") && apiKey?.length >= 32;
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
            onClick={() => {
              setAgentType("fast"),
              handleDefaultLLMSelect("fast")
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              agentType === "fast"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Fast
          </button>
          <button
            onClick={() => {
              setAgentType("deep"),
              handleDefaultLLMSelect("deep")
            }}
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
              onSubmit(query);
            }
          }}
        ></textarea>
        <button
          className="absolute right-3 bottom-4 transform text-blue-500"
          onClick={() => onSubmit(query)}
          disabled={!query?.length}
        >
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
            <FaArrowRight color="white" />
          </div>
        </button>
      </div>




      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 py-3">
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            <span>Select a model from W&amp;B Inference</span>
          </div>
        </div>
        <div className="relative">
          <select
            className="w-full p-3 pr-10 border border-blue-300 rounded-md focus:outline-none focus:ring focus:ring-blue-300 appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px 12px'
            }}
            value={llm || "gpt-4.1-nano"}
            onChange={e => setLLM(e.target.value)}
          >
            {llms.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Spacer height={30} />



      {/* Suggested Queries */}
      <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
        {suggestedQueries.map((query, index) => (
          <button
            key={index}
            className="border border-blue-300 bg-white text-blue-500 px-4 py-2 rounded-full hover:bg-blue-100 transition"
            onClick={() => onSubmit(query)}
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
