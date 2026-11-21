// ---------- Fixed costs ----------
function postFixed() {
  const t = todayISO(), cur = monthOf(t);
  let n = 0;
  for (const f of S.fixed) {
    if (!f.active) continue;
    if (f.cat === 'income' && !f.example) continue; // income is logged by hand on payday: the amount varies
    for (let ym = f.start, guard = 0; ym <= cur && guard < 36; ym = nextMonth(ym), guard++) {
      if (f.posted.includes(ym)) continue;
      const date = `${ym}-${String(Math.min(f.day, daysIn(ym))).padStart(2, '0')}`;
      if (date > t) continue;
      // Same id on both phones, so a payment logged by each merges into one entry when they sync
      S.txns.push({ id: `fx-${f.id}-${ym}`, amt: f.amt, type: f.cat === 'income' ? 'in' : isSave(f.cat) ? 'save' : 'out', desc: f.desc, mkey: TP.normKey(f.desc), cat: f.cat, date, who: isPair() ? f.who || 'shared' : null,
        ts: Date.now() + n, fixedId: f.id, example: f.example || undefined, exWho: f.exWho });
      f.posted.push(ym);
      n++;
    }
  }
  if (n) save();
  return n;
}
function nextDue(f) {
  const t = todayISO(), cur = monthOf(t);
  let ym = f.posted.includes(cur) ? nextMonth(cur) : cur;
  return `${ym}-${String(Math.min(f.day, daysIn(ym))).padStart(2, '0')}`;
}
function fixedSuggestions() {
  const t = todayISO(), have = new Set(S.fixed.map((f) => TP.normKey(f.desc)));
  const m = new Map();
  for (const x of S.txns) {
    if (x.type !== 'out' || x.fixedId || !x.mkey || have.has(x.mkey) || x.date < addDays(t, -100)) continue;
    const k = x.mkey + '|' + x.amt;
    const g = m.get(k) || { t: x, months: new Set() };
    g.months.add(monthOf(x.date)); if (x.date > g.t.date) g.t = x; m.set(k, g);
  }
  return [...m.values()].filter((g) => g.months.size >= 2 && byKey(S.txns.filter((x) => x.mkey === g.t.mkey && x.date >= addDays(t, -100)), () => 1)[0].n <= g.months.size + 1)
    .slice(0, 3).map((g) => g.t);
}
function renderFixed() {
  const el = $('#view-fixed');
  const t = todayISO(), cur = monthOf(t);
  const outgoing = S.fixed.filter((f) => f.cat !== 'income'); // regular income lives on the Income tab
  const actAll = outgoing.filter((f) => f.active);
  const act = actAll.filter((f) => !isSave(f.cat));
  const putAway = total(actAll.filter((f) => isSave(f.cat)));
  const monthly = total(act);
  const paid = act.filter((f) => f.posted.includes(cur)), due = act.filter((f) => !f.posted.includes(cur));
  const paidAmt = total(paid), dueAmt = total(due);
  const sorted = outgoing.slice().sort((a, b) => (a.active === b.active ? a.day - b.day || b.amt - a.amt : a.active ? -1 : 1));
  const income = total(inRange(prevMonth(cur) + '-01', `${prevMonth(cur)}-${daysIn(prevMonth(cur))}`));
  const sugg = fixedSuggestions();
  const row = (f) => {
    const nd = nextDue(f), isPaid = f.posted.includes(cur);
    const days = Math.round((fromISO(nd) - fromISO(t)) / 864e5);
    const status = !f.active ? 'Paused' : isPaid ? `Paid ${shortDate(`${cur}-${String(Math.min(f.day, daysIn(cur))).padStart(2, '0')}`)}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    const meta = [CAT[f.cat].name].concat(isPair() ? [whoLabel(f.who || 'shared')] : []);
    return `<li><button type="button" class="fx${isPaid ? ' paid' : ''}${f.active ? '' : ' paused'}" data-fixed="${f.id}">
      <span class="fx-day"><b>${f.day}</b><small>${ordinal(f.day).slice(-2)}</small></span>
      <span class="tx-main"><b>${esc(f.desc)}${f.example ? '<span class="tag">example</span>' : ''}</b><small>${esc(meta.join(' · '))} · <span class="status ${!f.active ? '' : isPaid ? 'paid' : days <= 3 ? 'due' : ''}">${esc(status)}</span></small></span>
      <span class="tx-amt">${money(f.amt)}</span></button></li>`;
  };
  el.innerHTML = `<div class="stack">
    <div class="card hero"><span class="eyebrow">Fixed costs · ${esc(monthName(cur))}</span>
      <div class="big">${esc(moneyR(monthly))}<small> a month</small></div>
      ${monthly ? `<div class="bar" role="img" aria-label="${Math.round((paidAmt / monthly) * 100)}% paid"><i style="width:${((paidAmt / monthly) * 100).toFixed(1)}%"></i></div>
      <div class="month-row"><span><b>${moneyR(paidAmt)}</b> paid so far</span><span class="muted"><b>${moneyR(dueAmt)}</b> still to come</span></div>` : ''}
      ${putAway ? `<div class="sub">Plus <b class="sv">${moneyR(putAway)}</b> a month into savings and investments.</div>` : ''}
      ${income && monthly ? `<div class="sub">That's ${Math.round((monthly / income) * 100)}% of last month's income before day-to-day spending.</div>` : ''}
      ${isPair() && monthly ? `<div class="legend">${['shared'].concat(S.people).map((w) => `<span><i class="sw ${whoClass(w)}"></i>${esc(whoLabel(w))} <b>${moneyR(total(act.filter((f) => (f.who || 'shared') === w)))}</b></span>`).join('')}</div>` : ''}
    </div>
    <button type="button" class="btn primary" data-add-fixed>Add a fixed cost</button>
    ${sorted.length ? `<section><div class="sec-h"><h2>Every month</h2><span class="hint">They log themselves on the day</span></div><ul class="list">${sorted.map(row).join('')}</ul></section>`
      : `<p class="empty">Add rent, bills and subscriptions once. Each one logs itself on its day every month. You can also type <b>netflix 10.99 monthly</b> in the quick-add box.</p>`}
    ${sugg.length ? `<section><div class="sec-h"><h2>These look regular</h2></div><div class="card">${sugg.map((x) => `<div class="suggest"><span><b>${esc(x.desc)}</b> ${money(x.amt)} <span class="muted">around the ${ordinal(+x.date.slice(8))}</span></span>
      <button type="button" class="link" data-suggest="${x.id}">Make fixed</button></div>`).join('')}</div></section>` : ''}
  </div>`;
}
function editFixed(id, seed) {
  const f = id ? S.fixed.find((x) => x.id === id) : null;
  const d = f ? Object.assign({}, f) : Object.assign({ desc: '', amt: 0, day: +todayISO().slice(8), cat: null, who: isPair() ? S.defaultWho : null, active: true }, seed || {});
  const inc = d.cat === 'income';
  const noun = inc ? 'regular income' : 'fixed cost';
  const html = () => `<form class="form" data-form>
    <div class="field"><label for="fxDesc">Name</label><input class="input" id="fxDesc" value="${esc(d.desc)}" placeholder="${inc ? 'Salary, child benefit…' : 'Rent, Netflix, council tax…'}"></div>
    <div class="row2"><div class="field"><label for="fxAmt">${inc ? 'Usual amount (£, optional)' : 'Amount (£)'}</label><input class="input" id="fxAmt" inputmode="decimal" value="${d.amt ? (d.amt / 100).toFixed(2) : ''}" placeholder="0.00"></div>
    <div class="field"><label for="fxDay">${inc ? 'Payday' : 'Day of month'}</label><select class="input" id="fxDay">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${+d.day === i + 1 ? 'selected' : ''}>${ordinal(i + 1)}${i + 1 > 28 ? ' (or last day)' : ''}</option>`).join('')}${inc ? `<option value="last" ${d.day === 'last' ? 'selected' : ''}>Last working day</option>` : ''}</select></div></div>
    ${inc ? '' : `<div class="field"><span>Category</span>${catGrid(OUT_CATS, d.cat || TP.keywordCategory(TP.normKey(d.desc)) || 'bills')}</div>`}
    ${isPair() ? `<div class="field"><span>Whose</span><div class="segctl" role="group" aria-label="Whose">${S.people.concat('shared').map((w) =>
      `<button type="button" data-act="who" data-v="${esc(w)}" aria-pressed="${(d.who || 'shared') === w}">${esc(whoLabel(w))}</button>`).join('')}</div></div>` : ''}
    ${inc ? '<p class="hint">The amount can change each month, so it never logs itself. On payday Home asks what actually arrived. A payday on a weekend moves to the Friday before.</p>' : ''}
    ${inc && !f ? '' : !f ? `<label class="check"><input type="checkbox" id="fxPaid" checked> Log this month's payment if its day has passed</label>`
      : `<label class="check"><input type="checkbox" id="fxActive" ${d.active ? 'checked' : ''}> Active (untick to pause)</label>`}
    <div class="btns">${f ? '<button class="btn danger" type="button" data-act="del">Delete</button>' : ''}<button class="btn primary" type="submit">${f ? 'Save' : 'Add ' + noun}</button></div>
    ${f ? '<p class="hint">Changes apply from the next payment. Past entries stay as they were.</p>' : ''}
  </form>`;
  openSheet(f ? `Edit ${noun}` : `New ${noun}`, html(), (act, el, body) => {
    if (act === 'cat') { body.querySelectorAll('[data-act=cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === el))); d.cat = el.dataset.v; }
    else if (act === 'who') { body.querySelectorAll('[data-act=who]').forEach((x) => x.setAttribute('aria-pressed', String(x === el))); d.who = el.dataset.v; }
    else if (act === 'del') {
      const i = S.fixed.indexOf(f); S.fixed.splice(i, 1); save(); closeSheet(); refresh();
      toast(`Removed ${f.desc}. Past ${inc ? 'entries' : 'payments'} are kept.`, () => { S.fixed.splice(i, 0, f); save(); refresh(); });
    } else if (act === 'submit') {
      const a = TP.parseAmount($('#fxAmt', body).value.replace(/\s/g, ''));
      const name = TP.titleCase($('#fxDesc', body).value.trim());
      if (!name) return $('#fxDesc', body).focus();
      if (!a && !(inc && !$('#fxAmt', body).value.trim())) return $('#fxAmt', body).focus(); // a usual amount is optional for income
      d.desc = name; d.amt = a ? a.pence : 0; d.day = $('#fxDay', body).value === 'last' ? 'last' : +$('#fxDay', body).value;
      d.cat = d.cat || TP.keywordCategory(TP.normKey(name)) || 'bills';
      if (!isPair()) d.who = null;
      if (f) {
        d.active = $('#fxActive', body).checked;
        Object.assign(f, d); delete f.example;
      } else {
        const cur = monthOf(todayISO());
        const nf = Object.assign(d, { id: uid(), start: cur, posted: [], active: true });
        if (!inc && !$('#fxPaid', body).checked) nf.posted.push(cur);
        if (seed && seed.fromTxn) { nf.posted = [cur]; const tx = S.txns.find((x) => x.id === seed.fromTxn); if (tx) tx.fixedId = nf.id; delete nf.fromTxn; }
        S.fixed.push(nf);
      }
      closeSheet();
      const n = postFixed();
      save(); refresh();
      toast(f ? `${inc ? 'Regular income' : 'Fixed cost'} saved` : inc ? `You'll be reminded on ${payDayText(d)} each month` : `${name} repeats on the ${ordinal(d.day)} each month${n ? ' · logged this month' : ''}`);
    }
  }, id ? null : '#fxDesc');
}
