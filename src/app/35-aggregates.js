// ---------- Aggregates ----------
function monthTx(ym) { return S.txns.filter((t) => monthOf(t.date) === ym); }
function sums(list) {
  const r = { out: 0, in: 0, save: 0, byCat: {}, byWho: {} };
  for (const t of list) {
    if (t.type === 'in') { r.in += t.amt; continue; }
    if (t.type === 'save') { r.save += t.amt; continue; }
    r.out += t.amt;
    r.byCat[t.cat] = (r.byCat[t.cat] || 0) + t.amt;
    const w = t.who || 'shared';
    r.byWho[w] = (r.byWho[w] || 0) + t.amt;
  }
  return r;
}
const totalBudget = () => Object.values(S.budgets).reduce((a, b) => a + (b || 0), 0);

function txRow(t, showDate) {
  const meta = [CAT[t.cat] ? CAT[t.cat].name : 'Other'];
  if (showDate) meta.unshift(dateLabel(t.date));
  if (isPair() && t.who) meta.push(whoLabel(t.who));
  return `<li><button type="button" class="tx" data-tx="${t.id}">${dot(t.cat)}
    <span class="tx-main"><b>${esc(t.desc)}${t.example ? '<span class="tag">example</span>' : ''}</b><small>${esc(meta.join(' · '))}</small></span>
    <span class="tx-amt${t.type === 'in' ? ' in' : t.type === 'save' ? ' save' : ''}">${t.type === 'in' ? '+' : ''}${money(t.amt)}${t.type === 'save' ? `<small>${saveWord(t.cat)}</small>` : ''}</span></button></li>`;
}
const sortTx = (a, b) => (a.date === b.date ? (b.ts || 0) - (a.ts || 0) : a.date < b.date ? 1 : -1);

function catBars(s, limit) {
  const rows = Object.entries(s.byCat).map(([id, v]) => ({ id, v, b: S.budgets[id] || 0 })).sort((a, b) => b.v - a.v);
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!shown.length) return `<p class="empty">Nothing spent yet this month.</p>`;
  const max = Math.max(...shown.map((r) => Math.max(r.v, r.b)), 1);
  return `<div class="cats">${shown.map((r) => {
    const over = r.b && r.v > r.b;
    const w = r.b ? Math.min(100, (r.v / r.b) * 100) : (r.v / max) * 100;
    return `<button type="button" class="catrow${over ? ' over' : ''}" data-budget="${r.id}" ${catStyle(r.id)}>
      <span class="catname">${dot(r.id)}<span>${esc(CAT[r.id].name)}</span></span>
      <span class="catval"><b>${money(r.v)}</b>${r.b ? ` <span class="muted">of ${moneyR(r.b)}</span>` : ''}</span>
      <span class="bar"><i style="width:${w.toFixed(1)}%"></i></span></button>`;
  }).join('')}</div>`;
}

function monthCard(ym, opts) {
  opts = opts || {};
  const s = sums(monthTx(ym));
  const budget = totalBudget();
  const now = new Date();
  const isCur = ym === monthOf(todayISO());
  const dim = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const daysLeft = isCur ? dim - now.getDate() + 1 : 0;
  // Budgets only cover the categories you set them for, so compare against spending in those categories.
  const budgetedIds = Object.keys(S.budgets).filter((k) => S.budgets[k] > 0);
  const spentB = budgetedIds.reduce((a, k) => a + (s.byCat[k] || 0), 0);
  const partial = budgetedIds.length > 0 && spentB < s.out;
  const left = budget - spentB;
  const pct = budget ? Math.min(100, (spentB / budget) * 100) : 0;
  const pace = isCur ? ((now.getDate() - 0.5) / dim) * 100 : 100;
  const state = !budget ? '' : spentB > budget ? 'over' : pct > pace + 8 ? 'warn' : '';
  const [pounds, pence] = money(s.out).split('.');
  const net = s.in - s.out - s.save;
  return `<div class="card month">
    <div class="month-top"><span class="eyebrow">${esc(monthName(ym))} spending</span><span class="muted" style="font-size:13px">${isCur ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : esc(monthName(ym, true))}</span></div>
    <div class="big">${esc(pounds)}<small>.${esc(pence)}</small></div>
    ${!budget && isCur ? '<a class="link setbud" href="#budget">Set a monthly budget →</a>' : ''}
    ${budget ? `<div class="bar ${state}" role="img" aria-label="${Math.round(pct)}% of monthly budget used"><i style="width:${pct.toFixed(1)}%"></i>${isCur ? `<span class="pace" style="left:${pace.toFixed(1)}%"></span>` : ''}</div>
    <div class="month-row"><span>${left >= 0 ? `<b>${moneyR(left)}</b> left of ${moneyR(budget)}` : `<b class="neg">${moneyR(-left)}</b> over ${moneyR(budget)}`}${partial ? ` <a class="muted budnote" href="#budget">in budgeted categories</a>` : ' budget'}</span>
      ${isCur && left > 0 ? `<span class="muted">about <b>${moneyR(Math.floor(left / daysLeft / 100) * 100)}</b> a day</span>` : ''}</div>` : ''}
    <div class="month-foot">${s.in ? `<span>In <b class="pos">${moneyR(s.in)}</b></span>` : ''}${s.save ? `<span>Saved &amp; invested <b class="sv">${moneyR(s.save)}</b></span>` : ''}${s.in ? `<span>Left over <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '' : '−'}${moneyR(Math.abs(net))}</b></span>` : ''}
      ${isPair() && !opts.tiles ? S.people.concat('shared').map((w) => `<span>${esc(whoLabel(w))} <b>${moneyR(s.byWho[w] || 0)}</b></span>`).join('') : ''}</div>
    ${opts.tiles && isPair() ? `<div class="ptiles">${S.people.concat('shared').map((w) => personTile(ym, w)).join('')}</div>` : ''}
  </div>`;
}
