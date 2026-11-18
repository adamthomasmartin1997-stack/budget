// ---------- Routing ----------
const VIEWS = { home: renderHome, activity: renderActivity, insights: renderInsights, fixed: renderFixed, income: renderIncome, budget: renderBudget, prefs: renderPrefs };
function renderView() {
  VIEWS[ui.tab]();
  document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== ui.tab; });
  for (const [sel, tab] of [['.hdr-prefs', 'prefs'], ['.hdr-activity', 'activity']]) { const g = $(sel); if (ui.tab === tab) g.setAttribute('aria-current', 'page'); else g.removeAttribute('aria-current'); }
  const ins = document.querySelector('[data-tab="insights"]');
  const dot = ins.querySelector('.tab-dot');
  if (recapPending() && ui.tab !== 'insights') { if (!dot) ins.insertAdjacentHTML('beforeend', '<i class="tab-dot" aria-label="New recap"></i>'); } else if (dot) dot.remove();
  document.querySelectorAll('[data-tab]').forEach((a) => { if (a.dataset.tab === ui.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const now = new Date();
  $('#topMeta').textContent = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function refresh() { postFixed(); renderQuick(); renderChip(); renderView(); }
function route() {
  const h = (location.hash || '').slice(1);
  if (ui.qaOpen) closeQuickSheet();
  if (!sheetEl.hidden) closeSheet();
  const wantAdd = h === 'add' || /[?&]add\b/.test(location.search);
  const tab = VIEWS[h] ? h : 'home';
  if (tab !== ui.tab) {
    const pair = [ui.tab, tab].sort().join('>');
    const keep = ui.keep || ['activity>insights', 'budget>insights'].includes(pair);
    ui.keep = false;
    ui.tab = tab;
    if (!keep) { ui.month = monthOf(todayISO()); ui.week = weekStart(todayISO()); ui.year = new Date().getFullYear(); ui.q = ''; }
    window.scrollTo(0, 0);
  }
  renderView();
  if (wantAdd) { try { qa.input.focus(); } catch (e) { /* ignore */ } }
}
window.addEventListener('hashchange', route);
window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); refresh(); } });
// roll the date over if the app stays open past midnight
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

ui.week = weekStart(todayISO());
applyTheme();
const posted = postFixed();
if (!S.setup) { $('#onboard').hidden = false; $('#obJoin').hidden = !SYNC_ON; $('#obExamples').checked = !SYNC_ON; } // real site starts empty; the preview starts with examples
// Invite links look like ?join=CODE. Fill the code in and offer to join.
const joinParam = new URLSearchParams(location.search).get('join');
if (joinParam && SYNC_ON) {
  try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }
  if (!S.setup) { $('#obCode').value = normCode(joinParam); }
  else if (normCode(joinParam) !== SY.code) {
    setTimeout(() => openSheet('Join this household?', `<div class="form"><p>This invite adds this phone to a shared household. Entries already on this phone will be added to it, and example data will be cleared.</p>
      <div class="btns"><button type="button" class="btn" data-close>Not now</button><button type="button" class="btn primary" data-act="join">Join household</button></div></div>`,
      (act) => { if (act === 'join') { closeSheet(); joinHousehold(joinParam); } }), 300);
  }
}
if (SYNC_ON && SY.code) syncNow();
renderQuick();
renderChip();
route();
if (posted && S.setup) toast(`Logged ${posted} fixed cost${posted === 1 ? '' : 's'} due since you last opened Tally`);
if (window.matchMedia && window.matchMedia('(pointer: fine)').matches && ui.tab === 'home') { try { qa.input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

if (window.TALLY_PWA && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
