// ---------- Transaction edit ----------
function editTxn(id) {
  const t = S.txns.find((x) => x.id === id);
  if (!t) return;
  const draft = Object.assign({}, t);
  const html = () => `
    <form class="form" data-form>
      <div class="field"><label for="eAmt">Amount (£)</label><input class="input big-in" id="eAmt" inputmode="decimal" value="${(draft.amt / 100).toFixed(2)}"></div>
      <div class="segctl" role="group" aria-label="Money in or out">
        <button type="button" data-act="type" data-v="out" aria-pressed="${draft.type === 'out'}">Spent</button>
        <button type="button" data-act="type" data-v="save" aria-pressed="${draft.type === 'save'}">Saved</button>
        <button type="button" data-act="type" data-v="in" aria-pressed="${draft.type === 'in'}">Received</button>
      </div>
      <div class="field"><label for="eDesc">Description</label><input class="input" id="eDesc" value="${esc(draft.desc)}"></div>
      <div class="field"><span>Category</span>${catGrid(draft.type === 'in' ? CATS : OUT_CATS, draft.cat)}</div>
      <div class="field"><label for="eDate">Date</label><input class="input" type="date" id="eDate" value="${draft.date}"></div>
      ${isPair() ? `<div class="field"><span>Whose</span><div class="segctl" role="group" aria-label="Whose">${['shared'].concat(S.people).map((w) =>
        `<button type="button" data-act="who" data-v="${esc(w)}" aria-pressed="${w === draft.who}">${esc(whoLabel(w))}</button>`).join('')}</div></div>` : ''}
      <div class="btns"><button class="btn danger" type="button" data-act="del">Delete</button>${draft.type !== 'in' && !draft.fixedId ? '<button class="btn" type="button" data-act="repeat">Repeat monthly</button>' : ''}<button class="btn primary" type="submit">Save</button></div>
      ${draft.fixedId ? '<p class="hint">This is a fixed cost. Edit future payments in the Fixed tab.</p>' : ''}
    </form>`;
  const sync = (body) => {
    const a = TP.parseAmount($('#eAmt', body).value.replace(/\s/g, ''));
    if (a) draft.amt = a.pence;
    draft.desc = $('#eDesc', body).value.trim() || draft.desc;
    draft.date = $('#eDate', body).value || draft.date;
  };
  openSheet('Edit entry', html(), (act, el, body) => {
    if (act === 'type') { sync(body); draft.type = el.dataset.v;
      if (draft.type === 'in') draft.cat = 'income';
      else if (draft.type === 'save') { if (!isSave(draft.cat)) draft.cat = isSave(TP.keywordCategory(TP.normKey(draft.desc))) ? TP.keywordCategory(TP.normKey(draft.desc)) : 'savings'; }
      else if (draft.cat === 'income' || isSave(draft.cat)) { const k = TP.keywordCategory(TP.normKey(draft.desc)); draft.cat = k && !isSave(k) && k !== 'income' ? k : 'other'; } sheetBody.innerHTML = html(); }
    else if (act === 'cat') {
      body.querySelectorAll('[data-act=cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === el))); draft.cat = el.dataset.v;
      if (draft.type !== 'in') { const nt = isSave(draft.cat) ? 'save' : 'out'; if (nt !== draft.type) { sync(body); draft.type = nt; sheetBody.innerHTML = html(); } }
    }
    else if (act === 'who') { body.querySelectorAll('[data-act=who]').forEach((x) => x.setAttribute('aria-pressed', String(x === el))); draft.who = el.dataset.v; }
    else if (act === 'repeat') { closeSheet(); editFixed(null, { desc: t.desc, amt: t.amt, day: +t.date.slice(8), cat: t.cat, who: t.who, fromTxn: t.id }); }
    else if (act === 'del') {
      const idx = S.txns.indexOf(t);
      S.txns.splice(idx, 1); save(); closeSheet(); refresh();
      toast(`Deleted ${t.desc}`, () => { S.txns.splice(Math.min(idx, S.txns.length), 0, t); save(); refresh(); });
    } else if (act === 'submit') {
      sync(body);
      const before = Object.assign({}, t);
      draft.mkey = TP.normKey(draft.desc);
      let learnedNote = '';
      if (draft.cat !== t.cat && draft.mkey && draft.type !== 'in') {
        const auto = TP.keywordCategory(draft.mkey) || 'other';
        if (draft.cat === auto) delete S.learned[draft.mkey]; else S.learned[draft.mkey] = draft.cat;
        learnedNote = ` · ${draft.desc} → ${CAT[draft.cat].name} from now on`;
      }
      delete draft.example;
      Object.assign(t, draft);
      save(); closeSheet(); refresh();
      toast('Saved' + learnedNote, () => { Object.assign(t, before); save(); refresh(); });
    }
  });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tx]');
  if (b) editTxn(b.dataset.tx);
});
