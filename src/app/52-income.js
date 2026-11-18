// ---------- Income ----------
function renderIncome() {
  const el = $('#view-income');
  const t = todayISO(), ym = ui.month, isCur = ym === monthOf(t), pm = prevMonth(ym);
  const from = ym + '-01', to = `${ym}-${daysIn(ym)}`;
  const list = inRange(from, to).sort(sortTx);
  const got = total(list);
  const prevSame = total(inRange(pm + '-01', isCur ? `${pm}-${String(Math.min(+t.slice(8), daysIn(pm))).padStart(2, '0')}` : `${pm}-${daysIn(pm)}`));
  const regular = S.fixed.filter((f) => f.cat === 'income').sort((a, b) => a.day - b.day);
  const expected = isCur ? regular.filter((f) => f.active && !f.posted.includes(ym)) : [];
  const spent = total(outRange(from, to, 'all')), saved = total(saveRange(from, to, 'all'));
  const left = got - spent - saved;

  // last 12 months up to the viewed month
  const months = [];
  for (let m = ym, i = 0; i < 12; i++, m = prevMonth(m)) months.unshift(m);
  const vals = months.map((m) => total(inRange(m + '-01', `${m}-${daysIn(m)}`)));
  const full = vals.filter((v, i) => v > 0 && (months[i] < monthOf(t)));
  const avg = full.length ? Math.round(full.reduce((a, b) => a + b, 0) / full.length) : 0;
  const names = months.map((m) => fromISO(m + '-01').toLocaleDateString('en-GB', { month: 'short' }));

  const row = (f) => {
    const isPaid = f.posted.includes(monthOf(t));
    const nd = nextDue(f), days = Math.round((fromISO(nd) - fromISO(t)) / 864e5);
    const status = !f.active ? 'Paused' : isPaid ? `Received ${shortDate(`${monthOf(t)}-${String(Math.min(f.day, daysIn(monthOf(t)))).padStart(2, '0')}`)}`
      : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    return `<li><button type="button" class="fx${isPaid ? ' paid' : ''}${f.active ? '' : ' paused'}" data-fixed="${f.id}">
      <span class="fx-day"><b>${f.day}</b><small>${ordinal(f.day).slice(-2)}</small></span>
      <span class="tx-main"><b>${esc(f.desc)}${f.example ? '<span class="tag">example</span>' : ''}</b><small>${isPair() ? esc(whoLabel(f.who || 'shared')) + ' · ' : ''}<span class="status ${isPaid ? 'paid' : ''}">${esc(status)}</span></small></span>
      <span class="tx-amt in">+${money(f.amt)}</span></button></li>`;
  };

  el.innerHTML = `<div class="stack">${monthNav()}
    <div class="card hero"><span class="eyebrow">Money in · ${esc(monthName(ym))}</span>
      <div class="big pos">${esc(money(got).split('.')[0])}<small>.${esc(money(got).split('.')[1])}</small></div>
      <div class="sub">${deltaText(got, prevSame, isCur ? `this point in ${monthName(pm)}` : monthName(pm))}</div>
      ${expected.length ? `<div class="sub">Still to come: <b>${moneyR(total(expected))}</b> from ${expected.map((f) => `${esc(f.desc)}${isPair() && f.who && f.who !== 'shared' ? ` (${esc(f.who)})` : ''} on the ${ordinal(f.day)}`).join(', ')}</div>` : ''}
      ${isPair() && got ? `<div class="legend">${S.people.concat('shared').map((w) => `<span><i class="sw ${whoClass(w)}"></i>${esc(whoLabel(w))} <b>${moneyR(total(list.filter((x) => whoOf(x) === w)))}</b></span>`).join('')}</div>` : ''}
    </div>

    ${got ? `<section><div class="sec-h"><h2>Where it went</h2></div><div class="card form">
      <div class="sbar" role="img" aria-label="Spent ${money(spent)}, saved ${money(saved)}, left ${money(Math.max(0, left))}">
        ${spent ? `<i class="flex" style="flex:${spent}"></i>` : ''}${saved ? `<i class="savebar" style="flex:${saved}"></i>` : ''}${left > 0 ? `<i class="leftbar" style="flex:${left}"></i>` : ''}</div>
      <div class="legend"><span><i class="sw flex"></i>Spent <b>${moneyR(spent)}</b></span><span><i class="sw save-s"></i>Saved &amp; invested <b>${moneyR(saved)}</b></span>
        <span><i class="sw leftsw"></i>${left >= 0 ? 'Left over' : 'Short by'} <b class="${left >= 0 ? '' : 'neg'}">${moneyR(Math.abs(left))}</b></span></div>
      ${left < 0 ? '<p class="hint">More went out than came in this month so far.</p>' : ''}</div></section>` : ''}

    <section><div class="sec-h"><h2>Regular income</h2><span class="hint">Logs itself on payday</span></div>
      ${regular.length ? `<ul class="list">${regular.map(row).join('')}</ul>` : `<p class="empty">Add your salary once and it logs itself on payday every month.</p>`}
      <button type="button" class="btn primary" style="margin-top:12px;width:100%" data-add-income>Add regular income</button></section>

    <section><div class="sec-h"><h2>Received in ${esc(monthName(ym))}</h2></div>
      ${list.length ? `<ul class="list">${list.map((x) => txRow(x, true)).join('')}</ul>` : `<p class="empty">Nothing received yet. One-off money in can be typed in the box, like <b>+50 refund</b>.</p>`}</section>

    <section><div class="sec-h"><h2>Last 12 months</h2><span class="hint">Tap a bar</span></div><div class="card form">${barChart({ values: vals, color: 'in', maxBar: 18,
      ticks: [0, 3, 6, 9, 11], labels: names, tips: vals.map((v, i) => `${names[i]} · ${money(v)}`), ref: avg, refLabel: avg ? `avg ${moneyR(avg)}` : '',
      aria: `Money in per month, last 12 months` })}
      <div class="legend">${avg ? `<span>Average month <b>${moneyR(avg)}</b></span>` : ''}<span>Last 12 months <b>${moneyR(vals.reduce((a, b) => a + b, 0))}</b></span></div></div></section>
  </div>`;
}
