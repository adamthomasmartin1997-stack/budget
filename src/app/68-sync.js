// ---------- Sync ----------
// Both phones share a household on the Netlify site. Every entry, fixed cost, goal, budget, learned merchant and the
// names are records; this phone sends whatever changed since the last sync and receives what the other phone changed.
// Example data, the theme and "new entries are" stay on each phone.
const SYNC_KEY = 'tally.sync';
const SYNC_ON = !!window.TALLY_PWA;
let SY = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } })();
function saveSync() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); } catch (e) { /* ignore */ } }
const stable = (v) => (Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
    : JSON.stringify(v));
const LOCAL_FIELDS = ['example', 'exWho'];
const cleanRec = (o) => { const c = {}; for (const k of Object.keys(o)) if (!LOCAL_FIELDS.includes(k) && o[k] !== undefined) c[k] = o[k]; return c; };

function syncRecords() {
  const r = {};
  for (const t of S.txns) if (!t.example) r['t:' + t.id] = cleanRec(t);
  for (const f of S.fixed) if (!f.example) r['f:' + f.id] = cleanRec(f);
  for (const g of S.goals) if (!g.example) r['g:' + g.id] = cleanRec(g);
  for (const [k, cat] of Object.entries(S.learned)) r['l:' + k] = { cat };
  for (const [k, amt] of Object.entries(S.budgets)) r['b:' + k] = { amt };
  for (const [k, name] of Object.entries(S.aliases || {})) r['a:' + k] = { name };
  r['m:people'] = { people: S.people };
  return r;
}
function applyIncoming(changes) {
  const upsert = (arr, id, c) => {
    const i = arr.findIndex((x) => x.id === id);
    if (c.x) { if (i >= 0) arr.splice(i, 1); return; }
    const rec = Object.assign({}, c.d, { id });
    if (i >= 0) arr[i] = rec; else arr.push(rec);
  };
  for (const c of changes) {
    const at = c.k.indexOf(':'), kind = c.k.slice(0, at), id = c.k.slice(at + 1);
    if (kind === 't') upsert(S.txns, id, c);
    else if (kind === 'f') upsert(S.fixed, id, c);
    else if (kind === 'g') upsert(S.goals, id, c);
    else if (kind === 'l') { if (c.x) delete S.learned[id]; else S.learned[id] = c.d.cat; }
    else if (kind === 'a') { if (c.x) delete S.aliases[id]; else S.aliases[id] = c.d.name; }
    else if (kind === 'b') { if (c.x) delete S.budgets[id]; else S.budgets[id] = c.d.amt; }
    else if (c.k === 'm:people' && !c.x && Array.isArray(c.d.people) && c.d.people.length) {
      S.people = c.d.people.slice(0, 2);
      if (!['shared'].concat(S.people).includes(S.defaultWho)) S.defaultWho = 'shared';
    }
  }
}

let syncBusy = false, syncAgain = false, syncTimer = null;
function syncSoon(ms) {
  if (!SYNC_ON || !SY.code) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), ms == null ? 1200 : ms);
}
async function syncNow(opts) {
  opts = opts || {};
  if (!SYNC_ON || !SY.code) return false;
  if (syncBusy) { syncAgain = true; return false; }
  syncBusy = true; SY.state = 'syncing'; renderSyncStatus();
  let ok = false;
  try {
    const now = Date.now(), base = Object.assign({}, SY.base || {}), changes = [];
    if (!opts.pullOnly) {
      const cur = syncRecords();
      for (const [k, v] of Object.entries(cur)) if (base[k] !== stable(v)) changes.push({ k, u: now, d: v });
      for (const k of Object.keys(base)) if (!(k in cur)) changes.push({ k, u: now, x: 1 });
    }
    const res = await fetch('api/sync', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: SY.code, since: SY.version || 0, changes, mode: opts.mode }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `The sync server answered ${res.status}.`);
    for (const c of changes) { if (c.x) delete base[c.k]; else base[c.k] = stable(c.d); }
    const incoming = (body.changes || []).filter((c) => !changes.some((m) => m.k === c.k && m.u === c.u));
    if (incoming.length) applyIncoming(incoming);
    const after = syncRecords();
    for (const c of body.changes || []) { if (after[c.k]) base[c.k] = stable(after[c.k]); else delete base[c.k]; }
    Object.assign(SY, { version: body.version, base, last: Date.now(), error: null, state: 'ok' });
    saveSync();
    if (incoming.length) {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
      postFixed(); renderQuick(); renderChip(); renderView();
    }
    ok = true;
  } catch (e) {
    SY.state = 'error';
    SY.error = navigator.onLine === false ? "You're offline. Changes will sync when you're back online." : e.message || 'Sync failed.';
    saveSync();
  } finally {
    syncBusy = false; renderSyncStatus();
    if (syncAgain) { syncAgain = false; syncSoon(300); }
  }
  return ok;
}

function newHouseholdCode() {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(20));
  return [...b].map((x) => A[x % A.length]).join('').match(/.{4}/g).join('-');
}
const normCode = (s) => (String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').match(/.{1,4}/g) || []).join('-');
const inviteLink = () => `${location.origin}${location.pathname}?join=${SY.code}`;

async function startHousehold() {
  S.txns = S.txns.filter((x) => !x.example); S.fixed = S.fixed.filter((x) => !x.example); S.goals = S.goals.filter((x) => !x.example);
  SY = { code: newHouseholdCode(), version: 0, base: {} }; saveSync(); save();
  const ok = await syncNow();
  if (!ok) { const err = SY.error; SY = {}; saveSync(); toast(err || 'Could not reach the sync server'); }
  refresh();
  return ok;
}
async function joinHousehold(code) {
  const c = normCode(code);
  if (c.replace(/-/g, '').length < 16) { toast('That code looks too short. Check it and try again.'); return false; }
  const before = SY;
  SY = { code: c, version: 0, base: {} };
  const ok = await syncNow({ mode: 'join', pullOnly: true });
  if (!ok) { const err = SY.error; SY = before; saveSync(); toast(err || 'Could not join'); renderView(); return false; }
  S.txns = S.txns.filter((x) => !x.example); S.fixed = S.fixed.filter((x) => !x.example); S.goals = S.goals.filter((x) => !x.example);
  S.setup = true;
  save(); await syncNow(); refresh();
  toast(isPair() ? `Joined ${S.people[0]} and ${S.people[1]}'s household` : 'Joined the household');
  return true;
}
function leaveHousehold() { SY = {}; saveSync(); refresh(); toast('This phone has stopped syncing. Its entries stay here.'); }

function syncAgo() {
  if (!SY.last) return 'not yet';
  const s = Math.round((Date.now() - SY.last) / 1000);
  return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
}
function syncSection() {
  if (!SYNC_ON) return `<section><div class="sec-h"><h2>Sync between phones</h2></div><div class="card"><p class="hint">Sync works on your own website on Netlify. This preview keeps entries on this device only.</p></div></section>`;
  if (!SY.code) return `<section><div class="sec-h"><h2>Sync between phones</h2></div><div class="card form">
    <p class="hint">Share one household between two phones. Everything either of you logs shows up on both.</p>
    <button type="button" class="btn primary" data-sync-start>Start a household</button>
    <form class="row2" data-join-form><input class="input" id="joinCode" placeholder="Paste a household code" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Household code"><button class="btn" type="submit">Join</button></form>
    <p class="hint">Starting a household clears the example data on this phone.</p></div></section>`;
  return `<section><div class="sec-h"><h2>Sync between phones</h2></div><div class="card form">
    <p class="sync-line" id="syncLine">${syncLineHTML()}</p>
    <div class="field"><span>Household code</span><code class="code" id="hhCode">${esc(SY.code)}</code></div>
    <div class="btns"><button type="button" class="btn primary" data-copy-invite>Copy invite link</button><button type="button" class="btn" data-sync-now>Sync now</button></div>
    <p class="hint">Send the invite link to your partner and open it on their phone. Keep the code private: anyone with it can see and change your household.</p>
    <button type="button" class="link" data-sync-leave>Stop syncing on this phone</button></div></section>`;
}
function syncLineHTML() {
  if (SY.state === 'syncing') return '<i class="sdot busy"></i>Syncing…';
  if (SY.state === 'error') return `<i class="sdot err"></i>${esc(SY.error)}`;
  return `<i class="sdot ok"></i>Synced ${esc(syncAgo())}`;
}
function renderSyncStatus() {
  const l = document.getElementById('syncLine');
  if (l) l.innerHTML = syncLineHTML();
  const m = document.getElementById('syncMeta');
  if (m) { m.hidden = !(SYNC_ON && SY.code); m.className = 'sdot ' + (SY.state === 'error' ? 'err' : SY.state === 'syncing' ? 'busy' : 'ok'); m.title = SY.state === 'error' ? SY.error : 'Synced ' + syncAgo(); }
}
if (SYNC_ON) {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
  window.addEventListener('online', () => syncNow());
  setInterval(() => { if (!document.hidden) syncNow(); }, 30000);
}
