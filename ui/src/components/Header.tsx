import { BookOpen, Github, Home } from "lucide-react";

const Header = () => {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm">
      {/* Logo Section */}
      <div className="flex items-center">
        <a
          href="https://tavily.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tavily Website"
        >
          <img
            src="/tavilylogo.png"
            alt="Tavily Logo"
            className="h-10 w-auto"
          />
        </a>
      </div>

      {/* Icon Squares Section */}
      <div className="flex space-x-4">
        {/* Home Icon */}
        <a
          href="https://app.tavily.com/home"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tavily Home"
        >
          <div className="p-2 bg-[#468BFF] rounded-lg hover:bg-[#8FBCFA] transition-colors cursor-pointer shadow-md">
            <Home className="text-white h-6 w-6" />
          </div>
        </a>
        <a
          href="https://github.com/tavily-ai/tavily-chat"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tavily GitHub"
        >
          <div className="p-2 bg-[#FE363B] rounded-lg hover:bg-[#FF9A9D] transition-colors cursor-pointer shadow-md">
            <Github className="text-white h-6 w-6" />
          </div>
        </a>
        <a
          href="https://docs.tavily.com/examples/use-cases/chat"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tavily Website"
        >
          <div className="p-2 bg-[#FDBB11] rounded-lg hover:bg-[#F6D785] transition-colors cursor-pointer shadow-md">
            <BookOpen className="text-white h-6 w-6" />
          </div>
        </a>
      </div>
    </div>
  );
};

export default Header;
