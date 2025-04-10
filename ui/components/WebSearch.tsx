import { useState } from "react";
import { LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { SearchResult } from "../App";
import { convertDateFormat, getWebsiteName } from "../common/utils";
import { truncateString } from "../common/utils";

interface WebSearchProps {
  searchResults: SearchResult[];
}

const WebSearchResults: React.FC<WebSearchProps> = ({ searchResults }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-2 rounded-lg  w-full">
      <div
        className="flex items-center cursor-pointer space-x-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          {!searchResults ? (
            <>
              <span className="font-semibold text-gray-700">
                Conducting web search
              </span>
            </>
          ) : (
            <span className="font-semibold text-gray-700">
              Web search complete
            </span>
          )}
        </div>
        {!searchResults ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-gray-500" />
        ) : isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        )}
      </div>

      {isOpen && (
        <div className="mt-3 flex space-x-6">
          <ul className="w-[60%] space-y-2">
            {searchResults?.length
              ? searchResults?.map((item, index) => (
                  <li
                    key={index}
                    className="cursor-pointer text-gray-700 hover:text-blue-500 transition 
                 whitespace-nowrap overflow-hidden text-ellipsis"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {index + 1}. {item.title}
                    </a>
                  </li>
                ))
              : "No search results"}
          </ul>

          <div className="w-[40%]">
            {hoveredIndex !== null && (
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
                  {truncateString(searchResults[hoveredIndex].content)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSearchResults;
