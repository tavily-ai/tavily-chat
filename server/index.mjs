import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, validateInput, InputError } from './chat.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = (res, status, value) => { res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); };
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.otf':'font/otf','.json':'application/json'};

export async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > 65536) throw new InputError('Request is too large.');
    chunks.push(bytes);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(body); } catch { throw new InputError('Send a valid JSON request.'); }
}

export function createApp({ fetchImpl = fetch, serverKey = process.env.TAVILY_API_KEY || '', openaiServerKey = process.env.OPENAI_API_KEY || '', vite } = {}) {
  let active = 0;
  const recent = new Map();
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/health' && req.method === 'GET') return json(res, 200, {ok:true, hasServerKey: Boolean(serverKey), hasOpenAIKey: Boolean(openaiServerKey)});
    if (path === '/api/chat' && req.method === 'POST') {
      let acquired = false;
      try {
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res,403,{error:'Cross-origin requests are not allowed.'});
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'Use application/json.'});
        const body = await readBody(req);
        const input = validateInput(body);
        if (body.apiKey != null && (typeof body.apiKey !== 'string' || body.apiKey.length > 300)) throw new InputError('Enter a valid Tavily API key.');
        if (body.openaiApiKey != null && (typeof body.openaiApiKey !== 'string' || body.openaiApiKey.length > 300)) throw new InputError('Enter a valid OpenAI API key.');
        const apiKey = body.apiKey?.trim() || serverKey;
        const openaiApiKey = body.openaiApiKey?.trim() || openaiServerKey;
        if (!apiKey) return json(res,401,{error:'Add your Tavily API key to start a live search.'});
        if (!openaiApiKey) return json(res,401,{error:'Add your OpenAI API key to generate answers.'});
        const now = Date.now();
        for (const [ip, time] of recent) if (now - time > 60000) recent.delete(ip);
        const ip = req.socket.remoteAddress;
        if (active >= 2 || now - (recent.get(ip) || 0) < 2000) return json(res,429,{error:'Please wait a moment before starting another search.'});
        recent.set(ip, now); active++; acquired = true;
        res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.flushHeaders();
        const controller = new AbortController();
        const onClose = () => controller.abort();
        res.on('close',onClose);
        const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': keepalive\n\n'); }, 15000);
        try {
          await chat(input, {apiKey, openaiApiKey, fetchImpl, signal:controller.signal, emit: event => {if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);} });
        } finally { clearInterval(heartbeat); res.off('close',onClose); }
        res.end();
      } catch (error) {
        if (!res.headersSent) json(res, error instanceof InputError ? 400 : 500, {error: error instanceof InputError ? error.message : 'Could not complete the request.'});
        else if (!res.destroyed) { res.write(`data: ${JSON.stringify({type:'error',message:'The answer stopped unexpectedly. Please retry.'})}\n\n`); res.end(); }
      } finally { if (acquired) active--; }
      return;
    }
    if (path.startsWith('/api/')) return json(res,404,{error:'Not found'});
    if (!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Method not allowed'});
    if (vite) return vite.middlewares(req,res,() => json(res,404,{error:'Not found'}));
    try {
      const dist = resolve(root,'dist');
      const file = resolve(dist, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
      if (!file.startsWith(dist + sep)) return json(res,403,{error:'Forbidden'});
      const data = await readFile(file);
      res.writeHead(200,{'Content-Type':mime[extname(file)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { json(res,404,{error:'Not found. Run npm run build before npm start.'}); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const vite = process.argv.includes('--dev') ? await (await import('vite')).createServer({root,server:{middlewareMode:true,hmr:{port:24687}},appType:'spa'}) : null;
  const app = createApp({vite});
  const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000);
  app.listen(port, host, () => console.log(`Tavily demo ready at http://${host}:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { app.close(); vite?.close(); });
}
