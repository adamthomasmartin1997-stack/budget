// ---------- Sheets ----------
const sheetEl = $('#sheet'), sheetBody = $('#sheetBody');
let sheetHandler = null, lastFocus = null;
function openSheet(title, html, handler, focusSel) {
  $('#sheetTitle').textContent = title;
  sheetBody.innerHTML = html;
  sheetHandler = handler;
  lastFocus = document.activeElement;
  sheetEl.hidden = false;
  requestAnimationFrame(() => sheetEl.classList.add('open'));
  const f = focusSel ? $(focusSel, sheetBody) : sheetBody.querySelector('button, input');
  if (f) { try { f.focus({ preventScroll: true }); if (f.select && focusSel) f.select(); } catch (e) { /* ignore */ } }
}
function closeSheet() {
  sheetEl.classList.remove('open');
  sheetEl.hidden = true;
  sheetHandler = null;
}
sheetEl.addEventListener('click', (e) => {
  if (e.target === sheetEl || e.target.closest('[data-close]')) { closeSheet(); if (lastFocus && lastFocus.focus) lastFocus.focus(); return; }
  const b = e.target.closest('[data-act]');
  if (b && sheetHandler) sheetHandler(b.dataset.act, b, sheetBody, e);
});
sheetEl.addEventListener('submit', (e) => {
  e.preventDefault();
  if (sheetHandler) sheetHandler('submit', e.target, sheetBody, e);
});

const qaSheet = $('#qaSheet');
function openQuickSheet() {
  $('#qaSheetSlot').appendChild(qa.box);
  qaSheet.hidden = false;
  ui.qaOpen = true;
  qa.input.focus();
  requestAnimationFrame(() => qaSheet.classList.add('open'));
}
function closeQuickSheet() {
  qaSheet.classList.remove('open');
  qaSheet.hidden = true;
  ui.qaOpen = false;
  $('#qaHomeSlot').appendChild(qa.box);
  qa.input.blur();
}
qaSheet.addEventListener('click', (e) => { if (e.target === qaSheet || e.target.closest('[data-close]')) closeQuickSheet(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!sheetEl.hidden) { closeSheet(); if (ui.qaOpen || ui.tab === 'home') qa.input.focus(); }
  else if (ui.qaOpen) closeQuickSheet();
});

$('#fab').addEventListener('click', () => {
  if (ui.tab === 'home') {
    qa.input.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else openQuickSheet();
});
