// ---------- Savings goals ----------
// A goal counts every "saved" or "invested" entry whose name matches the goal (e.g. "emergency fund 150"), plus what you had at the start.
const goalKey = (g) => TP.normKey(g.name);
function goalProgress(g) {
  const k = goalKey(g);
  const list = S.txns.filter((t) => t.type === 'save' && (t.mkey === k || (g.keys || []).includes(t.mkey)) && t.date >= (g.since || '0000'));
  const saved = (g.start || 0) + total(list);
  const t = todayISO(), from = addDays(t, -90);
  const recent = total(list.filter((x) => x.date >= from));
  const perMonth = Math.round(recent / 3);
  return { saved, perMonth, n: list.length };
}
function goalCard(g) {
  const p = goalProgress(g);
  const pct = g.target ? Math.min(100, (p.saved / g.target) * 100) : 0;
  const left = Math.max(0, g.target - p.saved);
  let line = '';
  if (!left) line = '<b class="pos">Goal reached.</b>';
  else if (g.by) {
    const now = new Date(), [y, m] = g.by.split('-').map(Number);
    const months = Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
    const need = Math.ceil(left / months / 100) * 100;
    line = `Needs <b>${moneyR(need)}</b> a month to hit it by ${esc(fromISO(g.by + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}`
      + (p.perMonth ? `. You're averaging ${moneyR(p.perMonth)}.` : '.');
  } else if (p.perMonth) {
    const months = Math.ceil(left / p.perMonth);
    const d = new Date(); d.setMonth(d.getMonth() + months);
    line = `At ${moneyR(p.perMonth)} a month you'll get there around <b>${esc(d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</b>.`;
  } else line = `Log money in as <b>${esc(g.name.toLowerCase())} 100</b> and it counts here.`;
  return `<button type="button" class="goal" data-goal="${g.id}">
    <span class="goal-top"><b>${esc(g.name)}</b><span><b class="sv">${moneyR(p.saved)}</b> <span class="muted">of ${moneyR(g.target)}</span></span></span>
    <span class="bar goalbar" role="img" aria-label="${Math.round(pct)}% of goal"><i style="width:${pct.toFixed(1)}%"></i></span>
    <small>${Math.round(pct)}% · ${line}</small></button>`;
}
function goalsSection() {
  const goals = S.goals || [];
  return `<section><div class="sec-h"><h2>Savings goals</h2><button type="button" class="link" data-add-goal>Add a goal</button></div>
    ${goals.length ? `<div class="card goals">${goals.map(goalCard).join('')}</div>`
      : `<button type="button" class="card empty-goal" data-add-goal><b>Set a savings goal</b><span>An emergency fund, a holiday, a house deposit. Pick a target and see when you'll get there.</span></button>`}</section>`;
}
function editGoal(id) {
  const g = id ? S.goals.find((x) => x.id === id) : null;
  const pots = [...new Set(S.txns.filter((t) => t.type === 'save').map((t) => t.desc))].slice(0, 12);
  openSheet(g ? 'Edit goal' : 'New savings goal', `<form class="form" data-form>
    <div class="field"><label for="gName">What are you saving for?</label><input class="input" id="gName" list="gPots" value="${esc(g ? g.name : '')}" placeholder="Emergency fund">
      <datalist id="gPots">${pots.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></div>
    <div class="row2"><div class="field"><label for="gTarget">Target (£)</label><input class="input" id="gTarget" inputmode="decimal" value="${g ? (g.target / 100).toFixed(0) : ''}" placeholder="5000"></div>
    <div class="field"><label for="gStart">Already saved (£)</label><input class="input" id="gStart" inputmode="decimal" value="${g && g.start ? (g.start / 100).toFixed(0) : ''}" placeholder="0"></div></div>
    <div class="field"><label for="gBy">Target date (optional)</label><input class="input" id="gBy" type="month" value="${g && g.by ? g.by : ''}"></div>
    <p class="hint">Anything you log with this name as saved or invested counts towards it, for example <b>${esc((g ? g.name : 'emergency fund').toLowerCase())} 150</b>.</p>
    <div class="btns">${g ? '<button class="btn danger" type="button" data-act="del">Delete</button>' : ''}<button class="btn primary" type="submit">${g ? 'Save' : 'Add goal'}</button></div>
  </form>`, (act, el, body) => {
    if (act === 'del') { const i = S.goals.indexOf(g); S.goals.splice(i, 1); save(); closeSheet(); refresh(); toast(`Removed ${g.name}`, () => { S.goals.splice(i, 0, g); save(); refresh(); }); return; }
    if (act !== 'submit') return;
    const name = TP.titleCase($('#gName', body).value.trim());
    const target = TP.parseAmount($('#gTarget', body).value.replace(/[\s,]/g, ''));
    const startV = $('#gStart', body).value.trim();
    const start = startV ? TP.parseAmount(startV.replace(/[\s,]/g, '')) : { pence: 0 };
    if (!name) return $('#gName', body).focus();
    if (!target) return $('#gTarget', body).focus();
    if (!start) return $('#gStart', body).focus();
    const by = $('#gBy', body).value || null;
    if (g) Object.assign(g, { name, target: target.pence, start: start.pence, by });
    else S.goals.push({ id: uid(), name, target: target.pence, start: start.pence, by, since: todayISO().slice(0, 4) + '-01-01' });
    save(); closeSheet(); refresh();
    toast(g ? 'Goal saved' : `Goal added: ${name}`);
  }, g ? null : '#gName');
}
