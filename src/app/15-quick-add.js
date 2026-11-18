// ---------- Quick add ----------
function current() {
  const p = TP.parse(qa.input.value, ctx());
  const ov = qa.ov;
  if (ov.amt !== undefined) p.amt = ov.amt;
  if (ov.desc !== undefined) { p.desc = ov.desc; p.mkey = TP.normKey(ov.desc); }
  if (ov.date !== undefined) p.date = ov.date;
  if (ov.recur !== undefined) p.recur = ov.recur;
  if (ov.who !== undefined) p.who = ov.who;
  if (ov.type !== undefined && ov.type !== p.type) {
    p.type = ov.type;
    if (p.type === 'in' && p.cat !== 'income') p.cat = 'income';
    if (p.type === 'out' && p.cat === 'income') p.cat = TP.keywordCategory(p.mkey) || 'other';
  }
  if (ov.type === 'save' && !isSave(p.cat)) p.cat = 'savings';
  if (ov.cat !== undefined) { p.cat = ov.cat; p.catSource = 'chosen'; }
  if (p.type !== 'in') p.type = isSave(p.cat) ? 'save' : 'out';
  if (!isPair()) p.who = null;
  p.valid = p.amt > 0;
  return p;
}

function renderWho() {
  qa.who.hidden = !isPair();
  if (!isPair()) return;
  const w = qa.input.value.trim() || qa.ov.who !== undefined ? current().who : S.defaultWho;
  qa.who.innerHTML = S.people.concat('shared').map((x) =>
    `<button type="button" role="radio" class="who-b ${whoClass(x)}" data-who="${esc(x)}" aria-checked="${x === w}">${esc(whoLabel(x))}</button>`).join('');
}

function renderChip() {
  renderWho();
  const text = qa.input.value.trim();
  if (!text && !Object.keys(qa.ov).length) {
    qa.chip.innerHTML = '';
    qa.box.querySelector('.qa-go').setAttribute('aria-disabled', 'true');
    return;
  }
  qa.chip.classList.remove('is-hint');
  const p = current();
  const segs = [];
  segs.push(p.amt
    ? `<button type="button" class="seg amt${p.type === 'in' ? ' in' : p.type === 'save' ? ' save' : ''}" data-edit="amt"><span>${p.type === 'in' ? '+' : ''}${money(p.amt)}${p.type === 'save' ? ' ' + saveWord(p.cat) : ''}</span></button>`
    : `<button type="button" class="seg missing" data-edit="amt"><span>Add amount</span></button>`);
  if (p.desc) segs.push(`<button type="button" class="seg" data-edit="desc"><span>${esc(p.desc)}</span></button>`);
  segs.push(`<button type="button" class="seg${p.catSource === 'learned' ? ' auto-learned' : ''}" data-edit="cat">${dot(p.cat)}<span>${esc(CAT[p.cat].name)}</span></button>`);
  segs.push(`<button type="button" class="seg" data-edit="date"><span>${esc(dateLabel(p.date))}</span></button>`);
  // who it's for is shown by the dropdown beside the box, so it isn't repeated here
  if (p.recur && p.type !== 'in') segs.push(`<button type="button" class="seg recur" data-edit="recur" aria-label="Repeats monthly. Tap to make it a one-off"><span>Monthly on the ${ordinal(+p.date.slice(8))} ✕</span></button>`);
  qa.chip.innerHTML = segs.join('');
  qa.box.querySelector('.qa-go').setAttribute('aria-disabled', p.valid ? 'false' : 'true');
}

/* Shortcut buttons appear only after four weeks of real use, and only for things repeated at the same amount
   (3+ times in the last 60 days). Example data and fixed costs never count. */
function computeQuick() {
  const t = todayISO();
  const real = S.txns.filter((x) => !x.example && !x.fixedId && x.mkey);
  if (!real.length) return [];
  const first = real.reduce((m, x) => (x.date < m ? x.date : m), t);
  if (first > addDays(t, -28)) return [];
  const cutoff = addDays(t, -60), now = Date.now();
  const groups = new Map();
  for (const x of real) {
    if (x.date < cutoff) continue;
    const k = x.mkey + '|' + x.amt + '|' + x.type;
    let g = groups.get(k);
    if (!g) { g = { mkey: x.mkey, amt: x.amt, type: x.type, n: 0, score: 0, lastTs: 0 }; groups.set(k, g); }
    g.n++;
    g.score += Math.exp(-Math.max(0, (now - fromISO(x.date).getTime()) / 864e5) / 21);
    if ((x.ts || 0) >= g.lastTs) { g.lastTs = x.ts || 0; g.desc = x.desc; g.cat = x.cat; g.who = x.who; }
  }
  return [...groups.values()].filter((g) => g.n >= 3).sort((a, c) => c.score - a.score).slice(0, 4);
}
function renderQuick() {
  qa.quickItems = computeQuick();
  qa.quick.innerHTML = qa.quickItems.map((g, i) =>
    `<button type="button" class="qbtn" data-quick="${i}" aria-label="Log ${esc(g.desc)} ${money(g.amt)} now"><b>${esc(g.desc)}</b><small>${g.type === 'in' ? '+' : ''}${money(g.amt)}</small></button>`).join('');
}

function addTxn(fields, opts) {
  const t = Object.assign({ id: uid(), ts: Date.now() }, fields);
  if (!isPair()) t.who = null;
  else if (!t.who) t.who = S.defaultWho;
  S.txns.push(t);
  save();
  refresh();
  toast(`${t.type === 'in' ? 'Added +' : t.type === 'save' ? (t.cat === 'invest' ? 'Invested ' : 'Saved ') : 'Logged '}${money(t.amt)} · ${t.desc}`, () => {
    S.txns = S.txns.filter((x) => x.id !== t.id);
    if (opts && opts.learnedBefore !== undefined) {
      if (opts.learnedBefore === null) delete S.learned[t.mkey]; else S.learned[t.mkey] = opts.learnedBefore;
    }
    save(); refresh();
  });
  return t;
}

function submitQuick() {
  const p = current();
  if (!p.valid) {
    qa.box.classList.remove('shake'); void qa.box.offsetWidth; qa.box.classList.add('shake');
    setTimeout(() => qa.box.classList.remove('shake'), 400);
    qa.input.focus();
    return;
  }
  const desc = p.desc || CAT[p.cat].name;
  const mkey = p.mkey || TP.normKey(desc);
  let learnedBefore;
  // Learning: a category picked by hand for a named merchant is remembered for next time.
  if (qa.ov.cat !== undefined && p.mkey) {
    learnedBefore = S.learned[mkey] === undefined ? null : S.learned[mkey];
    const auto = TP.keywordCategory(mkey) || 'other';
    if (qa.ov.cat === auto) delete S.learned[mkey]; else S.learned[mkey] = qa.ov.cat;
  }
  // Learning names: if the name was corrected in the preview, that spelling means the corrected name from now on.
  if (qa.ov.desc !== undefined) learnAlias(p.rawKey, desc);
  if (p.recur && p.type !== 'in') {
    const f = { id: uid(), desc, amt: p.amt, day: +p.date.slice(8), cat: p.cat, who: isPair() ? p.who || S.defaultWho : null, start: monthOf(p.date), posted: [monthOf(p.date)], active: true };
    S.fixed.push(f);
    const tx = addTxn({ amt: p.amt, type: p.type, desc, mkey, cat: p.cat, date: p.date, who: p.who, fixedId: f.id }, { learnedBefore });
    toast(`${desc} ${money(p.amt)} logged · repeats on the ${ordinal(f.day)} monthly`, () => {
      S.txns = S.txns.filter((x) => x.id !== tx.id); S.fixed = S.fixed.filter((x) => x.id !== f.id); save(); refresh();
    });
  } else addTxn({ amt: p.amt, type: p.type, desc, mkey, rawKey: p.rawKey || undefined, cat: p.cat, date: p.date, who: p.who }, { learnedBefore });
  qa.input.value = '';
  qa.ov = {};
  renderChip();
  qa.input.focus();
}

qa.form.addEventListener('submit', (e) => { e.preventDefault(); submitQuick(); });
// The dropdown sets who this and following entries belong to; a typed name still wins for a single entry.
// One tap sets who this and following entries belong to; a name typed in the box still wins for that one entry.
qa.who.addEventListener('mousedown', (e) => e.preventDefault()); // keep the keyboard up
qa.who.addEventListener('click', (e) => {
  const b = e.target.closest('[data-who]');
  if (!b) return;
  const v = b.dataset.who;
  S.defaultWho = v;
  save();
  const parsed = TP.parse(qa.input.value, ctx());
  if (parsed.whoExplicit) qa.ov.who = v; else delete qa.ov.who;
  renderChip();
  if (ui.tab === 'prefs') renderPrefs();
  if (document.activeElement !== qa.input && qa.input.value) qa.input.focus();
});
qa.input.addEventListener('input', () => { if (!qa.input.value.trim()) qa.ov = {}; renderChip(); });
// keep the keyboard up when the tick is pressed
$('#qaSave').addEventListener('mousedown', (e) => e.preventDefault());
qa.quick.addEventListener('mousedown', (e) => e.preventDefault());

qa.quick.addEventListener('click', (e) => {
  const b = e.target.closest('[data-quick]');
  if (!b) return;
  const g = qa.quickItems[+b.dataset.quick];
  if (!g) return;
  addTxn({ amt: g.amt, type: g.type, desc: g.desc, mkey: g.mkey, cat: g.cat, date: todayISO(), who: isPair() ? g.who : null });
});

qa.chip.addEventListener('click', (e) => {
  const b = e.target.closest('[data-edit]');
  if (b) editField(b.dataset.edit);
});

function backToInput() { closeSheet(); renderChip(); qa.input.focus(); }

function editField(field) {
  const p = current();
  if (field === 'recur') { qa.ov.recur = false; renderChip(); qa.input.focus(); return; }
  if (field === 'amt') {
    openSheet('Amount', `
      <form class="form" data-form>
        <div class="field"><label for="fAmt">Amount (£)</label>
          <input class="input big-in" id="fAmt" inputmode="decimal" autocomplete="off" value="${p.amt ? (p.amt / 100).toFixed(2) : ''}" placeholder="0.00"></div>
        <div class="segctl" role="group" aria-label="Money in or out">
          <button type="button" data-act="type" data-v="out" aria-pressed="${p.type === 'out'}">Spent</button>
          <button type="button" data-act="type" data-v="save" aria-pressed="${p.type === 'save'}">Saved</button>
          <button type="button" data-act="type" data-v="in" aria-pressed="${p.type === 'in'}">Received</button>
        </div>
        <button class="btn primary" type="submit">Done</button>
      </form>`, (act, el, body) => {
      if (act === 'type') { body.querySelectorAll('[data-act=type]').forEach((x) => x.setAttribute('aria-pressed', String(x === el))); return; }
      if (act === 'submit') {
        const a = TP.parseAmount($('#fAmt', body).value.replace(/\s/g, ''));
        if (!a) { $('#fAmt', body).focus(); return; }
        qa.ov.amt = a.pence;
        qa.ov.type = body.querySelector('[data-act=type][aria-pressed=true]').dataset.v;
        backToInput();
      }
    }, '#fAmt');
  } else if (field === 'desc') {
    openSheet('Description', `
      <form class="form" data-form>
        <div class="field"><label for="fDesc">Merchant or note</label><input class="input" id="fDesc" autocomplete="off" value="${esc(p.desc)}"></div>
        <button class="btn primary" type="submit">Done</button>
      </form>`, (act, el, body) => {
      if (act === 'submit') { qa.ov.desc = TP.titleCase($('#fDesc', body).value.trim()); backToInput(); }
    }, '#fDesc');
  } else if (field === 'cat') {
    openSheet(p.desc ? `Category for ${p.desc}` : 'Category', catGrid(p.type === 'in' ? CATS : OUT_CATS, p.cat) +
      (p.desc ? `<p class="hint" style="margin-top:12px">This will be remembered for ${esc(p.desc)} next time.</p>` : ''), (act, el) => {
      if (act === 'cat') { qa.ov.cat = el.dataset.v; backToInput(); }
    });
  } else if (field === 'date') {
    openSheet('Date', dateChooser(p.date), (act, el, body) => {
      if (act === 'date') { qa.ov.date = el.dataset.v; backToInput(); }
      if (act === 'submit') { const v = $('#fDate', body).value; if (v) { qa.ov.date = v; backToInput(); } }
    });
  } else if (field === 'who') {
    openSheet('Whose is it?', whoChooser(p.who), (act, el) => {
      if (act === 'who') { qa.ov.who = el.dataset.v; backToInput(); }
    });
  }
}

function catGrid(list, sel) {
  return `<div class="catgrid">${list.map((c) => `<button type="button" data-act="cat" data-v="${c.id}" aria-pressed="${c.id === sel}">${dot(c.id)}<span>${esc(c.name)}</span></button>`).join('')}</div>`;
}
function dateChooser(sel) {
  const t = todayISO();
  const opts = [];
  for (let i = 0; i < 8; i++) { const d = addDays(t, -i); opts.push(`<button type="button" data-act="date" data-v="${d}" aria-pressed="${d === sel}">${esc(dateLabel(d, true))}</button>`); }
  return `<div class="form"><div class="datelist">${opts.join('')}</div>
    <form class="row2" data-form><input class="input" type="date" id="fDate" value="${sel}" aria-label="Pick a date"><button class="btn" type="submit">Use date</button></form></div>`;
}
function whoChooser(sel) {
  const opts = ['shared'].concat(S.people);
  return `<div class="datelist">${opts.map((w) => `<button type="button" data-act="who" data-v="${esc(w)}" aria-pressed="${w === sel}">${esc(whoLabel(w))}</button>`).join('')}</div>
    <p class="hint" style="margin-top:12px">The dropdown next to the box sets this for every new entry. Typing a name, “joint” or “split” changes it for one entry.</p>`;
}

/** Remember that a typed name means another, e.g. "js" -> "Sainsbury's". Ordinary words like "coffee" are never redirected. */
function learnAlias(raw, name) {
  raw = String(raw || '');
  if (!raw || !name || raw === TP.normKey(name) || raw.length > 24 || TP.keywordCategory(raw)) return false;
  S.aliases[raw] = name;
  return true;
}
