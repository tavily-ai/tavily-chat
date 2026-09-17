// Shared by the browser and server. Frames can cross arbitrary byte boundaries.
export async function* readSSE(response) {
  if (!response.body) throw new Error('Streaming is unavailable. Please retry.');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '';
  const parse = frame => ({
    event: frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim() || 'message',
    data: frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'),
  });
  try {
    while (true) {
      const part = await reader.read();
      buffer += decoder.decode(part.value, {stream: !part.done});
      if (buffer.length > 1_000_000) throw new Error('The response is too large. Try a narrower question.');
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index).replace(/\r\n/g, '\n');
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (frame.trim()) yield parse(frame);
      }
      if (part.done) { if (buffer.trim()) yield parse(buffer.replace(/\r\n/g, '\n')); break; }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function consumeChat(response, onEvent) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  let complete = false;
  for await (const frame of readSSE(response)) {
    if (!frame.data) continue;
    const event = JSON.parse(frame.data);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'complete') complete = true;
    onEvent(event);
  }
  if (!complete) throw new Error('The connection ended before the answer finished. Please retry.');
}
