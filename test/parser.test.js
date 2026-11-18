// node test/parser.test.js
const P = require('../src/parser.js');
const ctx = { people: ['Adam', 'Sam'], learned: {}, defaultWho: 'shared', today: new Date(2026, 10, 17, 12) };
let fail = 0;
const t = (s, exp, c = ctx) => {
  const r = P.parse(s, c);
  for (const k in exp) if (r[k] !== exp[k]) { console.log('FAIL', JSON.stringify(s), k, 'got', r[k], 'want', exp[k]); fail++; return; }
  console.log('ok  ', s.padEnd(30), r.amt, r.type, r.desc, r.cat, r.date, r.who);
};
t('tesco 23.40', { amt: 2340, desc: 'Tesco', cat: 'groceries', type: 'out', who: 'shared', date: '2026-11-17' });
t('23.40 tesco', { amt: 2340, cat: 'groceries' });
t('coffee 3.2', { amt: 320, cat: 'eating' });
t('+2400 salary', { amt: 240000, type: 'in', cat: 'income' });
t('salary 2400 in', { amt: 240000, type: 'in' });
t('petrol 55 adam', { cat: 'transport', who: 'Adam' });
t('tesco 23.40 adam', { cat: 'groceries', who: 'Adam' });
t('dinner 60 split', { cat: 'eating', who: 'shared' });
t('lunch in town 12', { type: 'out' });
t("sainsbury's 41.12 yday", { cat: 'groceries', date: '2026-11-16' });
t('rent 950 1/11', { cat: 'bills', date: '2026-11-01' });
t('netflix 10.99 monthly', { cat: 'subs', recur: true, desc: 'Netflix' });
t('stocks and shares isa 300 adam', { type: 'save', cat: 'invest', who: 'Adam', desc: 'Stocks and Shares ISA' });
t('stock and share isa 200', { type: 'save', cat: 'invest' });
t('emergency fund 150', { type: 'save', cat: 'savings', desc: 'Emergency Fund' });
t('cash isa 100', { type: 'save', cat: 'savings' });
t('vanguard 250 monthly sam', { type: 'save', cat: 'invest', recur: true, who: 'Sam' });
t('pension 400', { type: 'save', cat: 'invest' });
t('+500 emergency fund', { type: 'in' });
t('tesco', { valid: false });
process.exit(fail ? 1 : 0);
