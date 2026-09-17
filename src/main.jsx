import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import config from '../demo.config.mjs';
import {consumeChat} from './sse.mjs';
import {conversationHistory, remarkCitations, remarkSourceList, safeLink} from './conversation.mjs';
import './style.css';

const Arrow = () => <span aria-hidden="true">↗</span>;
const SendIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;

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

function Dialog({kind, onClose, apiKey, setApiKey, serverKey}) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} onCancel={onClose} className="dialog panel" onClick={event => {if (event.target === ref.current) onClose();}}><div className="dialog-heading"><h2>{kind === 'key' ? 'Connect to Tavily' : 'A conversation with the web.'}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
    {kind === 'key' ? <form onSubmit={event => {event.preventDefault(); onClose();}}><p>{serverKey ? 'A server key is connected. You can use your own key for this tab.' : 'Add your Tavily API key to ask a question.'}</p><label htmlFor="api-key">Tavily API key</label><input id="api-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="off" maxLength={300} placeholder="tvly-…"/><p className="fine-print">Your key stays in this tab’s memory and is sent to the local server only when you ask a question.</p><div className="dialog-actions"><a href="https://app.tavily.com" target="_blank" rel="noreferrer">Get a Tavily key <Arrow/></a><button className="primary" type="submit">Done</button></div></form> : <><p>Ask a question, see the web searches, then explore the sources behind the answer.</p><ol className="how-steps"><li><strong>Ask naturally.</strong><span>Follow up on an answer. The last three completed exchanges provide context.</span></li><li><strong>Tavily searches and answers.</strong><span>Live search activity and answer text stream directly from Tavily Research.</span></li><li><strong>Follow the evidence.</strong><span>Open citations and source links beneath every answer.</span></li></ol><p className="fine-print">One Tavily API key. Research usage is billed to that key. Chats stay in this tab and reset on refresh. Questions and recent context are sent to Tavily.</p><a className="docs-link" href="https://docs.tavily.com/documentation/api-reference/endpoint/research" target="_blank" rel="noreferrer">Explore the Tavily API <Arrow/></a></>}
  </dialog>;
}

function App() {
  const [messages, setMessages] = useState([]), [draft, setDraft] = useState('');
  const [apiKey, setApiKey] = useState(''), [serverKey, setServerKey] = useState(false);
  const [busy, setBusy] = useState(false), [dialog, setDialog] = useState(null), [error, setError] = useState('');
  const controller = useRef(null), scroll = useRef(null), bottom = useRef(null), input = useRef(null), follow = useRef(true);
  const last = messages.at(-1);
  useEffect(() => { fetch('/api/health').then(response => response.json()).then(data => setServerKey(Boolean(data.hasServerKey))).catch(() => {}); return () => controller.current?.abort(); }, []);
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages]);
  useEffect(() => { if (input.current) {input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 130)}px`;} }, [draft]);

  async function send(question = draft, historyMessages = messages) {
    const text = question.trim();
    if (!text || controller.current) return;
    if (!apiKey.trim() && !serverKey) {setDraft(text); setError('Connect your Tavily key to send a message.'); setDialog('key'); return;}
    const assistantId = crypto.randomUUID();
    const newMessages = [...historyMessages, {id: crypto.randomUUID(), role: 'user', content: text}, {id: assistantId, role: 'assistant', content: '', status: 'streaming', sources: [], activity: [], numbered: false}];
    const abort = new AbortController(); controller.current = abort;
    follow.current = true; setMessages(newMessages); setBusy(true); setDraft(''); setError('');
    const update = transform => setMessages(current => current.map(message => message.id === assistantId ? transform(message) : message));
    try {
      const response = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, signal: abort.signal, body: JSON.stringify({message: text, history: conversationHistory(historyMessages), ...(apiKey.trim() ? {apiKey: apiKey.trim()} : {})})});
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

  async function loadExample() {
    if (busy) return;
    try { const response = await fetch('/sample-chat.json'); if (!response.ok) throw new Error(); const sample = await response.json(); setMessages(sample.messages.map(message => ({...message, sample: true}))); setError(''); follow.current = true; }
    catch { setError('The example could not be loaded. Try asking a live question.'); }
  }

  return <><div className="landscape" aria-hidden="true"/><div className="app-shell">
    <header className="topbar"><a href="https://tavily.com" className="brand" target="_blank" rel="noreferrer"><img src="/tavily-by-nebius.svg" alt="Tavily by Nebius"/></a><nav aria-label="Chat controls"><button className="text-button new-chat" disabled={busy || !messages.length} onClick={() => {setMessages([]); setError(''); setDraft(''); input.current?.focus();}}><span aria-hidden="true">↻</span> New chat</button><button className="text-button" onClick={() => setDialog('how')}>How it works <Arrow/></button><a href={config.repository} target="_blank" rel="noreferrer" className="github" aria-label="View Tavily Chat on GitHub"><img src="/github-icon.png" alt=""/></a></nav></header>
    <main className="chat-main"><section className={`hero ${messages.length ? 'compact' : ''}`}><div className="eyebrow">TAVILY CHAT <span>/</span> CONNECTED TO THE WEB</div><h1>Ask. Explore. Go further.</h1><p>A simple conversation, backed by live web search.</p></section>
      <div className="conversation" ref={scroll} onScroll={() => {const el = scroll.current; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;}} aria-label="Conversation">
        {!messages.length ? <section className="welcome"><span className="welcome-mark" aria-hidden="true">✳</span><h2>Where should we start?</h2><p>Follow your curiosity. We’ll find the sources.</p><div className="prompts">{config.prompts.map(prompt => <button key={prompt.label} className="prompt panel" onClick={() => send(prompt.question)}><span className="prompt-icon" aria-hidden="true">{prompt.icon}</span><strong>{prompt.label}</strong><p>{prompt.question}</p><Arrow/></button>)}</div><button className="text-button example-button" onClick={loadExample}>View an example conversation <Arrow/></button></section> : <div className="message-list">{messages.map((message, index) => message.role === 'user' ? <div className="user-message" key={message.id}><span className="sr-only">You: </span>{message.content}</div> : <Answer key={message.id} message={message} onRetry={() => !busy && send(messages[index - 1].content, messages.slice(0, index - 1))}/>)}<div ref={bottom}/></div>}
      </div>
      <div className="composer-area">{error && <p className="composer-error" role="alert">{error}</p>}<form className="composer panel" onSubmit={event => {event.preventDefault(); send();}}><label htmlFor="message" className="sr-only">Ask anything on the web</label><textarea id="message" ref={input} rows="1" maxLength={config.maxMessageLength} placeholder={messages.length ? 'Ask a follow-up…' : 'Ask anything on the web…'} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); if (!busy) send();}}}/>{busy ? <button className="primary stop" type="button" onClick={() => controller.current?.abort()} aria-label="Stop answer"><span className="stop-square" aria-hidden="true"/>{last?.activity?.at(-1)?.stage || 'Connecting'}</button> : <button className="primary send" type="submit" disabled={!draft.trim()} aria-label="Send message"><SendIcon/></button>}</form><div className="composer-footer"><button className="key-toggle" onClick={() => setDialog('key')}><span className={`key-dot ${apiKey.trim() || serverKey ? 'connected' : ''}`}/>{apiKey.trim() || serverKey ? 'Tavily connected' : 'Connect Tavily'}</button><span>Answers from the web. Sources included.</span><span className="keyboard-hint">Enter to send <span aria-hidden="true">↵</span></span></div></div>
    </main>
  </div>{dialog && <Dialog kind={dialog} onClose={() => setDialog(null)} apiKey={apiKey} setApiKey={setApiKey} serverKey={serverKey}/>}</>;
}

createRoot(document.getElementById('root')).render(<App/>);
