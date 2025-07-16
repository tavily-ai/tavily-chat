import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface StreamingComponentProps {
  error: string | undefined;
  recapMessage: string;
  isSearching: boolean;
  onStreamingComplete?: () => void;
}

const StreamingComponent: React.FC<StreamingComponentProps> = ({
  recapMessage,
  error,
  isSearching,
  onStreamingComplete,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const lastMessageRef = useRef<string>("");
  const typingTimeoutRef = useRef<number | null>(null);

  const highlighterStyle = oneLight;

  useEffect(() => {
    if (recapMessage !== lastMessageRef.current && !isSearching) {
      lastMessageRef.current = recapMessage;

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      // If it's a complete new message, animate it
      if (recapMessage.length > displayedText.length) {
        setIsTyping(true);

        // Simulate typing effect for better UX
        const remainingText = recapMessage.slice(displayedText.length);
        const chunkSize = Math.max(1, Math.floor(remainingText.length / 20)); // Adaptive chunk size

        let currentIndex = displayedText.length;

        const typeNextChunk = () => {
          if (currentIndex < recapMessage.length) {
            const nextChunk = recapMessage.slice(0, currentIndex + chunkSize);
            setDisplayedText(nextChunk);
            currentIndex += chunkSize;

            typingTimeoutRef.current = window.setTimeout(typeNextChunk, 50);
          } else {
            setDisplayedText(recapMessage);
            setIsTyping(false);
            onStreamingComplete?.();
          }
        };

        typeNextChunk();
      } else {
        // If message is shorter, update immediately
        setDisplayedText(recapMessage);
        setIsTyping(false);
      }
    }
  }, [recapMessage, isSearching, displayedText.length, onStreamingComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 max-w-4xl">
      {error && (
        <div className="text-red-600 mt-4 p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <span className="font-semibold">Error:</span> {error}
            </div>
          </div>
        </div>
      )}

      {displayedText && !isSearching && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Enhanced headings with better typography and spacing
                h1({ children, ...props }) {
                  return (
                    <h1
                      className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200"
                      {...props}
                    >
                      {children}
                    </h1>
                  );
                },
                h2({ children, ...props }) {
                  return (
                    <h2
                      className="text-xl font-semibold text-gray-800 mb-4 mt-8 pb-2 border-b border-gray-100"
                      {...props}
                    >
                      {children}
                    </h2>
                  );
                },
                h3({ children, ...props }) {
                  return (
                    <h3
                      className="text-lg font-semibold text-gray-800 mb-3 mt-6"
                      {...props}
                    >
                      {children}
                    </h3>
                  );
                },
                h4({ children, ...props }) {
                  return (
                    <h4
                      className="text-base font-semibold text-gray-700 mb-2 mt-4"
                      {...props}
                    >
                      {children}
                    </h4>
                  );
                },
                // Enhanced paragraphs with better spacing and readability
                p({ children, ...props }) {
                  return (
                    <p
                      className="text-gray-700 leading-relaxed mb-4 text-base"
                      {...props}
                    >
                      {children}
                    </p>
                  );
                },
                // Styled lists with better spacing
                ul({ children, ...props }) {
                  return (
                    <ul
                      className="list-disc list-outside space-y-2 mb-4 text-gray-700 pl-6"
                      {...props}
                    >
                      {children}
                    </ul>
                  );
                },
                ol({ children, ...props }) {
                  return (
                    <ol
                      className="list-decimal list-outside space-y-2 mb-4 text-gray-700 pl-6"
                      {...props}
                    >
                      {children}
                    </ol>
                  );
                },
                li({ children, ...props }) {
                  return (
                    <li className="text-gray-700 leading-relaxed" {...props}>
                      {children}
                    </li>
                  );
                },
                // Enhanced blockquotes
                blockquote({ children, ...props }) {
                  return (
                    <blockquote
                      className="border-l-4 border-blue-400 bg-blue-50 px-4 py-3 my-4 italic text-gray-800 rounded-r-lg"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  );
                },
                // Better inline and block code styling
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const { ref: _, ...restProps } = props;

                  if (match) {
                    // Block code
                    return (
                      <div className="my-4 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                        <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-200">
                          {match[1]}
                        </div>
                        <SyntaxHighlighter
                          language={match[1]}
                          PreTag={"div"}
                          {...restProps}
                          style={highlighterStyle}
                          customStyle={{
                            margin: 0,
                            padding: "1rem",
                            background: "#fafafa",
                            fontSize: "0.875rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    );
                  } else {
                    // Inline code
                    return (
                      <code
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono border"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                },
                // Enhanced links with better styling
                a({ children, ...props }) {
                  return (
                    <a
                      className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                // Enhanced emphasis and strong text
                em({ children, ...props }) {
                  return (
                    <em className="italic text-gray-800 font-medium" {...props}>
                      {children}
                    </em>
                  );
                },
                strong({ children, ...props }) {
                  return (
                    <strong className="font-semibold text-gray-900" {...props}>
                      {children}
                    </strong>
                  );
                },
                // Tables with better styling
                table({ children, ...props }) {
                  return (
                    <div className="my-6 overflow-x-auto">
                      <table
                        className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg"
                        {...props}
                      >
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children, ...props }) {
                  return (
                    <thead className="bg-gray-50" {...props}>
                      {children}
                    </thead>
                  );
                },
                th({ children, ...props }) {
                  return (
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200"
                      {...props}
                    >
                      {children}
                    </th>
                  );
                },
                td({ children, ...props }) {
                  return (
                    <td
                      className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100"
                      {...props}
                    >
                      {children}
                    </td>
                  );
                },
                // Horizontal rules
                hr({ ...props }) {
                  return (
                    <hr
                      className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"
                      {...props}
                    />
                  );
                },
              }}
            >
              {displayedText}
            </ReactMarkdown>
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-gray-400 ml-1 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingComponent;
