import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Conversation {
  filename: string;
  title: string;
  date: string;
  messages: number;
}

interface SidebarProps {
  onNewChat: () => void;
  onSelectConversation: (filename: string) => void;
  currentConversation?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onNewChat, 
  onSelectConversation,
  currentConversation 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching conversations from:', `${BASE_URL}/conversations`);
      const response = await fetch(`${BASE_URL}/conversations`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Conversations data:', data);
        setConversations(data.conversations || []);
      } else {
        setError(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Διαγραφή αυτής της συνομιλίας;')) return;

    try {
      const response = await fetch(`${BASE_URL}/conversations/${filename}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.filename !== filename));
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Τώρα';
      if (diffMins < 60) return `${diffMins} λεπτά πριν`;
      if (diffHours < 24) return `${diffHours} ώρες πριν`;
      if (diffDays < 7) return `${diffDays} ημέρες πριν`;
      return dateStr.split(' ')[0];
    } catch {
      return dateStr;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-screen bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-[60] relative flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-200 rounded-lg transition cursor-pointer"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition cursor-pointer"
          title="New chat"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1" />
        <div className="text-xs text-gray-400 transform -rotate-90 whitespace-nowrap">
          {conversations.length} συνομιλίες
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-screen bg-gray-50 border-r border-gray-200 flex flex-col z-[60] relative flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Συνομιλίες</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              console.log('Refresh clicked');
              fetchConversations();
            }}
            className="p-1.5 hover:bg-gray-200 rounded transition cursor-pointer"
            title="Refresh"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              console.log('Collapse clicked');
              setIsCollapsed(true);
            }}
            className="p-1.5 hover:bg-gray-200 rounded transition cursor-pointer"
            title="Collapse"
            type="button"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
        >
          <Plus className="w-5 h-5" />
          Νέα Συνομιλία
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {error ? (
          <div className="text-center py-8 text-red-400 text-sm">
            Error: {error}
            <button 
              onClick={fetchConversations}
              className="block mx-auto mt-2 text-blue-500 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Δεν υπάρχουν συνομιλίες
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {conversations.map((conv) => (
              <div
                key={conv.filename}
                onClick={() => onSelectConversation(conv.filename)}
                className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition ${
                  currentConversation === conv.filename
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {formatDate(conv.date)}
                    </span>
                    <span className="text-xs text-gray-400">
                      • {conv.messages} {conv.messages === 1 ? 'μήνυμα' : 'μηνύματα'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.filename, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 text-center text-xs text-gray-400">
        {conversations.length} συνομιλίες αποθηκευμένες
      </div>
    </div>
  );
};

export default Sidebar;
