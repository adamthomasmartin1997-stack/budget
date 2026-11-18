// ---------- Recaps ----------
function recapCards() {
  const t = todayISO(), ws = weekStart(t), out = [];
  const lw = addDays(ws, -7);
  const lwList = outRange(lw, addDays(ws, -1), 'all');
  if (S.recap.week !== ws && lwList.length) {
    const before = total(outRange(addDays(lw, -7), addDays(lw, -1), 'all'));
    const top = byKey(lwList, (x) => x.cat)[0], place = byKey(lwList, (x) => x.mkey || x.desc)[0];
    const bigDay = byKey(lwList, (x) => x.date)[0];
    out.push(`<div class="card recap fresh"><div class="recap-h"><h2>Your week, ${esc(weekLabel(lw))}</h2><button type="button" class="link" data-dismiss="week">Got it</button></div>
      <div class="lines"><span>You spent <b>${money(total(lwList))}</b>. ${deltaSentence(total(lwList), before, 'the week before')}</span>
      <span>Most went on <b>${esc(CAT[top.k].name)}</b> (${moneyR(top.v)}). Top place: <b>${esc(place.t.desc)}</b>, ${place.n} visit${place.n === 1 ? '' : 's'}.</span>
      <span>Busiest day was ${esc(fromISO(bigDay.k).toLocaleDateString('en-GB', { weekday: 'long' }))} at ${moneyR(bigDay.v)}.</span></div>
      <a class="link" href="#insights" data-goto-period="week" data-goto-week="${lw}">See the full week</a></div>`);
  }
  const cur = monthOf(t), pm = prevMonth(cur);
  const pmList = outRange(pm + '-01', `${pm}-${daysIn(pm)}`, 'all');
  if (+t.slice(8) <= 7 && S.recap.month !== cur && pmList.length) {
    const sp = total(pmList), inc = total(inRange(pm + '-01', `${pm}-${daysIn(pm)}`)), bud = totalBudget();
    const ppm = prevMonth(pm), before = total(outRange(ppm + '-01', `${ppm}-${daysIn(ppm)}`, 'all'));
    const top = byKey(pmList, (x) => x.cat)[0];
    out.push(`<div class="card recap fresh"><div class="recap-h"><h2>${esc(monthName(pm))} in review</h2><button type="button" class="link" data-dismiss="month">Got it</button></div>
      <div class="lines"><span>Spent <b>${moneyR(sp)}</b>${bud ? ` against a ${moneyR(bud)} budget (${sp <= bud ? `<b class="pos">${moneyR(bud - sp)} under</b>` : `<b class="neg">${moneyR(sp - bud)} over</b>`})` : ''}. ${deltaSentence(sp, before, monthName(ppm))}</span>
      ${inc ? `<span>Money in ${moneyR(inc)}, so you kept <b class="${inc - sp >= 0 ? 'pos' : 'neg'}">${moneyR(inc - sp)}</b>.</span>` : ''}
      <span>Biggest category: <b>${esc(CAT[top.k].name)}</b> at ${moneyR(top.v)}.</span></div>
      <a class="link" href="#insights" data-goto-period="month" data-goto-month="${pm}">See ${esc(monthName(pm))}</a></div>`);
  }
  return out.join('');
}
function recapPending() {
  const t = todayISO(), ws = weekStart(t);
  if (S.recap.week !== ws && outRange(addDays(ws, -7), addDays(ws, -1), 'all').length) return true;
  const cur = monthOf(t), pm = prevMonth(cur);
  return +t.slice(8) <= 7 && S.recap.month !== cur && outRange(pm + '-01', `${pm}-${daysIn(pm)}`, 'all').length > 0;
}
