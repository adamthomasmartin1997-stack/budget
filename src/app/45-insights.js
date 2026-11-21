// ---------- Period helpers ----------
const prevMonth = (ym) => { const d = fromISO(ym + '-01'); d.setMonth(d.getMonth() - 1); return monthOf(iso(d)); };
const nextMonth = (ym) => { const d = fromISO(ym + '-01'); d.setMonth(d.getMonth() + 1); return monthOf(iso(d)); };
const daysIn = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
const weekStart = (s) => { const d = fromISO(s); return addDays(s, -((d.getDay() + 6) % 7)); };
const ordinal = (n) => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const shortDate = (s) => fromISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const weekLabel = (ws) => { const we = addDays(ws, 6); return monthOf(ws) === monthOf(we) ? `${+ws.slice(8)}–${shortDate(we)}` : `${shortDate(ws)} – ${shortDate(we)}`; };
const whoOf = (t) => t.who || 'shared';
const total = (list) => list.reduce((a, t) => a + t.amt, 0);
function outRange(from, to, who) {
  return S.txns.filter((t) => t.type === 'out' && t.date >= from && t.date <= to && (who === 'all' || !isPair() || whoOf(t) === who));
}
function saveRange(from, to, who) {
  return S.txns.filter((t) => t.type === 'save' && t.date >= from && t.date <= to && (who === 'all' || !isPair() || whoOf(t) === who));
}
const potWho = (g) => (isPair() && g.t.who ? ' · ' + esc(whoLabel(g.t.who)) : '');
function savingsBlock(from, to, who, periodName) {
  const list = saveRange(from, to, who);
  const y = from.slice(0, 4), t = todayISO();
  const ytd = saveRange(`${y}-01-01`, t < to ? t : to, who);
  if (!list.length && !ytd.length) return '';
  const sav = total(list.filter((x) => x.cat === 'savings')), inv = total(list.filter((x) => x.cat === 'invest'));
  const pots = byKey(list, (x) => x.mkey || x.desc);
  const inc = who === 'all' ? total(inRange(from, to)) : 0;
  return `<section><div class="sec-h"><h2>Saved &amp; invested</h2></div><div class="card form">
    <div class="big sv">${esc(moneyR(sav + inv))}</div>
    <div class="legend"><span><i class="sw save-s"></i>Savings <b>${moneyR(sav)}</b></span><span><i class="sw save-i"></i>Investments <b>${moneyR(inv)}</b></span>
      ${inc ? `<span>That's <b>${Math.round(((sav + inv) / inc) * 100)}%</b> of money in</span>` : ''}</div>
    ${pots.length ? `<div class="merch">${pots.map((g) => `<div><span>${esc(g.t.desc)} <small>${esc(CAT[g.t.cat].name)}${potWho(g)}</small></span><b>${money(g.v)}</b></div>`).join('')}</div>` : `<p class="hint">Nothing put away in ${esc(periodName)} yet.</p>`}
    ${ui.period !== 'year' ? `<p class="hint">${esc(y)} so far: <b>${moneyR(total(ytd))}</b> put away.</p>` : ''}
  </div></section>`;
}
function inRange(from, to) { return S.txns.filter((t) => t.type === 'in' && t.date >= from && t.date <= to); }
function byKey(list, key) {
  const m = new Map();
  for (const t of list) { const k = key(t); const g = m.get(k) || { k, v: 0, n: 0, t }; g.v += t.amt; g.n++; m.set(k, g); }
  return [...m.values()].sort((a, b) => b.v - a.v);
}
function deltaText(now, before, label) {
  if (!before && !now) return '';
  if (!before) return `Nothing was spent by ${esc(label)}`;
  const d = now - before;
  if (Math.abs(d) < 100) return `About the same as ${esc(label)}`;
  return `<b>${moneyR(Math.abs(d))}</b> ${d > 0 ? 'more' : 'less'} than ${esc(label)}`;
}
function deltaSentence(now, before, label) {
  if (!before) return '';
  const d = now - before;
  if (Math.abs(d) < 100) return `That's about the same as ${esc(label)}.`;
  return `That's <b>${moneyR(Math.abs(d))}</b> ${d > 0 ? 'more' : 'less'} than ${esc(label)}.`;
}
const whoVar = (cls) => (cls === 'all' ? 'accent' : cls === 'shared' ? 'pj' : cls);

/** Single-series bar chart with gridlines, optional reference line, and a tap/hover tooltip. */
function barChart(o) {
  const vals = o.values, n = vals.length;
  const max = Math.max(...vals, o.ref || 0, 100);
  const pounds = max / 100;
  const mag = Math.pow(10, Math.floor(Math.log10(pounds)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((v) => pounds / v <= 3) * 100;
  const top = Math.ceil(max / step) * step;
  const W = 340, H = o.h || 140, L = 38, R = 4, T = 10, B = 20;
  const cw = (W - L - R) / n, bw = Math.max(2, Math.min(o.maxBar || 40, cw - 2)), y = (v) => T + (H - T - B) * (1 - v / top);
  let g = '';
  for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${GBP0.format(v / 100)}</text>`;
  let bars = '', hits = '', ticks = '';
  for (let i = 0; i < n; i++) {
    const x = L + i * cw + (cw - bw) / 2;
    if (vals[i] > 0) {
      const h = Math.max(2, y(0) - y(vals[i])), r = Math.min(4, bw / 2, h);
      bars += `<path class="bar-m" data-i="${i}" fill="var(--${o.color})" d="M${x.toFixed(1)},${y(0)}v${-(h - r).toFixed(1)}q0,${-r} ${r},${-r}h${(bw - 2 * r).toFixed(1)}q${r},0 ${r},${r}v${(h - r).toFixed(1)}z"/>`;
    }
    if (o.active ? o.active(i) : true) hits += `<rect class="hit" data-i="${i}" data-tip="${esc(o.tips[i])}" data-v="${vals[i]}" x="${(L + i * cw).toFixed(1)}" y="${T}" width="${cw.toFixed(2)}" height="${H - T}"/>`;
    if (o.ticks.includes(i)) ticks += `<text class="ax" x="${(L + (i + 0.5) * cw).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(o.labels[i])}</text>`;
  }
  let ref = '';
  if (o.ref) ref = `<line x1="${L}" x2="${W - R}" y1="${y(o.ref).toFixed(1)}" y2="${y(o.ref).toFixed(1)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/><text class="ax" x="${W - R}" y="${(y(o.ref) - 4).toFixed(1)}" text-anchor="end" style="fill:var(--ink)">${esc(o.refLabel)}</text>`;
  return `<div class="chart" data-chart><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria)}">${g}${bars}${ref}${ticks}${hits}</svg><div class="tip" hidden></div></div>`;
}

function catRows(list, prevList, prevLabel) {
  const tot = total(list) || 1;
  const prev = Object.fromEntries(byKey(prevList, (t) => t.cat).map((g) => [g.k, g.v]));
  const rows = byKey(list, (t) => t.cat);
  if (!rows.length) return `<p class="empty">Nothing spent yet.</p>`;
  const max = rows[0].v;
  return `<div class="cats">${rows.map((r) => {
    const p = prev[r.k] || 0, d = r.v - p;
    const dt = !prevLabel ? '' : !p ? `new vs ${prevLabel}` : Math.abs(d) < 100 ? `same as ${prevLabel}` : `${d > 0 ? '▲' : '▼'} ${moneyR(Math.abs(d))} vs ${prevLabel}`;
    return `<button type="button" class="catrow" data-drill="${r.k}" ${catStyle(r.k)}>
      <span class="catname">${dot(r.k)}<span>${esc(CAT[r.k].name)}</span></span>
      <span class="catval"><b>${money(r.v)}</b> <span class="muted">${Math.round((r.v / tot) * 100)}%</span></span>
      <span class="bar"><i style="width:${((r.v / max) * 100).toFixed(1)}%"></i></span>
      ${dt ? `<span class="delta">${dt}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

function whoSplit(all) {
  const allTot = total(all);
  const ws = S.people.concat('shared').map((w) => ({ w, v: total(all.filter((t) => whoOf(t) === w)) }));
  return `<section><div class="sec-h"><h2>Who's spending</h2></div><div class="card form">
    <div class="sbar" role="img" aria-label="${esc(ws.map((x) => `${whoLabel(x.w)} ${money(x.v)}`).join(', '))}">${ws.filter((x) => x.v).map((x) => `<i class="${whoClass(x.w)}" style="flex:${x.v}"></i>`).join('')}</div>
    <div class="wholist">${ws.map((x) => `<button type="button" class="whorow" data-who-tab="${esc(x.w)}"><span class="sw ${whoClass(x.w)}"></span><span>${esc(whoLabel(x.w))} <span class="muted">${allTot ? Math.round((x.v / allTot) * 100) : 0}%</span></span><b>${money(x.v)}</b></button>`).join('')}</div>
  </div></section>`;
}

function catByPerson(all) {
  const cats = byKey(all, (t) => t.cat);
  const maxC = cats.length ? cats[0].v : 1;
  return `<section><div class="sec-h"><h2>Where it goes, by person</h2></div><div class="card">
    <div class="legend" style="margin-bottom:14px">${S.people.concat('shared').map((w) => `<span><i class="sw ${whoClass(w)}"></i>${esc(whoLabel(w))}</span>`).join('')}</div>
    ${cats.length ? `<div class="cats">${cats.map((c) => {
      const parts = S.people.concat('shared').map((w) => ({ w, v: total(all.filter((t) => t.cat === c.k && whoOf(t) === w)) })).filter((x) => x.v);
      return `<div class="scat"><div class="scat-top"><span class="catname">${dot(c.k)}<span>${esc(CAT[c.k].name)}</span></span><b class="catval">${money(c.v)}</b></div>
        <div class="sbar" style="width:${Math.max(4, (c.v / maxC) * 100).toFixed(1)}%">${parts.map((x) => `<i class="${whoClass(x.w)}" style="flex:${x.v}"></i>`).join('')}</div>
        <small>${parts.map((x) => `${esc(whoLabel(x.w))} ${money(x.v)}`).join(' · ')}</small></div>`;
    }).join('')}</div>` : `<p class="empty">Nothing spent yet.</p>`}
  </div></section>`;
}

function fixedFlex(list, label) {
  const fx = total(list.filter((t) => t.fixedId)), fl = total(list) - fx;
  if (!fx) return '';
  return `<section><div class="sec-h"><h2>Fixed vs day-to-day</h2><a href="#fixed">Fixed costs</a></div><div class="card form">
    <div class="sbar" role="img" aria-label="Fixed ${money(fx)}, day-to-day ${money(fl)}"><i class="fixed" style="flex:${fx}"></i>${fl ? `<i class="flex" style="flex:${fl}"></i>` : ''}</div>
    <div class="legend"><span><i class="sw fixed"></i>Fixed <b>${money(fx)}</b></span><span><i class="sw flex"></i>Day-to-day <b>${money(fl)}</b></span></div>
    <p class="hint">${Math.round((fx / (fx + fl)) * 100)}% of ${esc(label)} went on bills and subscriptions that repeat every month.</p></div></section>`;
}

function heatmap(ym, list) {
  const dim = daysIn(ym), t = todayISO();
  const per = new Array(dim).fill(0);
  for (const x of list) per[+x.date.slice(8) - 1] += x.amt;
  const nz = per.filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] || 0;
  const cuts = [q(0.25), q(0.5), q(0.8)];
  const lvl = (v) => (!v ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
  const lead = (fromISO(ym + '-01').getDay() + 6) % 7;
  let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="hd">${d}</span>`).join('');
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${ym}-${String(d).padStart(2, '0')}`;
    const fut = ds > t;
    cells += `<button type="button" class="${fut ? 'fut' : 'l' + lvl(per[d - 1])}" data-heat="${ds}" data-v="${per[d - 1]}" ${fut ? 'disabled' : ''} aria-label="${esc(dateLabel(ds, true))}, ${money(per[d - 1])}">${d}</button>`;
  }
  const zero = per.slice(0, ym === monthOf(t) ? +t.slice(8) : dim).filter((v) => !v).length;
  const peak = per.indexOf(Math.max(...per));
  return `<section><div class="sec-h"><h2>Spending calendar</h2><span class="hint">Tap a day</span></div><div class="card">
    <div class="heat">${cells}</div>
    <div class="heat-foot"><span id="heatCap">${nz.length ? `Biggest day <b>${esc(shortDate(`${ym}-${String(peak + 1).padStart(2, '0')}`))}</b>, ${money(per[peak])} · ${zero} no-spend day${zero === 1 ? '' : 's'}` : 'No spending yet'}</span>
    <span class="scale">Less <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> More</span></div></div></section>`;
}

function places(list) {
  const pl = byKey(list, (t) => t.mkey || t.desc).slice(0, 6);
  return pl.length ? `<section><div class="sec-h"><h2>Top places</h2></div><div class="card merch">${pl.map((g) => `<div><span>${esc(g.t.desc)} <small>× ${g.n}</small></span><b>${money(g.v)}</b></div>`).join('')}</div></section>` : '';
}
function biggest(list) {
  const b = list.slice().sort((a, c) => c.amt - a.amt).slice(0, 3);
  return b.length ? `<section><div class="sec-h"><h2>Biggest costs</h2></div><ul class="list">${b.map((t) => txRow(t, true)).join('')}</ul></section>` : '';
}

function renderInsights() {
  const el = $('#view-insights');
  const pair = isPair();
  if (!pair) ui.who = 'all';
  if (pair && ui.who !== 'all' && ui.who !== 'shared' && !S.people.includes(ui.who)) ui.who = 'all';
  const who = ui.who, t = todayISO();
  const period = ui.period;
  let from, to, pFrom, pTo, title, prevLabel, cmpLabel, nextOk, periodName;
  if (period === 'week') {
    from = ui.week; to = addDays(from, 6);
    const cur = from === weekStart(t);
    pFrom = addDays(from, -7); pTo = cur ? addDays(t, -7) : addDays(from, -1);
    title = cur ? `This week · ${weekLabel(from)}` : weekLabel(from);
    prevLabel = 'last week'; cmpLabel = cur ? 'this point last week' : 'the week before'; nextOk = !cur; periodName = 'the week';
  } else if (period === 'month') {
    const ym = ui.month, cur = ym === monthOf(t), pm = prevMonth(ym);
    from = ym + '-01'; to = `${ym}-${daysIn(ym)}`;
    pFrom = pm + '-01'; pTo = cur ? `${pm}-${String(Math.min(+t.slice(8), daysIn(pm))).padStart(2, '0')}` : `${pm}-${daysIn(pm)}`;
    title = monthName(ym, true); prevLabel = monthName(pm).slice(0, 3); cmpLabel = cur ? `this point in ${monthName(pm)}` : monthName(pm); nextOk = !cur; periodName = monthName(ym);
  } else {
    const y = ui.year, cur = y === +t.slice(0, 4);
    from = `${y}-01-01`; to = `${y}-12-31`;
    pFrom = `${y - 1}-01-01`; pTo = cur ? `${y - 1}${t.slice(4)}` : `${y - 1}-12-31`;
    title = cur ? `${y} so far` : String(y); prevLabel = String(y - 1); cmpLabel = cur ? `this point in ${y - 1}` : String(y - 1); nextOk = !cur; periodName = String(y);
  }
  const list = outRange(from, to, who);
  const prevList = outRange(pFrom, pTo, who);
  const all = outRange(from, to, 'all');
  const tot = total(list), allTot = total(all);
  const joint = total(all.filter((x) => whoOf(x) === 'shared'));

  const periodCtl = `<div class="segctl period" role="tablist" aria-label="Period">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([v, l]) =>
    `<button type="button" role="tab" data-period="${v}" aria-pressed="${period === v}" aria-selected="${period === v}">${l}</button>`).join('')}</div>`;
  const nav = `<div class="monthnav"><button type="button" class="icon-btn" data-step="-1" aria-label="Previous">‹</button><h2>${esc(title)}</h2>
    <button type="button" class="icon-btn" data-step="1" aria-label="Next" ${nextOk ? '' : 'disabled'}>›</button></div>`;
  const tabs = pair ? `<div class="pills" role="tablist" aria-label="Whose spending">${['all'].concat(S.people, 'shared').map((w) =>
    `<button type="button" class="pill" role="tab" data-who-tab="${esc(w)}" aria-pressed="${who === w}" aria-selected="${who === w}">${w === 'all' ? 'Everyone' : `<span class="sw ${whoClass(w)}" style="margin-right:6px"></span>${esc(whoLabel(w))}`}</button>`).join('')}</div>` : '';

  let hero = `<div class="card hero"><span class="eyebrow">${who === 'all' ? (pair ? 'Household' : esc(S.people[0])) : esc(whoLabel(who))} · spent</span>
    <div class="big">${esc(money(tot).split('.')[0])}<small>.${esc(money(tot).split('.')[1])}</small></div>
    <div class="sub">${deltaText(tot, total(prevList), cmpLabel)}</div>`;
  if (pair && who !== 'all' && who !== 'shared') hero += `<div class="sub">${allTot ? Math.round((tot / allTot) * 100) : 0}% of household spending · with half of joint costs, <b>${money(tot + Math.round(joint / 2))}</b> all in</div>`;
  else if (pair && who === 'shared') hero += `<div class="sub">Split evenly, <b>${money(Math.round(tot / 2))}</b> each · ${allTot ? Math.round((tot / allTot) * 100) : 0}% of household spending</div>`;
  if (who === 'all') {
    const inc = total(inRange(from, to)), sv = total(saveRange(from, to, 'all'));
    if (inc) { const left = inc - tot - sv; hero += `<div class="sub">Money in <b>${moneyR(inc)}</b>${sv ? ` · saved &amp; invested <b class="sv">${moneyR(sv)}</b>` : ''} · ${left >= 0 ? `left over <b class="pos">${moneyR(left)}</b>` : `short by <b class="neg">${moneyR(-left)}</b>`}</div>`; }
  } else {
    const sv = total(saveRange(from, to, who));
    if (sv) hero += `<div class="sub">Also put away <b class="sv">${moneyR(sv)}</b> into savings and investments</div>`;
  }
  hero += `</div>`;

  // chart per period
  const color = whoVar(whoClass(who));
  let chart = '';
  if (period === 'week') {
    const vals = [0, 1, 2, 3, 4, 5, 6].map((i) => total(list.filter((x) => x.date === addDays(from, i))));
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(from, i));
    chart = `<section><div class="sec-h"><h2>Day by day</h2><span class="hint">Tap a bar</span></div><div class="card">${barChart({ values: vals, color, ticks: [0, 1, 2, 3, 4, 5, 6],
      labels: days.map((d) => fromISO(d).toLocaleDateString('en-GB', { weekday: 'short' })), tips: days.map((d, i) => `${dateLabel(d, true)} · ${money(vals[i])}`),
      active: (i) => days[i] <= t, maxBar: 28, aria: `Spending per day, ${weekLabel(from)}` })}</div></section>`;
  } else if (period === 'month') {
    const ym = ui.month, dim = daysIn(ym);
    const vals = Array.from({ length: dim }, (_, i) => total(list.filter((x) => +x.date.slice(8) === i + 1)));
    chart = heatmap(ym, list) + `<section><div class="sec-h"><h2>Day by day</h2><span class="hint">Tap a bar</span></div><div class="card">${barChart({ values: vals, color,
      ticks: [0, 7, 14, 21, dim - 1], labels: vals.map((_, i) => String(i + 1)), tips: vals.map((v, i) => `${dateLabel(`${ym}-${String(i + 1).padStart(2, '0')}`, true)} · ${money(v)}`),
      active: (i) => `${ym}-${String(i + 1).padStart(2, '0')}` <= t, aria: `Spending per day in ${monthName(ym)}` })}</div></section>`;
  } else {
    const y = ui.year, curM = +t.slice(5, 7), isCur = y === +t.slice(0, 4);
    const vals = Array.from({ length: 12 }, (_, i) => total(list.filter((x) => +x.date.slice(5, 7) === i + 1)));
    const done = vals.map((v, i) => (!isCur || i + 1 < curM) && v > 0).map((ok, i) => (ok ? vals[i] : null)).filter((v) => v !== null);
    const avg = done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : 0;
    const maxI = vals.indexOf(Math.max(...vals));
    const names = Array.from({ length: 12 }, (_, i) => fromISO(`${y}-${String(i + 1).padStart(2, '0')}-01`).toLocaleDateString('en-GB', { month: 'short' }));
    chart = `<section><div class="sec-h"><h2>Month by month</h2><span class="hint">Tap a bar</span></div><div class="card form">${barChart({ values: vals, color, ticks: [0, 2, 4, 6, 8, 10, 11].filter((v, i, a) => a.indexOf(v) === i),
      labels: names, tips: vals.map((v, i) => `${names[i]} ${y} · ${money(v)}`), active: (i) => !isCur || i + 1 <= curM, maxBar: 18,
      ref: avg, refLabel: avg ? `avg ${moneyR(avg)}` : '', aria: `Spending per month in ${y}` })}
      <div class="legend">${avg ? `<span>Average full month <b>${moneyR(avg)}</b></span>` : ''}${vals[maxI] ? `<span>Biggest <b>${esc(names[maxI])}, ${moneyR(vals[maxI])}</b></span>` : ''}</div></div></section>`;
  }

  if (!list.length && !saveRange(from, to, who).length && !(who === 'all' && inRange(from, to).length)) {
    const anything = S.txns.some((x) => x.type !== 'in');
    el.innerHTML = `<div class="stack">${recapCards()}${periodCtl}${nav}${tabs}
      <div class="card empty-card"><b>${anything ? `Nothing for ${esc(who === 'all' ? 'anyone' : whoLabel(who))} in ${esc(periodName === 'the week' ? 'this week' : periodName)}` : 'Your insights start here'}</b>
      <span>${anything ? 'Try another week, month or person.' : 'Log a few costs and this fills in: where your money goes, who spends what, a spending calendar, top places and how this month compares with last.'}</span>
      ${anything ? '' : '<a class="btn primary" href="#home">Log your first cost</a>'}</div></div>`;
    return;
  }
  el.innerHTML = `<div class="stack">${recapCards()}${periodCtl}${nav}${tabs}${hero}
    ${pair && who === 'all' ? whoSplit(all) : ''}
    ${chart}
    ${pair && who === 'all' ? catByPerson(all) : `<section><div class="sec-h"><h2>Where it goes</h2></div><div class="card">${catRows(list, prevList, prevLabel)}</div></section>`}
    ${savingsBlock(from, to, who, periodName)}
    ${period !== 'week' ? fixedFlex(list, periodName) : ''}
    ${places(list)}${biggest(list)}
    ${pair ? '<p class="hint" style="text-align:center">Savings and investments are counted separately from spending.</p>' : ''}
  </div>`;
}

function chartTip(e) {
  const chart = e.target.closest('[data-chart]');
  if (!chart) return;
  const hit = e.target.closest('.hit');
  const tip = chart.querySelector('.tip');
  chart.querySelectorAll('.bar-m.on').forEach((b) => b.classList.remove('on'));
  if (!hit) { chart.classList.remove('hovering'); tip.hidden = true; return; }
  const bar = chart.querySelector(`.bar-m[data-i="${hit.dataset.i}"]`);
  if (bar) bar.classList.add('on');
  chart.classList.add('hovering');
  const svg = chart.querySelector('svg'), sr = svg.getBoundingClientRect(), hr = hit.getBoundingClientRect();
  tip.textContent = hit.dataset.tip;
  tip.hidden = false;
  const half = tip.offsetWidth / 2;
  tip.style.left = Math.min(Math.max(hr.left - sr.left + hr.width / 2, half), sr.width - half) + 'px';
}
document.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') chartTip(e); });
document.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-chart]')) chartTip(e); });
document.addEventListener('mouseleave', (e) => { if (e.target.closest && e.target.closest('[data-chart]')) chartTip({ target: e.target.closest('[data-chart]') }); }, true);
