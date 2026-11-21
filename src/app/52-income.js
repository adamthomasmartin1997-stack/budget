// ---------- Income ----------
function renderIncome() {
  const el = $('#view-income');
  const t = todayISO(), ym = ui.month, isCur = ym === monthOf(t), pm = prevMonth(ym);
  const from = ym + '-01', to = `${ym}-${daysIn(ym)}`;
  const list = inRange(from, to).sort(sortTx);
  const got = total(list);
  const prevSame = total(inRange(pm + '-01', isCur ? `${pm}-${String(Math.min(+t.slice(8), daysIn(pm))).padStart(2, '0')}` : `${pm}-${daysIn(pm)}`));
  const regular = S.fixed.filter((f) => f.cat === 'income').sort((a, b) => (a.day === 'last' ? 32 : +a.day) - (b.day === 'last' ? 32 : +b.day));
  const expected = isCur ? regular.filter((f) => f.active && !receivedTxn(f, ym)) : [];
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
    const cur = monthOf(t), got = receivedTxn(f, cur), pay = paydayOf(f, cur);
    const days = Math.round((fromISO(pay) - fromISO(t)) / 864e5);
    const due = f.active && !got && days <= 0;
    const status = !f.active ? 'Paused' : got ? `Received ${shortDate(got.date)}` : days === 0 ? 'Payday today' : days < 0 ? 'Payday has passed' : days === 1 ? 'Payday tomorrow' : `Payday in ${days} days`;
    return `<li class="inc-row"><button type="button" class="fx${got ? ' paid' : ''}${f.active ? '' : ' paused'}" data-fixed="${f.id}">
      <span class="fx-day">${payDayBox(f)}</span>
      <span class="tx-main"><b>${esc(f.desc)}${f.example ? '<span class="tag">example</span>' : ''}</b><small>${isPair() ? esc(whoLabel(f.who || 'shared')) + ' · ' : ''}<span class="status ${got ? 'paid' : due ? 'due' : ''}">${esc(status)}</span></small></span>
      <span class="tx-amt in">${got ? '+' + money(got.amt) : usualAmount(f) ? `<small>usually</small>${moneyR(usualAmount(f))}` : ''}</span></button>
      ${due ? `<button type="button" class="btn primary inc-log" data-log-income="${f.id}">Log this month's amount</button>` : ''}</li>`;
  };

  el.innerHTML = `<div class="stack">${monthNav()}
    <div class="card hero"><span class="eyebrow">Money in · ${esc(monthName(ym))}</span>
      <div class="big pos">${esc(money(got).split('.')[0])}<small>.${esc(money(got).split('.')[1])}</small></div>
      ${prevSame ? `<div class="sub">${Math.abs(got - prevSame) < 100 ? 'About the same as' : `<b>${moneyR(Math.abs(got - prevSame))}</b> ${got > prevSame ? 'more' : 'less'} than`} by ${esc(isCur ? `this point in ${monthName(pm)}` : `the end of ${monthName(pm)}`)}</div>` : ''}
      ${expected.length ? `<div class="sub">Still to come: ${expected.some((f) => usualAmount(f)) ? `about <b>${moneyR(expected.reduce((a, f) => a + usualAmount(f), 0))}</b> from ` : ''}${expected.map((f) => `${esc(f.desc)}${isPair() && f.who && f.who !== 'shared' ? ` (${esc(f.who)})` : ''} on ${esc(shortDate(paydayOf(f, ym)))}`).join(', ')}</div>` : ''}
      ${isPair() && got ? `<div class="legend">${S.people.concat('shared').map((w) => `<span><i class="sw ${whoClass(w)}"></i>${esc(whoLabel(w))} <b>${moneyR(total(list.filter((x) => whoOf(x) === w)))}</b></span>`).join('')}</div>` : ''}
    </div>

    ${got ? `<section><div class="sec-h"><h2>Where it went</h2></div><div class="card form">
      <div class="sbar" role="img" aria-label="Spent ${money(spent)}, saved ${money(saved)}, left ${money(Math.max(0, left))}">
        ${spent ? `<i class="flex" style="flex:${spent}"></i>` : ''}${saved ? `<i class="savebar" style="flex:${saved}"></i>` : ''}${left > 0 ? `<i class="leftbar" style="flex:${left}"></i>` : ''}</div>
      <div class="legend"><span><i class="sw flex"></i>Spent <b>${moneyR(spent)}</b></span><span><i class="sw save-s"></i>Saved &amp; invested <b>${moneyR(saved)}</b></span>
        <span><i class="sw leftsw"></i>${left >= 0 ? 'Left over' : 'Short by'} <b class="${left >= 0 ? '' : 'neg'}">${moneyR(Math.abs(left))}</b></span></div>
      ${left < 0 ? '<p class="hint">More went out than came in this month so far.</p>' : ''}</div></section>` : ''}

    <section><div class="sec-h"><h2>Regular income</h2><span class="hint">Asked for on payday</span></div>
      ${regular.length ? `<ul class="list">${regular.map(row).join('')}</ul>` : `<p class="empty">Add each salary with its payday. On the day, you're asked what actually arrived.</p>`}
      <button type="button" class="btn primary" style="margin-top:12px;width:100%" data-add-income>Add regular income</button></section>

    <section><div class="sec-h"><h2>Received in ${esc(monthName(ym))}</h2></div>
      ${list.length ? `<ul class="list">${list.map((x) => txRow(x, true)).join('')}</ul>` : `<p class="empty">Nothing received yet. One-off money in can be typed in the box, like <b>+50 refund</b>.</p>`}</section>

    ${vals.some((v) => v > 0) ? `    <section><div class="sec-h"><h2>Last 12 months</h2><span class="hint">Tap a bar</span></div><div class="card form">${barChart({ values: vals, color: 'in', maxBar: 18,
      ticks: [0, 3, 6, 9, 11], labels: names, tips: vals.map((v, i) => `${names[i]} · ${money(v)}`), ref: avg, refLabel: avg ? `avg ${moneyR(avg)}` : '',
      aria: `Money in per month, last 12 months` })}
      <div class="legend">${avg ? `<span>Average month <b>${moneyR(avg)}</b></span>` : ''}<span>Last 12 months <b>${moneyR(vals.reduce((a, b) => a + b, 0))}</b></span></div></div></section>` : ''}
  </div>`;
}
