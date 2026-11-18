// ---------- State ----------
function defaultState() {
  return {
    v: 1, people: ['Me'], setup: false, defaultWho: 'shared', txns: [], learned: {}, aliases: {}, fixed: [], recap: {}, goals: [],
    theme: { style: 'pop', mode: 'system', chosen: true },
    budgets: { groceries: 45000, eating: 15000, transport: 15000, bills: 120000, shopping: 10000, fun: 6000, subs: 4000, home: 5000 },
  };
}
/* Example data: about four months of a plausible household, so every view has something to show. All marked example. */
function seedExamples(s) {
  const t = todayISO(), today = fromISO(t);
  let r = 11;
  const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1, 12);
  const startYm = monthOf(iso(start));
  const txns = [];
  let ts = Date.now() - 1e8;
  const push = (desc, amt, type, cat, date, exWho, fixedId) => txns.push({ id: uid(), amt, type, desc, mkey: TP.normKey(desc), cat, date, who: null, ts: ts++, example: true, exWho, fixedId });
  s.fixed = [['Rent', 95000, 1, 'bills', 2], ['Council Tax', 16800, 8, 'bills', 2], ['Octopus Energy', 11200, 12, 'bills', 2], ['Broadband', 3200, 20, 'bills', 2],
    ['Netflix', 1099, 7, 'subs', 2], ['Spotify', 1199, 10, 'subs', 0], ['Phone', 1800, 15, 'bills', 1], ['PureGym', 2499, 3, 'health', 0],
    ['Salary', 240000, 25, 'income', 0], ['Salary', 195000, 28, 'income', 1], ['Stocks and Shares ISA', 30000, 26, 'invest', 0], ['Emergency Fund', 15000, 26, 'savings', 2], ['Pension Top-up', 10000, 26, 'invest', 1]]
    .map(([desc, amt, day, cat, exWho]) => ({ id: uid(), desc, amt, day, cat, who: null, exWho, start: startYm, posted: [], active: true, example: true }));
  for (const d = new Date(start); iso(d) <= t; d.setDate(d.getDate() + 1)) {
    const ds = iso(d), dow = d.getDay(), dom = d.getDate();
    for (const f of s.fixed) if (f.day === dom) { push(f.desc, f.amt, f.cat === 'income' ? 'in' : isSave(f.cat) ? 'save' : 'out', f.cat, ds, f.exWho, f.id); f.posted.push(monthOf(ds)); }
    if (dow >= 1 && dow <= 5 && rnd() < 0.55) push('Coffee', 320, 'out', 'eating', ds, rnd() < 0.5 ? 0 : 1);
    if (dow === 6 || (dow === 3 && rnd() < 0.6)) { const shop = rnd() < 0.6 ? 'Tesco' : 'Aldi'; push(shop, Math.round(1800 + rnd() * 6200), 'out', 'groceries', ds, 2); }
    if (dow === 5 && rnd() < 0.7) push(pick(['Deliveroo', 'Nandos', 'Pub', 'Wagamama']), Math.round(1800 + rnd() * 4200), 'out', 'eating', ds, 2);
    if (dow === 1 && rnd() < 0.5) push('Pret', Math.round(500 + rnd() * 500), 'out', 'eating', ds, 1);
    if (rnd() < 0.08) push('Shell', Math.round(4500 + rnd() * 2000), 'out', 'transport', ds, 0);
    if (rnd() < 0.05) push('Trainline', Math.round(2000 + rnd() * 4000), 'out', 'transport', ds, 1);
    if (rnd() < 0.07) { const m = pick(['Amazon', 'Boots', 'Primark', 'Argos']); push(m, Math.round(800 + rnd() * 4000), 'out', TP.keywordCategory(TP.normKey(m)), ds, rnd() < 0.5 ? 0 : 1); }
    if (rnd() < 0.03) push(pick(['Cinema', 'Gig tickets']), Math.round(1800 + rnd() * 3000), 'out', 'fun', ds, 2);
  }
  s.txns = txns;
  s.goals = [{ id: uid(), name: 'Emergency Fund', target: 500000, start: 120000, by: null, since: startYm + '-01', example: true }];
}
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  if (!s || s.v !== 1 || !Array.isArray(s.txns)) { s = defaultState(); seedExamples(s); }
  const d = defaultState();
  for (const k of ['fixed', 'recap', 'theme', 'goals', 'aliases']) if (!s[k]) s[k] = d[k];
  if (!s.theme.chosen) s.theme = d.theme; // Pop became the house style; earlier saves had no explicit choice
  return s;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep in memory */ }
  syncSoon();
}
let S = load();
const isPair = () => S.people.length === 2;
const whoLabel = (w) => (w === 'shared' ? 'Joint' : w || '');
const whoClass = (w) => (w === 'shared' ? 'shared' : w === S.people[0] ? 'p1' : w === S.people[1] ? 'p2' : 'all');
const ctx = () => ({ people: S.people, learned: S.learned, aliases: S.aliases, defaultWho: isPair() ? S.defaultWho : null });
