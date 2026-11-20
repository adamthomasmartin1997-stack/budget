// ---------- Views ----------
let deferredInstall = null;
function renderHome() {
  const ym = monthOf(todayISO());
  const hasEx = S.txns.some((t) => t.example);
  const hasReal = S.txns.some((t) => !t.example);
  const recent = S.txns.slice().sort(sortTx).slice(0, 5);
  let exNote = '';
  if (hasEx && hasReal && !S.exKeep) {
    exNote = `<div class="notice"><p><b>That's your first real entry.</b> Clear the example data now so it doesn't mix with your own figures?</p>
      <div class="btns"><button type="button" class="btn primary" data-clear-examples>Clear examples</button><button type="button" class="btn" data-keep-examples>Keep for now</button></div></div>`;
  } else if (hasEx) {
    exNote = `<p class="exline">Showing <span class="tag">example</span> data. <button type="button" class="link" data-clear-examples>Clear it</button></p>`;
  }
  $('#homeBody').innerHTML = `<div class="stack">
    ${exNote}
    ${monthCard(ym, { tiles: true })}
    <section><div class="sec-h"><h2>Latest</h2><a href="#activity">See all</a></div>
      ${recent.length ? `<ul class="list">${recent.map((t) => txRow(t, true)).join('')}</ul>` : `<p class="empty">Nothing logged yet. Type a cost in the box above, like <b>coffee 3.2</b>.</p>`}</section>
  </div>`;
}

function personTile(ym, w) {
  const own = monthTx(ym).filter((t) => (t.who || 'shared') === w);
  const out = own.filter((t) => t.type === 'out').reduce((a, t) => a + t.amt, 0);
  const sv = own.filter((t) => t.type === 'save').reduce((a, t) => a + t.amt, 0);
  const top = Object.entries(own.filter((t) => t.type === 'out').reduce((m, t) => ((m[t.cat] = (m[t.cat] || 0) + t.amt), m), {})).sort((a, b) => b[1] - a[1])[0];
  return `<a class="ptile ${whoClass(w)}" href="#insights" data-goto-who="${esc(w)}" aria-label="${esc(whoLabel(w))}: ${moneyR(out)} spent. Open breakdown">
    <span class="ptile-n"><i class="sw ${whoClass(w)}"></i>${esc(whoLabel(w))}</span>
    <b>${moneyR(out)}</b><small>${top ? `most on ${esc(CAT[top[0]].name.toLowerCase())}` : 'nothing yet'}</small>
    ${sv ? `<small class="sv">${moneyR(sv)} put away</small>` : ''}<span class="ptile-go" aria-hidden="true">→</span></a>`;
}

function monthNav() {
  const cur = monthOf(todayISO());
  return `<div class="monthnav"><button type="button" class="icon-btn" data-month="-1" aria-label="Previous month">‹</button>
    <h2>${esc(monthName(ui.month, true))}</h2>
    <button type="button" class="icon-btn" data-month="1" aria-label="Next month" ${ui.month >= cur ? 'disabled' : ''}>›</button></div>`;
}

function renderActivity() {
  const el = $('#view-activity');
  const q = ui.q.trim().toLowerCase();
  let list = monthTx(ui.month);
  if (ui.filter === 'out' || ui.filter === 'in' || ui.filter === 'save') list = list.filter((t) => t.type === ui.filter);
  else if (ui.filter !== 'all') list = list.filter((t) => t.who === ui.filter);
  if (q) list = list.filter((t) => (t.desc + ' ' + (CAT[t.cat] || {}).name).toLowerCase().includes(q));
  list.sort(sortTx);
  const days = [];
  for (const t of list) { const last = days[days.length - 1]; if (last && last.date === t.date) last.items.push(t); else days.push({ date: t.date, items: [t] }); }
  const filters = [['all', 'All'], ['out', 'Spending'], ['save', 'Saved'], ['in', 'Income']].concat(isPair() ? ['shared'].concat(S.people).map((w) => [w, whoLabel(w)]) : []);
  const s = sums(list);
  const searchHad = document.activeElement && document.activeElement.id === 'actSearch';
  el.innerHTML = `<div class="stack">${monthNav()}
    <button type="button" class="btn import-btn" data-import><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Import a bank statement</button>
    <input class="search" id="actSearch" type="search" placeholder="Search entries" value="${esc(ui.q)}" aria-label="Search entries">
    <div class="pills" role="group" aria-label="Filter">${filters.map(([v, l]) => `<button type="button" class="pill" data-filter="${esc(v)}" aria-pressed="${ui.filter === v}">${esc(l)}</button>`).join('')}</div>
    <div><p class="hint">${list.length} entr${list.length === 1 ? 'y' : 'ies'} · spent <b>${money(s.out)}</b>${s.save ? ` · saved <b class="sv">${money(s.save)}</b>` : ''}${s.in ? ` · in <b class="pos">${money(s.in)}</b>` : ''}</p>
    ${days.length ? days.map((d) => {
      const out = d.items.reduce((a, t) => a + (t.type === 'out' ? t.amt : 0), 0);
      return `<div class="day-h"><span>${esc(dateLabel(d.date, true))}${dateLabel(d.date) === 'Today' || dateLabel(d.date) === 'Yesterday' ? '' : ''}</span><span>${out ? money(out) : ''}</span></div>
        <ul class="list">${d.items.map((t) => txRow(t)).join('')}</ul>`;
    }).join('') : `<p class="empty">No entries${q ? ' match that search' : ' this month'}.</p>`}</div></div>`;
  if (searchHad) { const i = $('#actSearch'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function renderBudget() {
  const el = $('#view-budget');
  const s = sums(monthTx(ui.month));
  const ids = SPEND_CATS.map((c) => c.id).filter((id) => S.budgets[id] || s.byCat[id]);
  const rest = SPEND_CATS.filter((c) => !ids.includes(c.id));
  const rows = ids.map((id) => ({ id, v: s.byCat[id] || 0, b: S.budgets[id] || 0 })).sort((a, b) => (b.b || 0) - (a.b || 0) || b.v - a.v);
  el.innerHTML = `<div class="stack">${monthNav()}
    ${monthCard(ui.month)}
    ${goalsSection()}
    <section><div class="sec-h"><h2>By category</h2><span class="hint">Tap to set a budget</span></div>
    <div class="card"><div class="cats">${rows.map((r) => {
      const over = r.b && r.v > r.b;
      const w = r.b ? Math.min(100, (r.v / r.b) * 100) : r.v ? 100 : 0;
      return `<button type="button" class="catrow${over ? ' over' : ''}" data-budget="${r.id}" ${catStyle(r.id)}>
        <span class="catname">${dot(r.id)}<span>${esc(CAT[r.id].name)}</span></span>
        <span class="catval"><b class="${over ? 'neg' : ''}">${money(r.v)}</b> <span class="muted">${r.b ? `of ${moneyR(r.b)}` : 'no budget'}</span></span>
        <span class="bar"><i style="width:${w.toFixed(1)}%"></i></span></button>`;
    }).join('')}</div></div></section>
    ${rest.length ? `<section><div class="sec-h"><h2>No budget yet</h2></div><div class="pills" style="flex-wrap:wrap">${rest.map((c) =>
      `<button type="button" class="pill" data-budget="${c.id}">${esc(c.name)}</button>`).join('')}</div></section>` : ''}
  </div>`;
}

function editBudget(id) {
  openSheet(`${CAT[id].name} budget`, `<form class="form" data-form>
    <div class="field"><label for="bAmt">Monthly budget (£)</label><input class="input big-in" id="bAmt" inputmode="decimal" value="${S.budgets[id] ? (S.budgets[id] / 100).toFixed(0) : ''}" placeholder="0"></div>
    <p class="hint">Leave empty to remove the budget for this category.</p>
    <button class="btn primary" type="submit">Save budget</button></form>`, (act, el, body) => {
    if (act !== 'submit') return;
    const v = $('#bAmt', body).value.trim();
    const a = v ? TP.parseAmount(v) : null;
    if (v && !a) { $('#bAmt', body).focus(); return; }
    if (a) S.budgets[id] = a.pence; else delete S.budgets[id];
    save(); closeSheet(); refresh();
  }, '#bAmt');
}
