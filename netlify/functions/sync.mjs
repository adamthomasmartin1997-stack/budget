import { getStore } from '@netlify/blobs';
import { handleSync } from '../lib/merge.mjs';

// POST /api/sync  { code, since, changes, mode? }  ->  { version, changes }
export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
  if (Number(req.headers.get('content-length') || 0) > 2_000_000) return Response.json({ error: 'Too large' }, { status: 413 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const blobs = getStore({ name: 'tally-households', consistency: 'strong' });
  const store = {
    async get(key) {
      const r = await blobs.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(key, data, { etag, create }) {
      const r = await blobs.setJSON(key, data, create ? { onlyIfNew: true } : { onlyIfMatch: etag });
      return r ? r.modified !== false : true;
    },
  };
  const res = await handleSync(body, store);
  return Response.json(res.body, { status: res.status, headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/api/sync' };
