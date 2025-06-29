import { useState } from "react";
import { FaArrowRight } from "react-icons/fa";

interface ChartStartProps {
  onSubmit: (input: string) => void;
}

const ChatStart: React.FC<ChartStartProps> = ({
  onSubmit,
}) => {
  const [query, setQuery] = useState("");

  const suggestedQueries = [
    "Find Rotem Weiss's github profile and summarize his work",
    "Crawl tavily.com and generate a report about the company",
    "Current weather in San Francisco",
    "Recent news about OpenAI",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Main Text */}
      <h1 className="text-4xl font-semibold text-gray-800 mb-8">
        How can I help you today?
      </h1>

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
    </div>
  );
};

export default ChatStart;
