// ---------- Themes ----------
const STYLES = [
  { id: 'pop', name: 'Pop', note: 'Bold outlines, chunky type' },
  { id: 'fiver', name: 'Fresh', note: 'Clean and green' },
  { id: 'receipt', name: 'Receipt', note: 'Monospace on till-roll paper' },
  { id: 'calm', name: 'Calm', note: 'Quiet, like phone settings' },
  { id: 'midnight', name: 'Midnight', note: 'Always dark, brass accent' },
];
const hostTheme = document.documentElement.getAttribute('data-theme');
function applyTheme() {
  const r = document.documentElement;
  if (!STYLES.some((x) => x.id === S.theme.style)) S.theme.style = 'fiver';
  r.setAttribute('data-style', S.theme.style);
  r.removeAttribute('data-palette');
  if (S.theme.mode === 'light' || S.theme.mode === 'dark') r.setAttribute('data-theme', S.theme.mode);
  else if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme');
}
const swatches = () => STYLES.map((p) => `<button type="button" class="stylepick" data-style-pick="${p.id}" aria-pressed="${S.theme.style === p.id}">
  <div class="sp-prev" data-style="${p.id}" aria-hidden="true"><div class="sp-in"><i>tesco 23.40</i><b></b></div>
    <div class="sp-chips"><i></i><i></i><i></i></div>
    <div class="sp-card"><span class="sp-big">£1,765</span><div class="sp-bar"><i></i></div></div></div>
  <span>${p.name}</span><small>${p.note}</small></button>`).join('');


function renderPrefs() {
  const el = $('#view-prefs');
  const learned = Object.entries(S.learned);
  const aliases = Object.entries(S.aliases || {});
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  const pairCheat = isPair() ? `<dt>petrol 55 ${esc(S.people[0].toLowerCase())}</dt><dd>Tag to ${esc(S.people[0])}</dd><dt>dinner 60 split</dt><dd>Shared cost</dd>` : '';
  el.innerHTML = `<div class="stack">
    ${syncSection()}
    <section><div class="sec-h"><h2>Household</h2></div>
    <form class="card form" id="peopleForm">
      <div class="row2"><div class="field"><label for="pName1">Your name</label><input class="input" id="pName1" value="${esc(S.people[0] === 'Me' && !S.setup ? '' : S.people[0])}" placeholder="Me"></div>
      <div class="field"><label for="pName2">Partner (optional)</label><input class="input" id="pName2" value="${esc(S.people[1] || '')}" placeholder="Just me"></div></div>
      ${isPair() ? `<div class="field"><span>New entries on this phone are</span><div class="segctl" role="group" aria-label="Default owner">${['shared'].concat(S.people).map((w) =>
        `<button type="button" data-default-who="${esc(w)}" aria-pressed="${S.defaultWho === w}">${esc(whoLabel(w))}</button>`).join('')}</div></div>` : ''}
      <button class="btn primary" type="submit">Save names</button>
    </form></section>

    <section><div class="sec-h"><h2>Style</h2></div><div class="card form">
      <div class="styles">${swatches()}</div>
      <div class="segctl" role="group" aria-label="Appearance">${[['system', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) =>
        `<button type="button" data-mode="${v}" aria-pressed="${S.theme.mode === v}">${l}</button>`).join('')}</div>
      ${S.theme.style === 'midnight' ? '<p class="hint">Midnight is always dark.</p>' : ''}</div></section>

    <section><div class="sec-h"><h2>Shorthand</h2></div><div class="card"><dl class="cheat">
      <dt>tesco 23.40</dt><dd>£23.40 at Tesco, Groceries</dd><dt>23.40 tesco</dt><dd>Same, any order</dd>
      <dt>+2400 salary</dt><dd>Income (or “salary 2400 in”)</dd>${pairCheat}
      <dt>coffee 3.2 yday</dt><dd>Dated yesterday. Also “fri”, “last mon”, “14/11”</dd>
      <dt>50p</dt><dd>Pence work too, as does “2.4k”</dd><dt>gift 20 #fun</dt><dd>Force a category with #</dd><dt>netflix 10.99 monthly</dt><dd>Make it a fixed cost that repeats</dd><dt>sains 41.12</dt><dd>Sainsbury's. Nicknames and typos for UK shops work too: maccies, spoons, tescp</dd>
    </dl></div></section>

    <section><div class="sec-h"><h2>What it has learned</h2></div><div class="card">
      ${learned.length ? `<div class="setlist">${learned.map(([k, c]) => `<div><span><b>${esc(TP.titleCase(k))}</b> → ${esc((CAT[c] || CAT.other).name)}</span>
        <button type="button" class="link" data-unlearn="${esc(k)}">Forget</button></div>`).join('')}</div>`
        : `<p class="hint">When you change a merchant's category, it's remembered here and used next time.</p>`}
      ${aliases.length ? `<div class="setlist" style="margin-top:10px">${aliases.map(([k, v]) => `<div><span>“${esc(k)}” means <b>${esc(v)}</b></span>
        <button type="button" class="link" data-unalias="${esc(k)}">Forget</button></div>`).join('')}</div>` : ''}
    </div></section>

    <section><div class="sec-h"><h2>Bank statements</h2></div><div class="card form">
      <p class="hint">Download a CSV statement from your bank's app or website, then import it here. You'll see every transaction before anything is added, and ones you've already logged are left out.</p>
      <button type="button" class="btn primary" data-import>Import a bank statement</button></div></section>

    <section><div class="sec-h"><h2>Backup</h2></div><div class="card form">
      <p class="hint">Entries are stored on this device only. Export a backup now and then. To combine two phones, export on one and import on the other; matching entries are merged, not duplicated.</p>
      <div class="btns">${window.TALLY_PWA ? `<button type="button" class="btn" data-export>Export backup</button>` : ""}<button type="button" class="btn" data-copy>Copy backup</button>
      <label class="btn" style="display:grid;place-items:center">Import<input type="file" accept="application/json,.json" id="importFile" hidden></label></div>
    </div></section>

    ${deferredInstall || ios ? `<section><div class="sec-h"><h2>Install</h2></div><div class="card form">
      ${deferredInstall ? `<button type="button" class="btn primary" data-install>Add to home screen</button>` : `<p class="hint">In Safari, tap Share, then “Add to Home Screen”.</p>`}</div></section>` : ''}

    <section><div class="sec-h"><h2>Data</h2></div><div class="card btns">
      ${S.txns.some((t) => t.example) ? `<button type="button" class="btn" data-clear-examples>Clear examples</button>` : ''}
      <button type="button" class="btn danger" data-erase>Erase everything</button></div></section>
    <p class="hint" style="text-align:center">${S.txns.length} entries · amounts in GBP</p>
  </div>`;
}

function savePeople(n1, n2) {
  n1 = (n1 || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'Me';
  n2 = (n2 || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (n2 && n2.toLowerCase() === n1.toLowerCase()) n2 = '';
  const old = S.people.slice();
  S.people = n2 ? [n1, n2] : [n1];
  // carry tags across renames
  const exOwner = (x) => [S.people[0], S.people[1], 'shared'][x.exWho == null ? 2 : x.exWho];
  for (const f of S.fixed) f.who = !isPair() ? null : f.example ? exOwner(f) : S.people[old.indexOf(f.who)] || 'shared';
  for (const t of S.txns) {
    if (!isPair()) { t.who = null; continue; }
    if (t.example && (!S.setup || !t.who)) { t.who = exOwner(t); continue; }
    const i = old.indexOf(t.who);
    if (i >= 0 && S.people[i]) t.who = S.people[i];
    else if (t.who !== 'shared') t.who = 'shared';
  }
  if (!['shared'].concat(S.people).includes(S.defaultWho)) S.defaultWho = 'shared';
  S.setup = true;
  save(); refresh();
  toast(isPair() ? `Set up for ${S.people[0]} and ${S.people[1]}` : `Set up for ${S.people[0]}`);
}

function exportJSON() { return JSON.stringify(Object.assign({ app: 'tally', exported: new Date().toISOString() }, S), null, 1); }
function importJSON(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { toast('That file is not a Budget backup'); return; }
  if (!d || !Array.isArray(d.txns)) { toast('That file is not a Budget backup'); return; }
  const have = new Set(S.txns.map((t) => t.id));
  let n = 0;
  for (const t of d.txns) {
    if (!t || !t.id || have.has(t.id) || !(t.amt > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) continue;
    S.txns.push({ id: t.id, amt: Math.round(t.amt), type: t.type === 'in' ? 'in' : t.type === 'save' ? 'save' : 'out', desc: String(t.desc || '').slice(0, 80), mkey: TP.normKey(t.desc),
      cat: CAT[t.cat] ? t.cat : 'other', date: t.date, who: isPair() ? (t.who === 'shared' || S.people.includes(t.who) ? t.who : 'shared') : null, ts: t.ts || Date.now(), example: !!t.example });
    n++;
  }
  for (const [k, v] of Object.entries(d.learned || {})) if (CAT[v] && S.learned[k] === undefined) S.learned[k] = v;
  const haveF = new Set(S.fixed.map((f) => f.id));
  for (const f of d.fixed || []) if (f && f.id && !haveF.has(f.id) && f.amt > 0 && CAT[f.cat]) S.fixed.push(Object.assign({}, f, { posted: Array.isArray(f.posted) ? f.posted : [], who: isPair() ? f.who : null }));
  for (const [k, v] of Object.entries(d.budgets || {})) if (CAT[k] && S.budgets[k] === undefined && v > 0) S.budgets[k] = v;
  save(); refresh();
  toast(`Imported ${n} new entr${n === 1 ? 'y' : 'ies'}`);
}
