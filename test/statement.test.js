// node test/statement.test.js : bank CSV formats, cleaning, categories, duplicates
const fs = require('fs'), path = require('path');
const ST = require('../src/statement.js');
let fail = 0, n = 0;
const ok = (c, name, extra) => { n++; console.log(c ? 'ok  ' : 'FAIL', name, extra === undefined ? '' : extra); if (!c) fail++; };
const read = (f) => ST.readStatement(fs.readFileSync(path.join(__dirname, 'statements', f), 'utf8'));
const sug = (f, ctx) => ST.suggest(read(f).rows, ctx);
const pick = (list, desc) => list.find((x) => x.desc === desc);

let s = sug('monzo.csv');
ok(read('monzo.csv').bank === 'Monzo', 'Monzo recognised');
ok(pick(s, "Sainsbury's") && pick(s, "Sainsbury's").cat === 'groceries' && pick(s, "Sainsbury's").amt === 4112, "Monzo: Sainsbury's £41.12 groceries");
ok(pick(s, 'Pret') && pick(s, 'Pret').cat === 'eating', 'Monzo: Pret A Manger -> Pret, eating out');
ok(s.find((x) => x.raw === 'Savings').kind === 'transfer', 'Monzo: pot transfer marked as a transfer');
ok(pick(s, 'Netflix').cat === 'subs', 'Monzo: Netflix subscription');
ok(s.find((x) => x.type === 'in').amt === 240000, 'Monzo: salary £2,400 as money in');

s = sug('starling.csv');
ok(read('starling.csv').bank === 'Starling', 'Starling recognised');
ok(pick(s, 'Tesco').amt === 2340 && pick(s, 'TfL').cat === 'transport', 'Starling: Tesco and TfL');
ok(pick(s, 'Vanguard').type === 'save' && pick(s, 'Vanguard').cat === 'invest' && pick(s, 'Vanguard').kind === 'new', 'Starling: Vanguard ISA counted as invested, not a transfer');

s = sug('hsbc.csv');
ok(s.length === 5, 'HSBC: no header row, 5 rows found', s.length);
ok(pick(s, 'Tesco') && pick(s, "Sainsbury's") && pick(s, 'Amazon') && pick(s, 'Octopus Energy'), 'HSBC: messy descriptions cleaned to Tesco, Sainsbury\'s, Amazon, Octopus Energy', s.map((x) => x.desc).join(', '));
ok(s.find((x) => x.type === 'in').amt === 240000, 'HSBC: "2,400.00" read as £2,400');

s = sug('barclays.csv');
ok(read('barclays.csv').bank === 'Barclays' && pick(s, "McDonald's") && pick(s, 'Tesco'), 'Barclays: memo column used, McDonald\'s found', s.map((x) => x.desc).join(', '));
ok(s.find((x) => x.amt === 25000).kind === 'transfer', 'Barclays: transfer to savings account flagged');

s = sug('nationwide.csv');
ok(s.length === 3 && pick(s, 'Wetherspoons') && pick(s, 'Wetherspoons').amt === 1860, 'Nationwide: account lines skipped, £ and "02 Nov 2026" dates read', s.map((x) => x.desc + ' ' + x.date).join(', '));
ok(s.find((x) => x.type === 'in').amt === 240000, 'Nationwide: paid in column is money in');

s = sug('lloyds.csv');
ok(pick(s, 'Tesco').amt === 2340 && pick(s, 'British Gas').cat === 'bills' && pick(s, 'British Gas').type === 'out', 'Lloyds: debit column is money out');

s = sug('revolut.csv');
ok(pick(s, 'Uber Eats').cat === 'eating' && pick(s, 'Uber').cat === 'transport' && pick(s, 'Uber').date === '2026-11-05', 'Revolut: ISO dates with time, Uber vs Uber Eats');

const amex = read('amex.csv');
s = ST.suggest(amex.rows);
ok(amex.flipped, 'Amex: spending shown as positive is detected and flipped');
ok(pick(s, 'Tesco').type === 'out' && pick(s, 'Costa').cat === 'eating' && pick(s, 'John Lewis').cat === 'shopping', 'Amex: card spending becomes money out');
ok(s.find((x) => /PAYMENT RECEIVED/.test(x.raw)).kind === 'transfer', 'Amex: card repayment is a transfer, not income');

// duplicates: already typed in by hand, re-importing the same file, and fixed costs that logged themselves
const existing = [
  { id: 'a', amt: 2340, type: 'out', mkey: 'tesco', date: '2026-11-02' },
  { id: 'b', amt: 11200, type: 'out', mkey: 'octopus energy', date: '2026-11-07' },
];
s = ST.suggest(read('hsbc.csv').rows, { existing });
ok(pick(s, 'Tesco').kind === 'dupe' && pick(s, 'Octopus Energy').kind === 'dupe' && pick(s, "Sainsbury's").kind === 'new', 'hand-logged Tesco and auto-logged Octopus marked as already logged');
const imported = s.filter((x) => x.kind === 'new').map((x) => ({ id: x.imp, amt: x.amt, type: x.type, mkey: x.mkey, date: x.date, imp: x.imp }));
const again = ST.suggest(read('hsbc.csv').rows, { existing: existing.concat(imported) });
ok(again.every((x) => x.kind !== 'new'), 'importing the same file twice adds nothing new');
s = ST.suggest(read('hsbc.csv').rows, { learned: { tesco: 'shopping' } });
ok(pick(s, 'Tesco').cat === 'shopping', 'learned categories apply to imports');

ok(ST.parseMoney('(23.40)') === -2340 && ST.parseMoney('23.40 DR') === -2340 && ST.parseMoney('£1,234.56') === 123456 && ST.parseMoney('abc') === null, 'money formats');
ok(ST.parseDate('5/11/26') === '2026-11-05' && ST.parseDate('05-Nov-2026') === '2026-11-05' && ST.parseDate('5 November 2026') === '2026-11-05' && ST.parseDate('31/02/2026') === null, 'UK date formats');
ok(ST.readStatement('hello,world').error, 'a non-statement file gives a clear error');
console.log(fail ? `${fail} of ${n} FAILED` : `all ${n} statement tests passed`);
process.exit(fail ? 1 : 0);
