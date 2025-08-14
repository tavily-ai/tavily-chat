import { Globe } from "lucide-react";
import { useState } from "react";
import { extractTitleFromUrl, getWebsiteName } from "../common/utils";

interface ExtractResult {
  url: string;
  raw_content: string;
  images: unknown[];
  favicon: string;
}

interface ExtractResultsProps {
  extractResults?: ExtractResult[];
  summary?: string;
  urls?: string[];
  favicons?: string[];
  operationCount?: number;
}

const ExtractResults: React.FC<ExtractResultsProps> = ({
  extractResults,
  urls,
  favicons,
  operationCount: _operationCount,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  // Use URLs from new format if available, otherwise use extractResults
  const displayUrls = urls || (extractResults ? extractResults.map(item => item.url) : []);
  const displayFavicons = favicons || (extractResults ? extractResults.map(item => item.favicon) : []);
  const displayResults = showAllResults ? displayUrls : displayUrls.slice(0, 5);

  return (
    <div className="p-2 rounded-lg w-full">
      <div className="mt-3 flex space-x-6">
        <div className="w-[60%] space-y-2">
          <ul className="space-y-2">
            {displayUrls.length > 0 ? displayResults.map((url, index) => {
              const actualIndex = showAllResults ? index : index;
              return (
                <li
                  key={index}
                  className="cursor-pointer text-gray-700 hover:text-blue-500 transition"
                  onMouseEnter={() => setHoveredIndex(actualIndex)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <span className="w-8 text-right flex-shrink-0">{actualIndex + 1}.</span>
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {displayFavicons && displayFavicons[actualIndex] ? (
                        <img
                          src={displayFavicons[actualIndex]}
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
                    <span className="truncate">{url}</span>
                  </a>
                </li>
              );
            }) : "No extraction results"}
          </ul>

          {displayUrls.length > 5 && !showAllResults && (
            <button
              onClick={() => setShowAllResults(true)}
              className="mt-3 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
            >
              Show all {displayUrls.length} results
            </button>
          )}

          {showAllResults && displayUrls.length > 5 && (
            <button
              onClick={() => setShowAllResults(false)}
              className="mt-3 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition"
            >
              Show less
            </button>
          )}
        </div>

        <div className="w-[40%]">
          {hoveredIndex !== null && displayUrls && (
            <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg shadow">
              <div className="text-xs text-gray-500">
                <span>{getWebsiteName(displayUrls[hoveredIndex])}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">
                {extractTitleFromUrl(displayUrls[hoveredIndex])}
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtractResults;
