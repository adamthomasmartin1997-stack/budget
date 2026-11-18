// node test/merge.test.mjs : sync merge rules, including two phones racing
import assert from 'node:assert/strict';
import { applyChanges, changesSince, handleSync, validate } from '../netlify/lib/merge.mjs';

const code = 'tally-test-household-code-1234';
let step = 0;
const ok = (name) => console.log('ok  ', ++step, name);

// newer change wins, older is ignored
let { doc } = applyChanges(null, [{ k: 't:1', u: 100, d: { amt: 1 } }]);
({ doc } = applyChanges(doc, [{ k: 't:1', u: 50, d: { amt: 2 } }]));
assert.equal(doc.records['t:1'].d.amt, 1); ok('older change loses');
({ doc } = applyChanges(doc, [{ k: 't:1', u: 200, d: { amt: 3 } }]));
assert.equal(doc.records['t:1'].d.amt, 3); assert.equal(doc.version, 2); ok('newer change wins and bumps version');
({ doc } = applyChanges(doc, [{ k: 't:1', u: 300, x: 1 }]));
assert.equal(doc.records['t:1'].x, 1); assert.deepEqual(changesSince(doc, 2), [{ k: 't:1', u: 300, x: 1 }]); ok('deletes become tombstones');
const r = applyChanges(doc, [{ k: 't:1', u: 300, x: 1 }]); assert.equal(r.changed, false); ok('repeat change is a no-op');
assert.ok(validate({ code: 'short' })); assert.equal(validate({ code, since: 0, changes: [] }), null); ok('validation');

// in-memory store with etags, plus a race where another phone writes between read and write
function memStore() {
  const m = new Map(); let n = 0;
  return { m, async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
    async set(k, data, { etag, create }) {
      const cur = m.get(k);
      if (create ? cur : !cur || cur.etag !== etag) return false;
      m.set(k, { data: structuredClone(data), etag: 'e' + ++n }); return true;
    } };
}
const store = memStore();
let res = await handleSync({ code, mode: 'join', since: 0, changes: [] }, store);
assert.equal(res.status, 404); ok('joining an unknown household is refused');
res = await handleSync({ code, since: 0, changes: [{ k: 't:a', u: 1, d: { desc: 'Tesco' } }] }, store);
assert.equal(res.status, 200); assert.equal(res.body.version, 1); ok('phone A creates household');
res = await handleSync({ code, mode: 'join', since: 0, changes: [] }, store);
assert.equal(res.body.changes.length, 1); assert.equal(res.body.changes[0].d.desc, 'Tesco'); ok('phone B joins and receives A\'s entry');

// race: wrap store so the first write after a read loses to a concurrent writer
const racy = { ...store, raced: false, async get(k) { return store.get(k); },
  async set(k, d, o) {
    if (!this.raced) { this.raced = true; await handleSync({ code, since: 0, changes: [{ k: 't:b', u: 5, d: { desc: 'Coffee' } }] }, store); }
    return store.set(k, d, o);
  } };
res = await handleSync({ code, since: 1, changes: [{ k: 't:c', u: 6, d: { desc: 'Petrol' } }] }, racy);
assert.equal(res.status, 200);
const keys = res.body.changes.map((c) => c.k).sort();
assert.deepEqual(keys, ['t:b', 't:c']); ok('concurrent writes from two phones are both kept');

const wrong = await handleSync({ code: 'tally-some-other-code-9999', mode: 'join', since: 0, changes: [] }, store);
assert.equal(wrong.status, 404); ok('another code cannot see this household');
console.log('all merge tests passed');
