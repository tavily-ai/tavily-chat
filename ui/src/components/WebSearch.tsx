import { Globe } from "lucide-react";
import { useState } from "react";
import { cleanMarkdownForPreview, convertDateFormat, getWebsiteName, truncateString } from "../common/utils";

interface SearchResult {
  url: string;
  title: string;
  score: number;
  published_date: string;
  content: string;
  favicon: string;
}

interface WebSearchProps {
  searchResults: SearchResult[];
  operationCount?: number;
}

const WebSearchResults: React.FC<WebSearchProps> = ({
  searchResults,
  operationCount: _operationCount,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // const [isOpen, setIsOpen] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);

  return (
    <div className="p-2 rounded-lg  w-full">
        <div className="mt-3 flex space-x-6">
          <div className="w-[60%] space-y-2">
            <ul className="space-y-2">
              {searchResults?.length
                ? (showAllResults
                    ? searchResults
                    : searchResults.slice(0, 5)
                  ).map((item, index) => {
                    const actualIndex = showAllResults ? index : index;
                    return (
                      <li
                        key={index}
                        className="cursor-pointer text-gray-700 hover:text-blue-500 transition"
                        onMouseEnter={() => setHoveredIndex(actualIndex)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <span className="w-8 text-right flex-shrink-0">{actualIndex + 1}.</span>
                          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                            {item.favicon ? (
                              <img
                                src={item.favicon}
                                alt=""
                                className="w-4 h-4 object-cover"
                                onError={(e) => {
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
                                  }
                                }}
                              />
                            ) : (
                              <Globe className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <span className="truncate">{item.title}</span>
                        </a>
                      </li>
                    );
                  })
                : "No search results"}
            </ul>

            {searchResults?.length > 5 && !showAllResults && (
              <button
                onClick={() => setShowAllResults(true)}
                className="mt-3 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
              >
                Show all {searchResults.length} results
              </button>
            )}

            {showAllResults && searchResults?.length > 5 && (
              <button
                onClick={() => setShowAllResults(false)}
                className="mt-3 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition"
              >
                Show less
              </button>
            )}
          </div>

          <div className="w-[40%]">
            {hoveredIndex !== null && searchResults && (
              <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg shadow">
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>{getWebsiteName(searchResults[hoveredIndex].url)}</span>
                  <span>
                    {convertDateFormat(
                      searchResults[hoveredIndex].published_date
                    )}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">
                  {searchResults[hoveredIndex].title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {truncateString(cleanMarkdownForPreview(searchResults[hoveredIndex].content || ""))}
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default WebSearchResults;
