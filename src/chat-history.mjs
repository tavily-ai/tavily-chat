import {safeLink} from './conversation.mjs';

export const HISTORY_KEY = 'tavily-chat-history-v1';

export function createChat() {
  return {id: crypto.randomUUID(), updatedAt: new Date().toISOString(), messages: []};
}

export function emptyHistory() {
  const chat = createChat();
  return {activeId: chat.id, chats: [chat]};
}

export function chatTitle(chat) {
  return chat.messages.find(message => message.role === 'user')?.content.replace(/\s+/g, ' ').trim() || 'New chat';
}

export function historyReducer(state, action) {
  if (action.type === 'new') return {activeId: action.chat.id, chats: [action.chat, ...state.chats.filter(chat => chat.messages.length)]};
  if (action.type === 'select' && state.chats.some(chat => chat.id === action.id)) return {...state, activeId: action.id};
  if (action.type === 'delete') {
    const chats = state.chats.filter(chat => chat.id !== action.id);
    if (state.activeId !== action.id) return {...state, chats};
    const next = [...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || action.replacement;
    return {activeId: next.id, chats: chats.length ? chats : [next]};
  }
  if (action.type === 'messages') return {...state, chats: state.chats.map(chat => chat.id === action.id ? {
    ...chat, updatedAt: action.updatedAt, messages: typeof action.value === 'function' ? action.value(chat.messages) : action.value,
  } : chat)};
  return state;
}

function storedMessage(message) {
  const value = {id: message.id, role: message.role, content: message.content};
  if (message.role === 'assistant') Object.assign(value, {
    status: message.status, sources: (message.sources || []).map(({id, url, title, domain}) => ({id, url, title, domain})),
    numbered: Boolean(message.numbered), sample: Boolean(message.sample), completedAt: message.completedAt, error: message.error,
  });
  return value;
}

export function serializeHistory(state) {
  return JSON.stringify({version: 1, activeId: state.activeId, chats: state.chats.filter(chat => chat.messages.length).map(chat => ({
    id: chat.id, updatedAt: chat.updatedAt, messages: chat.messages.map(storedMessage),
  }))});
}

export function deserializeHistory(raw) {
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.chats)) return emptyHistory();
    const seen = new Set();
    const chats = data.chats.flatMap(chat => {
      if (!chat || typeof chat.id !== 'string' || seen.has(chat.id) || !Array.isArray(chat.messages) || !Number.isFinite(Date.parse(chat.updatedAt))) return [];
      seen.add(chat.id);
      const messages = [], messageIds = new Set();
      for (const message of chat.messages) {
        if (!message || typeof message.id !== 'string' || !/^[\w-]+$/.test(message.id) || messageIds.has(message.id) || typeof message.content !== 'string') continue;
        if (!['user', 'assistant'].includes(message.role) || (message.role === 'assistant' && messages.at(-1)?.role !== 'user')) continue;
        messageIds.add(message.id);
        const restored = {id: message.id, role: message.role, content: message.content};
        if (message.role === 'assistant') {
          const status = ['complete', 'error', 'stopped'].includes(message.status) ? message.status : 'stopped';
          Object.assign(restored, {status, activity: [], numbered: Boolean(message.numbered), sample: Boolean(message.sample),
            completedAt: Number.isFinite(Date.parse(message.completedAt)) ? message.completedAt : undefined,
            error: message.status === 'streaming' ? 'This answer was interrupted when the page closed. Try the question again.' : typeof message.error === 'string' ? message.error : undefined,
            sources: Array.isArray(message.sources) ? message.sources.flatMap(source => {
              const url = safeLink(source?.url);
              if (!url || url.startsWith('#') || !Number.isInteger(source.id) || source.id < 1) return [];
              return [{id: source.id, url, title: typeof source.title === 'string' ? source.title : new URL(url).hostname, domain: new URL(url).hostname}];
            }) : [],
          });
        }
        messages.push(restored);
      }
      return messages.length ? [{id: chat.id, updatedAt: new Date(chat.updatedAt).toISOString(), messages}] : [];
    });
    if (chats.some(chat => chat.id === data.activeId)) return {activeId: data.activeId, chats};
    const blank = createChat();
    return {activeId: blank.id, chats: [blank, ...chats]};
  } catch { return emptyHistory(); }
}

export function loadHistory(storage) {
  try { return deserializeHistory((storage || window.localStorage).getItem(HISTORY_KEY)); }
  catch { return emptyHistory(); }
}

export function saveHistory(state, storage) {
  try { (storage || window.localStorage).setItem(HISTORY_KEY, serializeHistory(state)); return true; }
  catch { return false; }
}
