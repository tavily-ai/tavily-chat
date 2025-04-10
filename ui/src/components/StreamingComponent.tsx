import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface StreamingComponentProps {
  error: string | undefined;
  recapMessage: string;
  isSearching: boolean;
}

const StreamingComponent: React.FC<StreamingComponentProps> = ({
  recapMessage,
  error,
  isSearching,
}) => {
  const highlighterStyle = materialDark as any;

  return (
    <div className="p-4 max-w-4xl">
      {error && <div className="text-red-500 mt-4">{error}</div>}

      {recapMessage && !isSearching && (
        <div className="mt-4 bg-gray-100 p-4 rounded-lg">
          <div className="prose prose-sm max-w-full">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p({ children, ...props }) {
                  return (
                    <p style={{ marginBottom: "1rem" }} {...props}>
                      {children}
                    </p>
                  );
                },
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const { ref, ...restProps } = props;
                  return match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      PreTag={"div"}
                      {...restProps}
                      style={highlighterStyle}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                a({ children, ...props }) {
                  return (
                    <a
                      style={{
                        color: "gray",
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {recapMessage}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingComponent;
