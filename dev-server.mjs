// Local stand-in for Netlify: serves dist/ and answers /api/sync with an in-memory store.
// Run: npm run dev   (then open http://localhost:8888)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handleSync } from './netlify/lib/merge.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), 'dist');
const port = Number(process.env.PORT || 8888);
const mem = new Map(); let n = 0;
const store = {
  async get(k) { return mem.has(k) ? structuredClone(mem.get(k)) : null; },
  async set(k, data, { etag, create }) {
    const cur = mem.get(k);
    if (create ? cur : !cur || cur.etag !== etag) return false;
    mem.set(k, { data: structuredClone(data), etag: 'e' + ++n }); return true;
  },
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/sync') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    let raw = ''; for await (const c of req) raw += c;
    let body; try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end('{"error":"Bad request"}'); }
    if (process.env.SYNC_DOWN) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{"error":"Sync server unavailable"}'); }
    const out = await handleSync(body, store);
    res.writeHead(out.status, { 'content-type': 'application/json' }); return res.end(JSON.stringify(out.body));
  }
  const file = path.join(root, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, () => console.log(`Tally dev server on http://localhost:${port}`));
