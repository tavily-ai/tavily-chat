import React, {useEffect, useReducer, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import config from '../demo.config.mjs';
import {consumeChat} from './sse.mjs';
import {conversationHistory, remarkCitations, remarkSourceList, safeLink} from './conversation.mjs';
import {chatTitle, createChat, historyReducer, loadHistory, saveHistory} from './chat-history.mjs';
import './style.css';
import './composer.css';
import './header-hover.css';

const Arrow = () => <span aria-hidden="true">↗</span>;
const SendIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChatHistoryIcon = () => <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/></svg>;

function ChatHistory({chats, activeId, busy, onClose, onNew, onSelect, onDelete, onStop, storageError}) {
  const ref = useRef(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => { ref.current.showModal(); }, []);
  useEffect(() => () => window.clearTimeout(ref.current?.closeTimer), []);
  const recent = chats.filter(chat => chat.messages.length).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  function close() {
    if (closing) return;
    setClosing(true);
    ref.current.closeTimer = window.setTimeout(onClose, 210);
  }
  return <dialog id="chat-history" ref={ref} className={`history-drawer ${closing ? 'is-closing' : ''}`} aria-labelledby="history-title" onCancel={event => {event.preventDefault(); close();}} onClick={event => {
    if (event.target !== ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  }}>
    <div className="history-heading"><div><span className="history-eyebrow">YOUR WORKSPACE</span><h2 id="history-title">Chats</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Close chat history">×</button></div>
    <button type="button" className="history-new-chat" onClick={() => {onNew(); close();}} disabled={busy}><span aria-hidden="true">+</span>New chat</button>
    {busy && <div className="history-running"><p>An answer is running. Stop it to switch chats.</p><button type="button" className="text-button" onClick={onStop}>Stop answer <span aria-hidden="true">■</span></button></div>}
    <div className="history-list-heading"><h3>Recent chats</h3><span>{recent.length}</span></div>
    <nav className="history-list" aria-label="Saved chats">
      {recent.length ? <ul>{recent.map(chat => {
        const title = chatTitle(chat), questions = chat.messages.filter(message => message.role === 'user').length;
        return <li key={chat.id} className={chat.id === activeId ? 'is-active' : ''}>
          <button type="button" className="history-chat" disabled={busy} onClick={() => {onSelect(chat.id); close();}} aria-current={chat.id === activeId ? 'true' : undefined} title={title}>
            <span className="history-chat-title">{title}</span><span className="history-chat-meta"><time dateTime={chat.updatedAt}>{new Date(chat.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</time><span aria-hidden="true">·</span>{questions} {questions === 1 ? 'question' : 'questions'}</span>
          </button>
          <button type="button" className="history-delete" disabled={busy} onClick={() => onDelete(chat.id)} aria-label={`Delete chat: ${title}`} title="Delete chat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </li>;
      })}</ul> : <div className="history-empty"><ChatHistoryIcon/><strong>Your conversations, in one place.</strong><p>Start a chat and it will appear here, ready to pick up later.</p></div>}
    </nav>
    <div className="history-footer">{storageError && <p role="alert" className="history-storage-error">{storageError}</p>}<p>Saved in this browser.<br/>API keys are never saved.</p></div>
  </dialog>;
}

function followCitation(event, href) {
  if (!href.startsWith('#source-')) return;
  const target = document.getElementById(href.slice(1));
  const conversation = event.currentTarget.closest('.conversation');
  if (!target || !conversation) return;
  event.preventDefault();
  conversation.scrollTo({top: conversation.scrollTop + target.getBoundingClientRect().top - conversation.getBoundingClientRect().top - 16});
  target.querySelector('a')?.focus({preventScroll: true});
}

function Answer({message, onRetry}) {
  const last = message.activity?.at(-1);
  const busy = message.status === 'streaming';
  return <article className="answer" aria-label="Tavily answer">
    <div className="answer-label"><img src="/tavily-brand-mark.svg" alt=""/><span>Tavily</span><span className="answer-kind">{message.sample ? `Saved example · ${new Date(message.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}` : 'Web answer'}</span></div>
    <div className="answer-body panel" aria-busy={busy}>
      {busy && <div className="research-status" role="status"><span className="pulse"/><span>{last?.stage || 'Connecting to Tavily'}</span>{message.discovered > 0 && <small>{message.discovered} sources found</small>}</div>}
      {busy && !!message.activity?.length && <ol className="activity" aria-label="Live search activity">{message.activity.slice(-4).map((event, index, list) => <li key={event.id} className={index === list.length - 1 ? 'current' : ''}><span aria-hidden="true">›</span><div>{event.message}{event.queries?.length > 0 && <div className="queries">{event.queries.map(query => <span key={query}>{query}</span>)}</div>}</div></li>)}</ol>}
      {message.content && <div className="markdown"><Markdown skipHtml remarkPlugins={[remarkGfm, [remarkSourceList, {sources: message.sources}], [remarkCitations, {sources: message.numbered ? message.sources : [], prefix: message.id}]]} urlTransform={safeLink} components={{
        a: ({href, children}) => href ? <a href={href} onClick={event => followCitation(event, href)} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{children}</a> : <span>{children}</span>,
        img: () => null,
        table: ({children}) => <div className="markdown-table" tabIndex="0" role="region" aria-label="Answer table"><table>{children}</table></div>,
      }}>{message.content}</Markdown></div>}
      {!busy && message.status !== 'complete' && <div className="answer-error" role="alert"><p>{message.error || 'This answer was stopped.'}</p><button className="text-button" onClick={onRetry}>Try this question again <span aria-hidden="true">↻</span></button></div>}
      {message.sources?.length > 0 && <div className="sources"><div className="source-heading">Sources <span>{message.sources.length}</span></div><ol>{message.sources.map(source => <li id={`source-${message.id}-${source.id}`} key={`${source.id}-${source.url}`}><a href={source.url} target="_blank" rel="noreferrer">{message.numbered && <span className="source-number">{source.id}</span>}<span className="source-text"><strong>{source.title}</strong><small>{source.domain}</small></span><Arrow/></a></li>)}</ol></div>}
      {message.status === 'complete' && !message.sources?.length && <p className="source-empty">No source links were returned for this answer.</p>}
    </div>
  </article>;
}

function Dialog({kind, onClose, apiKey, setApiKey, serverKey, openaiApiKey, setOpenaiApiKey, openaiServerKey}) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} onCancel={onClose} className="dialog panel" onClick={event => {if (event.target === ref.current) onClose();}}><div className="dialog-heading"><h2>{kind === 'key' ? 'Connect API keys' : 'A conversation with the web.'}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
    {kind === 'key' ? <form onSubmit={event => {event.preventDefault(); onClose();}}><p>Connect Tavily for web search and OpenAI for streamed answers.</p><label htmlFor="api-key">Tavily API key{serverKey ? ' · Server connected' : ''}</label><input id="api-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="off" maxLength={300} placeholder={serverKey ? 'Use server key, or enter your own' : 'tvly-…'}/><label htmlFor="openai-key">OpenAI API key{openaiServerKey ? ' · Server connected' : ''}</label><input id="openai-key" type="password" value={openaiApiKey} onChange={event => setOpenaiApiKey(event.target.value)} autoComplete="off" maxLength={300} placeholder={openaiServerKey ? 'Use server key, or enter your own' : 'sk-…'}/><p className="fine-print">Keys stay in this tab’s memory and are sent to this app’s server when you ask a question. They are never saved with your chats.</p><div className="dialog-actions"><a href="https://app.tavily.com" target="_blank" rel="noreferrer">Tavily key <Arrow/></a><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI key <Arrow/></a><button className="primary" type="submit">Done</button></div></form> : <><p>Ask a question, see the web searches, then explore the sources behind the answer.</p><ol className="how-steps"><li><strong>Ask naturally.</strong><span>Follow up on an answer. The last three completed exchanges provide context.</span></li><li><strong>Search, then answer.</strong><span>Parallel Tavily searches compare primary and independent sources, then OpenAI streams a concise answer.</span></li><li><strong>Follow the evidence.</strong><span>Open citations and source links beneath every answer.</span></li></ol><p className="fine-print">Tavily and OpenAI API keys are required. Each provider bills its own usage. Chats are saved in this browser; reopen or delete them from the left panel. Questions and recent context go to OpenAI; a focused query goes to Tavily.</p><a className="docs-link" href="https://docs.tavily.com/documentation/api-reference/endpoint/search" target="_blank" rel="noreferrer">Explore the Tavily API <Arrow/></a></>}
  </dialog>;
}

function App() {
  const [history, dispatchHistory] = useReducer(historyReducer, undefined, loadHistory);
  const activeChat = history.chats.find(chat => chat.id === history.activeId);
  const messages = activeChat.messages;
  const [draft, setDraft] = useState(''), [storageError, setStorageError] = useState('');
  const [apiKey, setApiKey] = useState(''), [serverKey, setServerKey] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState(''), [openaiServerKey, setOpenaiServerKey] = useState(false);
  const [busy, setBusy] = useState(false), [dialog, setDialog] = useState(null), [error, setError] = useState('');
  const controller = useRef(null), scroll = useRef(null), bottom = useRef(null), input = useRef(null), follow = useRef(true);
  const last = messages.at(-1);
  useEffect(() => { fetch('/api/health').then(response => response.json()).then(data => {setServerKey(Boolean(data.hasServerKey)); setOpenaiServerKey(Boolean(data.hasOpenAIKey));}).catch(() => {}); return () => controller.current?.abort(); }, []);
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages]);
  useEffect(() => { if (input.current) {input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 130)}px`;} }, [draft]);
  useEffect(() => {
    const persist = () => setStorageError(saveHistory(history) ? '' : 'Chat history could not be saved. Free browser storage or keep this tab open.');
    const timer = setTimeout(persist, 300);
    window.addEventListener('pagehide', persist);
    return () => {clearTimeout(timer); window.removeEventListener('pagehide', persist);};
  }, [history]);

  function setMessages(value, id = activeChat.id) {
    dispatchHistory({type: 'messages', id, value, updatedAt: new Date().toISOString()});
  }
  function openChat(id, keepPanelOpen = false) {
    if (controller.current) return;
    dispatchHistory(id ? {type: 'select', id} : {type: 'new', chat: createChat()});
    setDraft(''); setError(''); if (!keepPanelOpen) setDialog(null); follow.current = true;
    requestAnimationFrame(() => input.current?.focus());
  }
  function deleteChat(id) {
    if (controller.current) return;
    dispatchHistory({type: 'delete', id, replacement: createChat()});
    if (id === activeChat.id) {setDraft(''); setError(''); follow.current = true;}
  }

  async function send(question = draft, historyMessages = messages) {
    const text = question.trim();
    if (!text || controller.current) return;
    if ((!apiKey.trim() && !serverKey) || (!openaiApiKey.trim() && !openaiServerKey)) {setDraft(text); setError('Connect your Tavily and OpenAI keys to send a message.'); setDialog('key'); return;}
    const assistantId = crypto.randomUUID();
    const newMessages = [...historyMessages, {id: crypto.randomUUID(), role: 'user', content: text}, {id: assistantId, role: 'assistant', content: '', status: 'streaming', sources: [], activity: [], numbered: false}];
    const abort = new AbortController(); controller.current = abort;
    follow.current = true; setMessages(newMessages); setBusy(true); setDraft(''); setError('');
    const update = transform => setMessages(current => current.map(message => message.id === assistantId ? transform(message) : message));
    try {
      const response = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, signal: abort.signal, body: JSON.stringify({message: text, history: conversationHistory(historyMessages), ...(apiKey.trim() ? {apiKey: apiKey.trim()} : {}), ...(openaiApiKey.trim() ? {openaiApiKey: openaiApiKey.trim()} : {})})});
      await consumeChat(response, event => update(message => {
        if (event.type === 'activity') return {...message, activity: [...message.activity, {...event, id: crypto.randomUUID()}].slice(-30)};
        if (event.type === 'content') return {...message, content: message.content + event.text};
        if (event.type === 'sources') return {...message, sources: event.sources, numbered: event.numbered};
        if (event.type === 'discovery') return {...message, discovered: event.count};
        if (event.type === 'complete') return {...message, ...event.answer, status: 'complete'};
        return message;
      }));
    } catch (failure) {
      update(message => ({...message, status: abort.signal.aborted ? 'stopped' : 'error', error: abort.signal.aborted ? 'Stopped. Any partial answer above is incomplete.' : failure.message}));
    } finally {controller.current = null; setBusy(false); input.current?.focus();}
  }

  return <><div className="landscape" aria-hidden="true"/><div className="app-shell">
    <header className="topbar"><div className="brand-group"><button type="button" className="history-toggle" onClick={() => setDialog('history')} aria-label="Open chat history" title="Chat history" aria-haspopup="dialog" aria-expanded={dialog === 'history'} aria-controls={dialog === 'history' ? 'chat-history' : undefined}><ChatHistoryIcon/></button><a href="https://tavily.com" className="brand" target="_blank" rel="noreferrer"><img src="/tavily-by-nebius.svg" alt="Tavily by Nebius"/></a></div><nav aria-label="Chat controls"><button className="text-button" onClick={() => setDialog('how')}>How it works <Arrow/></button><a href={config.repository} target="_blank" rel="noreferrer" className="github" aria-label="View Tavily Chat on GitHub"><img src="/github-icon.png" alt=""/></a></nav></header>
    <main className="chat-main">
      <div className="conversation" ref={scroll} onScroll={() => {const el = scroll.current; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;}} aria-label="Conversation">
        {!messages.length ? <section className="welcome"><div className="prompts">{config.prompts.map(prompt => <button key={prompt.label} className="prompt panel" onClick={() => send(prompt.question)}><strong>{prompt.label}</strong><p>{prompt.question}</p><Arrow/></button>)}</div></section> : <div className="message-list">{messages.map((message, index) => message.role === 'user' ? <div className="user-message" key={message.id}><span className="sr-only">You: </span>{message.content}</div> : <Answer key={message.id} message={message} onRetry={() => !busy && send(messages[index - 1].content, messages.slice(0, index - 1))}/>)}<div ref={bottom}/></div>}
      </div>
      <div className="composer-area">{error && <p className="composer-error" role="alert">{error}</p>}<form className="composer panel" onSubmit={event => {event.preventDefault(); send();}}><label htmlFor="message" className="sr-only">Ask anything on the web</label><textarea id="message" ref={input} rows="1" maxLength={config.maxMessageLength} placeholder={messages.length ? 'Ask a follow-up…' : 'Ask anything on the web…'} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); if (!busy) send();}}}/>{busy ? <button className="primary stop" type="button" onClick={() => controller.current?.abort()} aria-label="Stop answer"><span className="stop-square" aria-hidden="true"/>{last?.activity?.at(-1)?.stage || 'Connecting'}</button> : <button className="primary send" type="submit" disabled={!draft.trim()} aria-label="Send message"><SendIcon/></button>}</form><div className="composer-footer"><button type="button" className="text-button" onClick={() => setDialog('key')}>API keys{(apiKey.trim() || serverKey) && (openaiApiKey.trim() || openaiServerKey) ? ' · Connected' : ''}</button><span className="keyboard-hint">Enter to send <span aria-hidden="true">↵</span></span></div></div>
    </main>
  </div>{storageError && dialog !== 'history' && <div className="storage-notice" role="status">{storageError}</div>}{dialog === 'history' ? <ChatHistory chats={history.chats} activeId={history.activeId} busy={busy} onClose={() => setDialog(null)} onNew={() => openChat(undefined, true)} onSelect={id => openChat(id, true)} onDelete={deleteChat} onStop={() => controller.current?.abort()} storageError={storageError}/> : dialog && <Dialog kind={dialog} onClose={() => setDialog(null)} apiKey={apiKey} setApiKey={setApiKey} serverKey={serverKey} openaiApiKey={openaiApiKey} setOpenaiApiKey={setOpenaiApiKey} openaiServerKey={openaiServerKey}/>}</>;
}

createRoot(document.getElementById('root')).render(<App/>);
