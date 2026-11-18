// ---------- Toast ----------
const toastEl = $('#toast');
let toastTimer = null, toastUndo = null;
function toast(text, undo) {
  $('#toastText').textContent = text;
  toastUndo = undo || null;
  $('#toastUndo').hidden = !undo;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() { toastEl.classList.remove('show'); setTimeout(() => { if (!toastEl.classList.contains('show')) toastEl.hidden = true; }, 200); toastUndo = null; }
$('#toastUndo').addEventListener('mousedown', (e) => e.preventDefault());
$('#toastUndo').addEventListener('click', () => {
  const u = toastUndo; hideToast();
  if (u) { u(); toast('Undone'); }
});
