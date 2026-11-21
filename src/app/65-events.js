// ---------- Global events ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  let b;
  if ((b = t.closest('[data-budget]'))) return editBudget(b.dataset.budget);
  if ((b = t.closest('[data-month]'))) {
    const d = fromISO(ui.month + '-01'); d.setMonth(d.getMonth() + +b.dataset.month);
    const m = monthOf(iso(d)); if (m <= monthOf(todayISO())) { ui.month = m; renderView(); }
    return;
  }
  if ((b = t.closest('[data-who-tab]'))) { ui.who = b.dataset.whoTab; renderInsights(); return; }
  if ((b = t.closest('[data-period]'))) { ui.period = b.dataset.period; renderInsights(); return; }
  if ((b = t.closest('[data-step]'))) {
    const n = +b.dataset.step, td = todayISO();
    if (ui.period === 'week') { const w = addDays(ui.week, 7 * n); if (w <= weekStart(td)) ui.week = w; }
    else if (ui.period === 'month') { const m = n > 0 ? nextMonth(ui.month) : prevMonth(ui.month); if (m <= monthOf(td)) ui.month = m; }
    else { const y = ui.year + n; if (y <= +td.slice(0, 4)) ui.year = y; }
    renderInsights(); return;
  }
  if ((b = t.closest('[data-goto-who]'))) { ui.who = b.dataset.gotoWho; ui.period = 'month'; ui.month = monthOf(todayISO()); ui.keep = true; return; }
  if ((b = t.closest('[data-goto-period]'))) { ui.period = b.dataset.gotoPeriod; ui.week = b.dataset.gotoWeek || weekStart(todayISO()); if (b.dataset.gotoMonth) ui.month = b.dataset.gotoMonth; ui.keep = true; return; }
  if ((b = t.closest('[data-heat]'))) {
    document.querySelectorAll('[data-heat].sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const cap = $('#heatCap'); if (cap) cap.innerHTML = `<b>${esc(dateLabel(b.dataset.heat, true))}</b> · ${money(+b.dataset.v)}`;
    return;
  }
  if ((b = t.closest('[data-fixed]'))) return editFixed(b.dataset.fixed);
  if (t.closest('[data-add-fixed]')) return editFixed(null);
  if (t.closest('[data-add-goal]')) return editGoal(null);
  if ((b = t.closest('[data-goal]'))) return editGoal(b.dataset.goal);
  if (t.closest('[data-add-income]')) return editFixed(null, { cat: 'income', who: isPair() ? S.people[0] : null });
  if ((b = t.closest('[data-suggest]'))) { const x = S.txns.find((y) => y.id === b.dataset.suggest); if (x) editFixed(null, { desc: x.desc, amt: x.amt, day: +x.date.slice(8), cat: x.cat, who: x.who }); return; }
  if ((b = t.closest('[data-dismiss]'))) { S.recap[b.dataset.dismiss] = b.dataset.dismiss === 'week' ? weekStart(todayISO()) : monthOf(todayISO()); save(); renderHome(); return; }
  if ((b = t.closest('[data-style-pick]'))) { S.theme.style = b.dataset.stylePick; S.theme.chosen = true; save(); applyTheme(); document.querySelectorAll('[data-style-pick]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.stylePick === S.theme.style))); return; }
  if ((b = t.closest('[data-mode]'))) { S.theme.mode = b.dataset.mode; save(); applyTheme(); renderPrefs(); return; }
  if ((b = t.closest('[data-drill]'))) { ui.q = CAT[b.dataset.drill].name; ui.filter = ui.who; location.hash = 'activity'; return; }
  if ((b = t.closest('[data-filter]'))) { ui.filter = b.dataset.filter; return renderActivity(); }
  if (t.closest('[data-clear-examples]')) {
    const removed = S.txns.filter((x) => x.example), removedF = S.fixed.filter((x) => x.example), removedG = S.goals.filter((x) => x.example);
    S.txns = S.txns.filter((x) => !x.example); S.fixed = S.fixed.filter((x) => !x.example); S.goals = S.goals.filter((x) => !x.example); save(); refresh();
    return toast(`Cleared ${removed.length} example entries`, () => { S.txns = S.txns.concat(removed); S.fixed = S.fixed.concat(removedF); S.goals = S.goals.concat(removedG); save(); refresh(); });
  }
  if (t.closest('[data-sync-start]')) { b = t.closest('[data-sync-start]'); b.disabled = true; b.textContent = 'Starting…'; startHousehold().then((ok) => { if (ok) toast('Household started. Copy the invite link for your partner.'); }); return; }
  if (t.closest('[data-sync-now]')) { syncNow().then((ok) => toast(ok ? 'Synced' : SY.error || 'Sync failed')); return; }
  if (t.closest('[data-copy-invite]')) {
    const link = inviteLink();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(() => toast('Invite link copied'), () => toast('Copy was blocked. Share the code instead.'));
    else toast('Copy was blocked. Share the code instead.');
    return;
  }
  if ((b = t.closest('[data-sync-leave]'))) {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tap again to stop syncing'; setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = 'Stop syncing on this phone'; } }, 4000); return; }
    leaveHousehold(); return;
  }
  if (t.closest('[data-ob-join]')) {
    const btn = t.closest('[data-ob-join]'); btn.disabled = true; btn.textContent = 'Joining…';
    joinHousehold($('#obCode').value).then((ok) => { btn.disabled = false; btn.textContent = 'Join household'; if (ok) { $('#onboard').hidden = true; qa.input.focus(); } });
    return;
  }
  if (t.closest('[data-import]')) return startImport();
  if ((b = t.closest('[data-log-income]'))) return logIncome(b.dataset.logIncome);
  if ((b = t.closest('[data-snooze-income]'))) { S.paySnooze = Object.assign({}, S.paySnooze, { [b.dataset.snoozeIncome]: todayISO() }); save(); renderHome(); return toast("OK, you'll be asked again tomorrow"); }
  if (t.closest('[data-keep-examples]')) { S.exKeep = true; save(); renderHome(); return; }
  if ((b = t.closest('[data-default-who]'))) { S.defaultWho = b.dataset.defaultWho; save(); refresh(); return; }
  if ((b = t.closest('[data-unalias]'))) { const k = b.dataset.unalias, v = S.aliases[k]; delete S.aliases[k]; save(); refresh(); return toast(`Forgot “${k}”`, () => { S.aliases[k] = v; save(); refresh(); }); }
  if ((b = t.closest('[data-unlearn]'))) { const k = b.dataset.unlearn, v = S.learned[k]; delete S.learned[k]; save(); refresh(); return toast(`Forgot ${TP.titleCase(k)}`, () => { S.learned[k] = v; save(); refresh(); }); }
  if (t.closest('[data-export]')) {
    try {
      const blob = new Blob([exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `tally-backup-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) { toast('Download blocked here. Use Copy backup instead.'); }
    return;
  }
  if (t.closest('[data-copy]')) {
    const txt = exportJSON();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('Backup copied'), () => toast('Copy was blocked on this device'));
    else toast('Copy was blocked on this device');
    return;
  }
  if (t.closest('[data-install]') && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
  if ((b = t.closest('[data-erase]'))) {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tap again to erase all'; setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = 'Erase everything'; } }, 4000); return; }
    const prev = S; S = defaultState(); S.setup = true; S.people = prev.people; save(); refresh();
    return toast('Everything erased', () => { S = prev; save(); refresh(); });
  }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'onboardForm') {
    e.preventDefault();
    const n1 = $('#obName1').value.trim();
    if (!n1) { $('#obName1').focus(); return; }
    if (!$('#obExamples').checked) { S.txns = S.txns.filter((x) => !x.example); S.fixed = S.fixed.filter((x) => !x.example); S.goals = S.goals.filter((x) => !x.example); S.budgets = {}; } // a real start has no made-up budgets
    savePeople(n1, $('#obName2').value);
    // paydays set on the welcome screen become regular income with payday reminders
    const cur = monthOf(todayISO());
    [1, 2].forEach((n) => {
      const day = $('#obPay' + n).value, owner = S.people[n - 1];
      if (!day || !owner || $('#obPayRow' + n).hidden) return;
      const a = TP.parseAmount($('#obAmt' + n).value.replace(/[\s,£]/g, ''));
      S.fixed.push({ id: uid(), desc: 'Salary', amt: a ? a.pence : 0, day: day === 'last' ? 'last' : +day, cat: 'income', who: isPair() ? owner : null,
        start: cur, posted: [], active: true });
    });
    save(); refresh();
    $('#onboard').hidden = true;
    qa.input.focus();
  }
  if (e.target.matches('[data-join-form]')) { e.preventDefault(); joinHousehold($('#joinCode').value); return; }
  if (e.target.id === 'peopleForm') { e.preventDefault(); savePeople($('#pName1').value, $('#pName2').value); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'actSearch') { ui.q = e.target.value; renderActivity(); } });
document.addEventListener('change', (e) => {
  if (e.target.id === 'importFile' && e.target.files[0]) { e.target.files[0].text().then(importJSON); e.target.value = ''; }
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (ui.tab === 'prefs') renderPrefs(); });

// Welcome screen: payday rows follow the names as they are typed
function obPayLabels() {
  const n1 = $('#obName1').value.trim(), n2 = $('#obName2').value.trim();
  $('#obPayName1').textContent = n1 || 'You';
  $('#obPayName2').textContent = n2 || 'Partner';
  $('#obPayRow2').hidden = !n2;
}
document.addEventListener('input', (e) => { if (e.target.id === 'obName1' || e.target.id === 'obName2') obPayLabels(); });
