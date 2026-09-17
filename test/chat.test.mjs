import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {validateInput, buildRequest, streamAnswer, chat, normalizeSources} from '../server/chat.mjs';
import {createApp, readBody} from '../server/index.mjs';
import {readSSE, consumeChat} from '../src/sse.mjs';
import {conversationHistory, safeLink, remarkCitations, remarkSourceList} from '../src/conversation.mjs';

const frame = delta => `data: ${JSON.stringify({choices: [{delta}]})}\n\n`;
const source = (name = 'NASA') => ({url: `https://${name.toLowerCase()}.gov/news`, title: name});
const answerStream = () => frame({content: 'A cited answer. [1]'}) + frame({sources: [source()]}) + 'event: done\n\n';
const fragmented = text => {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new Response(new ReadableStream({pull(controller) {if (offset === bytes.length) controller.close(); else controller.enqueue(bytes.slice(offset, ++offset));}}));
};

test('validates question limits and complete conversation pairs', () => {
  assert.deepEqual(validateInput({message: '  What’s new?  '}), {message: 'What’s new?', history: []});
  for (const body of [{message: ''}, {message: 'x'.repeat(2001)}, {message: 'Hi', history: [{role: 'system', content: 'secret'}]}, {message: 'Hi', history: [{role: 'user', content: 'Hi'}]}]) assert.throws(() => validateInput(body));
});

test('follow-ups include only the last three complete exchanges, omitting stopped answers', () => {
  const messages = Array.from({length: 4}, (_, index) => [{role: 'user', content: `Question ${index}`}, {role: 'assistant', content: `Answer ${index}`, status: 'complete'}]).flat();
  messages.push({role: 'user', content: 'Stopped question'}, {role: 'assistant', content: 'Partial', status: 'stopped'});
  const history = conversationHistory(messages);
  assert.equal(history.length, 6); assert.equal(history[0].content, 'Question 1');
  assert.equal(history.at(-1).content, 'Answer 3');
  const request = buildRequest({message: 'Which is cheaper?', history}, new Date('2026-09-17T00:00:00Z'));
  assert.match(request.input, /Question 1/); assert.match(request.input, /Which is cheaper/);
  assert.equal(request.model, 'mini'); assert.equal(request.stream, true); assert.equal(request.output_length, 'short');
});

test('SSE supports split UTF-8, CRLF delimiters, comments, and terminal frames without data', async () => {
  const frames = [];
  for await (const event of readSSE(fragmented(': keepalive\r\n\r\ndata: café 👋\r\n\r\nevent: done\r\n\r\n'))) frames.push(event);
  assert.equal(frames[1].data, 'café 👋'); assert.equal(frames[2].event, 'done');
});

test('streams actual activity and text, preserving final citation order', async () => {
  const events = [];
  const body = frame({tool_calls: {tool_call: [{name: 'WebSearch', arguments: 'Executing two queries', queries: ['moon landing']} ]}})
    + frame({tool_calls: {tool_response: [{name: 'WebSearch', sources: [source('ESA'), source()]}]}})
    + answerStream();
  const answer = await streamAnswer(fragmented(body), event => events.push(event));
  assert.equal(answer.content, 'A cited answer. [1]'); assert.equal(answer.sources[0].title, 'NASA'); assert.equal(answer.numbered, true);
  assert.deepEqual(events.find(e => e.type === 'activity').queries, ['moon landing']);
  assert.equal(events.find(e => e.type === 'discovery').count, 2);
});

test('unsafe URLs are removed without renumbering remaining citations', () => {
  const result = normalizeSources([{url: 'javascript:alert(1)'}, source(), {url: 'https://user:secret@example.com'}]);
  assert.equal(result.length, 1); assert.equal(result[0].id, 2);
  assert.equal(safeLink('javascript:alert(1)'), undefined); assert.equal(safeLink('//evil.com'), undefined);
  assert.equal(safeLink('#source-answer-2'), '#source-answer-2');
});

test('only known source numbers become citation links; code and existing links are preserved', () => {
  const tree = {type: 'root', children: [{type: 'paragraph', children: [{type: 'text', value: 'Evidence [1, 2]. Unknown [9].'}, {type: 'inlineCode', value: '[1]'}, {type: 'link', url: 'https://example.com', children: [{type: 'text', value: '[1]'}]}]}]};
  remarkCitations({sources: [{id: 1}, {id: 2}], prefix: 'a'})(tree);
  const nodes = tree.children[0].children;
  assert.equal(nodes[1].url, '#source-a-1'); assert.equal(nodes[2].url, '#source-a-2');
  assert.equal(nodes[3].value, '. Unknown [9].'); assert.equal(nodes[4].value, '[1]'); assert.equal(nodes[5].children[0].type, 'text');
});

test('truncated and error streams fail without presenting a complete answer', async () => {
  await assert.rejects(streamAnswer(new Response(frame({content: 'Partial'}))), /Incomplete/);
  await assert.rejects(streamAnswer(new Response('event: error\ndata: secret provider payload\n\n')), /Upstream/);
  await assert.rejects(streamAnswer(new Response('data: {"object":"error","error":"secret"}\n\n')), /Upstream/);
});

test('duplicate bibliography removal requires matching source URLs and preserves other sections', () => {
  const makeTree = url => ({type: 'root', children: [{type: 'paragraph', children: [{type: 'text', value: 'Answer.'}]}, {type: 'heading', children: [{type: 'text', value: 'Sources'}]}, {type: 'list', children: [{type: 'listItem', children: [{type: 'paragraph', children: [{type: 'link', url, children: [{type: 'text', value: 'NASA'}]}]}]}]}]});
  const matching = makeTree(source().url); remarkSourceList({sources: [source()]})(matching); assert.equal(matching.children.length, 1);
  const other = makeTree('https://other.gov'); remarkSourceList({sources: [source()]})(other); assert.equal(other.children.length, 3);
});

test('discovery-only fallback does not attach unverified citation numbers', async () => {
  const body = frame({tool_calls: {tool_response: [{sources: [source()]}]}}) + frame({content: 'Answer [1]'}) + 'data: [DONE]\n\n';
  const answer = await streamAnswer(new Response(body));
  assert.equal(answer.sources.length, 1); assert.equal(answer.numbered, false);
});

test('provider errors expose useful messages without echoing secrets', async () => {
  for (const [status, expected] of [[401, /API key/], [429, /too many requests/], [432, /usage limit/], [500, /could not finish/]]) {
    const events = [];
    const result = await chat({message: 'Hi', history: []}, {apiKey: 'secret-value', emit: e => events.push(e), fetchImpl: async () => new Response('secret-value', {status})});
    assert.equal(result, null); assert.match(events.at(-1).message, expected); assert.doesNotMatch(JSON.stringify(events), /secret-value/);
  }
});

test('abort reaches Tavily and stops the stream', async () => {
  const controller = new AbortController();
  const task = chat({message: 'Hi', history: []}, {apiKey: 'test', signal: controller.signal, fetchImpl: async (_, options) => {
    await new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), {once: true}));
  }});
  controller.abort(); await assert.rejects(task, {name: 'AbortError'});
});

test('browser consumer detects premature closure and forwarded errors', async () => {
  await assert.rejects(consumeChat(new Response('data: {"type":"content","text":"hi"}\n\n'), () => {}), /before the answer finished/);
  await assert.rejects(consumeChat(new Response('data: {"type":"error","message":"Check key"}\n\n'), () => {}), /Check key/);
});

test('HTTP endpoint streams answers and keeps the server key out of responses', async t => {
  let request;
  const app = createApp({serverKey: 'test-private-key', fetchImpl: async (_, options) => {request = options; return new Response(answerStream());}});
  app.listen(0, '127.0.0.1'); await once(app, 'listening'); t.after(() => app.close());
  const url = `http://127.0.0.1:${app.address().port}`;
  const health = await (await fetch(url + '/api/health')).json(); assert.deepEqual(health, {ok: true, hasServerKey: true});
  const response = await fetch(url + '/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: 'Explain lunar exploration'})});
  const events = []; await consumeChat(response, event => events.push(event));
  assert.equal(events.at(-1).type, 'complete'); assert.equal(request.headers.Authorization, 'Bearer test-private-key'); assert.doesNotMatch(JSON.stringify(events), /test-private-key/);
  const crossOrigin = await fetch(url + '/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: 'https://other.example'}, body: '{}'});
  assert.equal(crossOrigin.status, 403);
});

test('HTTP missing-key and invalid-body requests never call Tavily', async t => {
  const app = createApp({serverKey: '', fetchImpl: async () => {throw new Error('Must not call');}});
  app.listen(0, '127.0.0.1'); await once(app, 'listening'); t.after(() => app.close());
  const url = `http://127.0.0.1:${app.address().port}/api/chat`;
  const request = body => fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  assert.equal((await request({message: 'Hi'})).status, 401);
  assert.equal((await request({message: ''})).status, 400);
});

test('request decoding preserves Unicode split across HTTP chunks and enforces size limits', async () => {
  const body = Buffer.from(JSON.stringify({message: 'Café 👋 東京'}));
  const chunks = async function* () {for (const byte of body) yield Buffer.from([byte]);};
  assert.deepEqual(await readBody(chunks()), {message: 'Café 👋 東京'});
  const large = async function* () {yield Buffer.alloc(65537);};
  await assert.rejects(readBody(large()), /too large/);
});
