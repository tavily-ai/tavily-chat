import { useState } from "react";
import { LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { CrawlResult } from "../App";
import { getWebsiteName, truncateString } from "../common/utils";

interface CrawlResultsProps {
  crawlResults: CrawlResult[];
  operationCount?: number;
  crawlBaseUrl?: string;
}

// Helper function to clean markdown for preview
const cleanMarkdownForPreview = (content: string): string => {
  return content
    // Remove image references
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/!\[.*?\]/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up extra whitespace
    .trim();
};

const CrawlResults: React.FC<CrawlResultsProps> = ({ crawlResults, operationCount, crawlBaseUrl }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  return (
    <div className="p-2 rounded-lg w-full">
      <div
        className="flex items-center cursor-pointer space-x-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          {!crawlResults ? (
            <>
              <span className="font-semibold text-gray-700">
                Conducting web crawling
              </span>
            </>
          ) : (
            <span className="font-semibold text-gray-700">
              Web crawling complete{operationCount && operationCount > 1 ? ` (${operationCount} operations)` : ''}
            </span>
          )}
        </div>
        {!crawlResults ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-gray-500" />
        ) : isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        )}
      </div>

      {isOpen && (
        <div className="mt-3 flex space-x-6">
          <div className="w-[60%] space-y-2">
            {crawlBaseUrl && (
              <div className="text-sm font-medium text-gray-700 mb-2">
                Crawled from {crawlBaseUrl} ({crawlResults?.length || 0} page{crawlResults?.length !== 1 ? 's' : ''})
              </div>
            )}
            <ul className="space-y-2">
              {crawlResults?.length
                ? (showAllResults 
                    ? crawlResults 
                    : crawlResults.slice(0, 5)
                  ).map((item, index) => {
                    const actualIndex = showAllResults ? index : index;
                    return (
                      <li
                        key={index}
                        className="cursor-pointer text-gray-700 hover:text-blue-500 transition 
                       whitespace-nowrap overflow-hidden text-ellipsis"
                        onMouseEnter={() => setHoveredIndex(actualIndex)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {actualIndex + 1}. {item.url}
                        </a>
                      </li>
                    );
                  })
                : "No crawl results"}
            </ul>
            
            {crawlResults?.length > 5 && !showAllResults && (
              <button
                onClick={() => setShowAllResults(true)}
                className="mt-3 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
              >
                Show all {crawlResults.length} results
              </button>
            )}
            
            {showAllResults && crawlResults?.length > 5 && (
              <button
                onClick={() => setShowAllResults(false)}
                className="mt-3 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition"
              >
                Show less
              </button>
            )}
          </div>

          <div className="w-[40%]">
            {hoveredIndex !== null && crawlResults && (
              <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg shadow">
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>{getWebsiteName(crawlResults[hoveredIndex].url)}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">
                  {crawlResults[hoveredIndex].url}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {truncateString(cleanMarkdownForPreview(crawlResults[hoveredIndex].raw_content))}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrawlResults; 