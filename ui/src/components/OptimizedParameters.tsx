import { useState } from "react";
import { LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatSearchParamsForDisplay } from "../common/utils";

interface OptimizedParamsProps {
  autoSearchParams: object | undefined;
}

const OptimizedParams: React.FC<OptimizedParamsProps> = ({
  autoSearchParams,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-2 rounded-lg w-full max-w-lg mt-4">
      <div
        className="flex items-center cursor-pointer space-x-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          {!autoSearchParams ? (
            <>
              <span className="font-semibold text-gray-700">
                Generating search parameters
              </span>
            </>
          ) : (
            <span className="font-semibold text-gray-700">
              Search parameters
            </span>
          )}
        </div>
        {!autoSearchParams ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-gray-500" />
        ) : isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        )}
      </div>

      {isOpen && autoSearchParams && (
        <div className="mt-3 bg-gray-900 text-gray-300 text-sm p-4 rounded-md font-mono overflow-auto w-full">
          <pre>{formatSearchParamsForDisplay(autoSearchParams)}</pre>
        </div>
      )}
    </div>
  );
};

export default OptimizedParams;
