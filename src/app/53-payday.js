// ---------- Payday ----------
// Regular income never logs itself, because the real amount changes from month to month. On payday the app asks
// for the actual figure. A salary typed in by hand or imported from a statement counts as received.
/** The actual payday in a month. "last" is the last working day; a payday on a weekend moves to the Friday before, as UK employers do. */
function paydayOf(f, ym) {
  const day = f.day === 'last' ? daysIn(ym) : Math.min(+f.day, daysIn(ym));
  const d = fromISO(`${ym}-${String(day).padStart(2, '0')}`);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return iso(d);
}
const payDayBox = (f) => (f.day === 'last' ? '<b>Last</b><small>work day</small>' : `<b>${f.day}</b><small>${ordinal(+f.day).slice(-2)}</small>`);
const payDayText = (f) => (f.day === 'last' ? 'the last working day' : `the ${ordinal(+f.day)}`);

/** The entry that is this month's payment of regular income f, if there is one. */
function receivedTxn(f, ym) {
  const linked = S.txns.find((t) => t.fixedId === f.id && monthOf(t.date) === ym && t.type === 'in');
  if (linked) return linked;
  const pay = paydayOf(f, ym), from = addDays(pay, -4), to = addDays(pay, 7), key = TP.normKey(f.desc);
  const usual = usualAmount(f);
  const taken = new Set(S.fixed.filter((g) => g !== f && g.cat === 'income').map((g) => S.txns.find((t) => t.fixedId === g.id && monthOf(t.date) === ym)).filter(Boolean).map((t) => t.id));
  const cands = S.txns.filter((t) => t.type === 'in' && !t.fixedId && !taken.has(t.id) && t.date >= from && t.date <= to &&
    (!isPair() || !f.who || f.who === 'shared' || t.who === f.who));
  return cands.find((t) => t.mkey === key) || cands.find((t) => usual && Math.abs(t.amt - usual) <= usual * 0.3) ||
    (!usual ? cands.find((t) => t.cat === 'income' && /salary|wage|pay/.test(t.mkey)) : null) || null;
}
/** Usual amount: the average of the last three real payments, or the amount set up. */
function usualAmount(f) {
  const got = S.txns.filter((t) => t.fixedId === f.id && t.type === 'in').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  return got.length ? Math.round(got.reduce((a, t) => a + t.amt, 0) / got.length) : f.amt;
}
/** Regular income that is due (payday has come) but not logged yet this month. */
function paydaysDue() {
  const t = todayISO(), ym = monthOf(t);
  return S.fixed.filter((f) => f.cat === 'income' && f.active && !f.example && ym >= f.start && paydayOf(f, ym) <= t && !receivedTxn(f, ym) && (S.paySnooze || {})[f.id] !== t);
}
function incomeName(f) { return isPair() && f.who && f.who !== 'shared' ? `${f.who}'s ${f.desc.toLowerCase()}` : f.desc; }

function logIncome(id, ym) {
  const f = S.fixed.find((x) => x.id === id);
  if (!f) return;
  ym = ym || monthOf(todayISO());
  const pay = paydayOf(f, ym), t = todayISO();
  openSheet(`${incomeName(f)[0].toUpperCase()}${incomeName(f).slice(1)} for ${monthName(ym)}`, `<form class="form" data-form>
    <div class="field"><label for="liAmt">Amount that arrived (£)</label><input class="input big-in" id="liAmt" inputmode="decimal" value="${usualAmount(f) ? (usualAmount(f) / 100).toFixed(2) : ''}" placeholder="0.00"></div>
    <p class="hint">${usualAmount(f) ? `Usually about ${moneyR(usualAmount(f))}. Change it to what actually came in.` : "Type what came in. Next month this amount is filled in for you."}</p>
    <div class="field"><label for="liDate">Date</label><input class="input" type="date" id="liDate" value="${pay <= t ? pay : t}"></div>
    <button class="btn primary" type="submit">Log it</button></form>`, (act, el, body) => {
    if (act !== 'submit') return;
    const a = TP.parseAmount($('#liAmt', body).value.replace(/[\s,£]/g, ''));
    if (!a) return $('#liAmt', body).focus();
    const date = $('#liDate', body).value || pay;
    // the same id on both phones, so logging it on each still gives one entry
    const tx = { id: `fx-${f.id}-${ym}`, amt: a.pence, type: 'in', desc: f.desc, mkey: TP.normKey(f.desc), cat: 'income', date,
      who: isPair() ? f.who || 'shared' : null, ts: Date.now(), fixedId: f.id };
    S.txns = S.txns.filter((x) => x.id !== tx.id).concat(tx);
    if (!f.posted.includes(ym)) f.posted.push(ym);
    save(); closeSheet(); refresh();
    toast(`Logged +${money(a.pence)} · ${f.desc}`, () => { S.txns = S.txns.filter((x) => x.id !== tx.id); f.posted = f.posted.filter((m) => m !== ym); save(); refresh(); });
  }, '#liAmt');
}

function paydayCards() {
  return paydaysDue().map((f) => `<div class="notice payday"><p><b>Payday.</b> Has ${esc(incomeName(f))} arrived?${usualAmount(f) ? ` It's usually about ${moneyR(usualAmount(f))}.` : ''}</p>
    <div class="btns"><button type="button" class="btn primary" data-log-income="${f.id}">Log the amount</button><button type="button" class="btn" data-snooze-income="${f.id}">Not yet</button></div></div>`).join('');
}
