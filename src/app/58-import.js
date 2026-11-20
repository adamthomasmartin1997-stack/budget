// ---------- Bank statement import ----------
// Pick a CSV, review every transaction, then import the ticked ones in one go (with undo).
const IMP_TABS = [['new', 'New'], ['dupe', 'Already logged'], ['transfer', 'Transfers'], ['all', 'All']];
let imp = null;

function startImport() {
  const f = $('#stmtFile');
  f.value = '';
  f.click();
}
$('#stmtFile').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 5e6) { toast('That file is too big for a statement. Try a shorter date range.'); return; }
  file.text().then((text) => openImport(text, file.name), () => toast("Couldn't read that file"));
});

function openImport(text, fileName) {
  const read = Statement.readStatement(text);
  if (read.error) { toast(read.error); return; }
  imp = { read, fileName, who: isPair() ? S.defaultWho : null, tab: 'new', flipped: !!read.flipped };
  buildSuggestions();
  imp.tab = imp.rows.some((r) => r.kind === 'new') ? 'new' : 'all';
  openSheet('Import statement', importHTML(), importAction);
}
function buildSuggestions() {
  const rows = imp.read.rows.map((r) => Object.assign({}, r, { amount: imp.flipped !== !!imp.read.flipped ? -r.amount : r.amount }));
  imp.rows = Statement.suggest(rows, { existing: S.txns.filter((t) => !t.example), learned: S.learned, aliases: S.aliases });
  imp.rows.forEach((r, i) => { r.i = i; r.on = r.kind === 'new'; r.cat0 = r.cat; });
}
function importHTML() {
  const rows = imp.rows;
  const count = (k) => rows.filter((r) => r.kind === k || (k === 'dupe' && r.kind === 'imported')).length;
  const dates = rows.map((r) => r.date).sort();
  const shown = rows.filter((r) => imp.tab === 'all' || r.kind === imp.tab || (imp.tab === 'dupe' && r.kind === 'imported'));
  const on = rows.filter((r) => r.on);
  const out = on.filter((r) => r.type === 'out').reduce((a, r) => a + r.amt, 0);
  const label = { new: '', dupe: 'Looks already logged', imported: 'Imported before', transfer: 'Transfer between accounts' };
  const catOpts = (r) => (r.type === 'in' ? CATS : OUT_CATS).map((c) => `<option value="${c.id}" ${c.id === r.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  return `<div class="form imp">
    <p class="imp-sum"><b>${esc(imp.read.bank || 'Bank statement')}</b> · ${esc(shortDate(dates[0]))} – ${esc(shortDate(dates[dates.length - 1]))} · ${rows.length} transaction${rows.length === 1 ? '' : 's'}</p>
    ${imp.flipped ? `<div class="notice imp-note"><p>This looks like a credit card statement, so positive amounts are treated as spending.</p><button type="button" class="btn" data-act="flip">Swap in and out</button></div>`
      : `<button type="button" class="link imp-swap" data-act="flip">Spending and income the wrong way round? Swap them</button>`}
    ${isPair() ? `<div class="field"><span>Whose account is this?</span><div class="segctl" role="group" aria-label="Whose account">${S.people.concat('shared').map((w) =>
      `<button type="button" data-act="who" data-v="${esc(w)}" aria-pressed="${imp.who === w}">${esc(whoLabel(w))}</button>`).join('')}</div></div>` : ''}
    <div class="pills" role="tablist" aria-label="Show">${IMP_TABS.map(([k, l]) => `<button type="button" class="pill" role="tab" data-act="tab" data-v="${k}" aria-pressed="${imp.tab === k}">${l} ${k === 'all' ? rows.length : count(k)}</button>`).join('')}</div>
    ${imp.tab === 'dupe' ? '<p class="hint">Same amount within 3 days of something already in the app. Tick any that are actually new.</p>' : ''}
    ${imp.tab === 'transfer' ? "<p class=\"hint\">Money moved between your own accounts or pots isn't spending, so these are left out. Tick any you want to keep.</p>" : ''}
    ${shown.length ? `<ul class="list imp-list">${shown.map((r) => `<li class="imp-row${r.on ? '' : ' off'}">
      <input type="checkbox" data-act="tick" data-i="${r.i}" ${r.on ? 'checked' : ''} aria-label="Import ${esc(r.desc)} ${money(r.amt)}">
      <span class="imp-main"><b>${esc(r.desc)}</b>
        <small>${esc(shortDate(r.date))}${label[r.kind] ? ` · <span class="imp-flag">${label[r.kind]}</span>` : ''}</small>
        <select class="imp-cat" data-imp-cat="${r.i}" aria-label="Category for ${esc(r.desc)}">${catOpts(r)}</select>
        <small class="imp-raw" title="As it appears on the statement">${esc(r.raw)}</small></span>
      <span class="tx-amt ${r.type === 'in' ? 'in' : r.type === 'save' ? 'save' : ''}">${r.type === 'in' ? '+' : ''}${money(r.amt)}${r.type === 'save' ? `<small>${saveWord(r.cat)}</small>` : ''}</span></li>`).join('')}</ul>`
      : '<p class="empty">Nothing here.</p>'}
    <div class="imp-foot"><span>${on.length} selected${out ? ` · ${money(out)} spent` : ''}</span>
      <button type="button" class="btn primary" data-act="go" ${on.length ? '' : 'disabled'}>Import ${on.length} entr${on.length === 1 ? 'y' : 'ies'}</button></div>
  </div>`;
}
function rerenderImport() {
  const scroll = $('#sheet .sheet').scrollTop;
  sheetBody.innerHTML = importHTML();
  $('#sheet .sheet').scrollTop = scroll;
}
function importAction(act, el) {
  if (!imp) return;
  if (act === 'tab') { imp.tab = el.dataset.v; rerenderImport(); }
  else if (act === 'who') { imp.who = el.dataset.v; rerenderImport(); }
  else if (act === 'tick') { const r = imp.rows[+el.dataset.i]; r.on = el.checked; rerenderImport(); }
  else if (act === 'flip') { imp.flipped = !imp.flipped; buildSuggestions(); rerenderImport(); }
  else if (act === 'go') finishImport();
}
sheetBody.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-imp-cat]');
  if (!sel || !imp) return;
  const r = imp.rows[+sel.dataset.impCat];
  r.cat = sel.value;
  if (r.type !== 'in') r.type = isSave(r.cat) ? 'save' : 'out';
  rerenderImport();
});

function finishImport() {
  const chosen = imp.rows.filter((r) => r.on);
  if (!chosen.length) return;
  const now = Date.now(), added = [], learnedBefore = {};
  chosen.forEach((r, k) => {
    // a category changed here is remembered for that shop, just like everywhere else
    if (r.cat !== r.cat0 && r.mkey && r.type !== 'in') {
      if (!(r.mkey in learnedBefore)) learnedBefore[r.mkey] = S.learned[r.mkey];
      S.learned[r.mkey] = r.cat;
    }
    const t = { id: uid() + k, amt: r.amt, type: r.type, desc: r.desc, mkey: r.mkey, rawKey: r.rawKey || undefined, cat: r.cat, date: r.date,
      who: isPair() ? imp.who || S.defaultWho : null, ts: now + k, imp: r.imp };
    S.txns.push(t);
    added.push(t.id);
  });
  imp = null;
  closeSheet();
  save(); refresh();
  toast(`Imported ${added.length} entr${added.length === 1 ? 'y' : 'ies'}`, () => {
    const ids = new Set(added);
    S.txns = S.txns.filter((t) => !ids.has(t.id));
    for (const [k, v] of Object.entries(learnedBefore)) { if (v === undefined) delete S.learned[k]; else S.learned[k] = v; }
    save(); refresh();
  });
}
