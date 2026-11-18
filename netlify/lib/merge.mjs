// Household sync: one document per household holding every record (entries, fixed costs, goals, settings).
// Each record keeps the time it was last changed (u) and the household version it was stored at (v).
// Newer changes win per record; deletions are kept as tombstones so other phones learn about them.

export const LIMITS = { codeMin: 16, codeMax: 100, changes: 5000, keyMax: 100, recordBytes: 20000, records: 50000 };

export function validate(body) {
  if (!body || typeof body !== 'object') return 'Missing body';
  if (typeof body.code !== 'string' || body.code.length < LIMITS.codeMin || body.code.length > LIMITS.codeMax) return 'Invalid household code';
  if (body.since !== undefined && !(Number.isInteger(body.since) && body.since >= 0)) return 'Invalid version';
  if (body.changes !== undefined && !Array.isArray(body.changes)) return 'Invalid changes';
  const changes = body.changes || [];
  if (changes.length > LIMITS.changes) return 'Too many changes at once';
  for (const c of changes) {
    if (!c || typeof c.k !== 'string' || !c.k || c.k.length > LIMITS.keyMax) return 'Invalid record key';
    if (!Number.isFinite(c.u)) return 'Invalid change time';
    if (!c.x && (c.d === undefined || JSON.stringify(c.d).length > LIMITS.recordBytes)) return 'Invalid record';
  }
  return null;
}

/** Applies changes to doc (mutating a copy). Returns { doc, changed }. */
export function applyChanges(doc, changes) {
  const out = doc ? { version: doc.version, records: { ...doc.records } } : { version: 0, records: {} };
  const v = out.version + 1;
  let changed = false;
  for (const c of changes || []) {
    const cur = out.records[c.k];
    if (cur && cur.u > c.u) continue; // a newer change is already stored
    const next = c.x ? { u: c.u, x: 1, v } : { u: c.u, d: c.d, v };
    if (cur && cur.u === c.u && !!cur.x === !!c.x && JSON.stringify(cur.d) === JSON.stringify(c.d)) continue;
    out.records[c.k] = next;
    changed = true;
  }
  if (Object.keys(out.records).length > LIMITS.records) throw new Error('Household is full');
  if (changed) out.version = v;
  return { doc: out, changed };
}

export function changesSince(doc, since) {
  const res = [];
  for (const [k, r] of Object.entries(doc.records)) if (r.v > since) res.push(r.x ? { k, u: r.u, x: 1 } : { k, u: r.u, d: r.d });
  return res;
}

export async function householdKey(code) {
  const norm = code.trim().toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tally:' + norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Handles one sync request against a store with get(key) -> {data, etag} | null and
 * set(key, data, {etag | create}) -> boolean (false when someone else wrote first).
 */
export async function handleSync(body, store) {
  const err = validate(body);
  if (err) return { status: 400, body: { error: err } };
  const key = await householdKey(body.code);
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.get(key);
    if (!cur && body.mode === 'join') return { status: 404, body: { error: 'No household uses that code. Check it and try again.' } };
    let res;
    try { res = applyChanges(cur ? cur.data : null, body.changes); } catch (e) { return { status: 413, body: { error: e.message } }; }
    if (res.changed || !cur) {
      const ok = await store.set(key, res.doc, cur ? { etag: cur.etag } : { create: true });
      if (!ok) { await new Promise((r) => setTimeout(r, 40 + Math.random() * 120)); continue; } // lost a race: re-read and retry
    }
    return { status: 200, body: { version: res.doc.version, changes: changesSince(res.doc, body.since || 0) } };
  }
  return { status: 409, body: { error: 'Busy, try again in a moment' } };
}
