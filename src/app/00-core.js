const TP = window.TallyParser;
const CATS = TP.CATEGORIES;
const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
const SPEND_CATS = CATS.filter((c) => !c.income && !c.save);
const OUT_CATS = CATS.filter((c) => !c.income);
const isSave = (id) => !!(CAT[id] && CAT[id].save);
const saveWord = (id) => (id === 'invest' ? 'invested' : 'saved');
const KEY = 'tally.v1';

const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const GBP0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money = (p) => GBP.format((p || 0) / 100);
const moneyR = (p) => (Math.abs(p) % 100 === 0 || Math.abs(p) >= 100000 ? GBP0.format(Math.round(p / 100)) : GBP.format(p / 100));
const iso = TP.iso;
const todayISO = () => iso(new Date());
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return iso(d); };
const monthOf = (s) => s.slice(0, 7);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const catStyle = (id) => `style="--h:${(CAT[id] || CAT.other).hue}"`;
const dot = (id) => `<i class="dot${id === 'other' ? ' other' : ''}" ${catStyle(id)} aria-hidden="true"></i>`;

function dateLabel(s, long) {
  const t = todayISO();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  const d = fromISO(s);
  const diff = Math.round((fromISO(t) - d) / 864e5);
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-GB', { weekday: long ? 'long' : 'short' }) + (long ? '' : ' ' + d.getDate());
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', Object.assign({ day: 'numeric', month: 'short' }, sameYear ? {} : { year: 'numeric' }, long ? { weekday: 'short' } : {}));
}
const monthName = (ym, withYear) => fromISO(ym + '-01').toLocaleDateString('en-GB', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });
