/* Bank statement (CSV) reader. Pure functions, no DOM. Browser: window.Statement. Node: module.exports.
   Understands the CSV downloads from the main UK banks and cards, with or without a header row. */
(function (root) {
  'use strict';
  const TP = typeof module !== 'undefined' && module.exports ? require('./parser.js') : root.TallyParser;

  /** RFC 4180-style CSV: quoted fields, doubled quotes, commas or semicolons, CRLF, BOM. */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : (firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',');
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some((c) => c.trim() !== '')) rows.push(row.map((c) => c.trim()));
        row = [];
      } else field += ch;
    }
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row.map((c) => c.trim()));
    return rows;
  }

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  const pad = (n) => String(n).padStart(2, '0');
  /** UK dates: 05/11/2026, 5/11/26, 2026-11-05 (with time), 05 Nov 2026, 05-Nov-26, 5 November 2026. Returns YYYY-MM-DD or null. */
  function parseDate(s) {
    s = String(s || '').trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return valid(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(s);
    if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
    m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{2}|\d{4})\b/.exec(s);
    if (m) {
      const mon = MONTHS[m[2].slice(0, 4).toLowerCase()] || MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mon) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], mon, +m[1]);
    }
    return null;
    function valid(y, mo, d) {
      const dt = new Date(y, mo - 1, d, 12);
      return dt.getMonth() === mo - 1 && y > 1990 && y < 2100 ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }
  }

  /** "-£1,234.56", "(23.40)", "23.40 DR", "£5" -> pence (negative = money out as written). null if not money. */
  function parseMoney(s) {
    let t = String(s == null ? '' : s).trim();
    if (!t) return null;
    let neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    if (/\s*(DR|D)$/i.test(t)) { neg = true; t = t.replace(/\s*(DR|D)$/i, ''); }
    t = t.replace(/\s*(CR|C)$/i, '');
    t = t.replace(/[£$€\s,]|GBP/gi, '');
    if (t.startsWith('-')) { neg = !neg; t = t.slice(1); }
    if (t.startsWith('+')) t = t.slice(1);
    if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(t)) return null;
    const p = Math.round(parseFloat(t) * 100);
    return neg ? -p : p;
  }

  const H = {
    date: /^(transaction |posted |posting |completed |started |value )?date( of transaction)?$|^date$/,
    desc: /^(description|transaction description|details|narrative|name|merchant|payee|counter ?party|memo|reference|transaction details|particulars)$/,
    amount: /^(amount|value|amount \(gbp\)|amount gbp|transaction amount|net amount|billing amount)$/,
    out: /^(paid out|money out|debit|debit amount|withdrawals?|out|spent|payments?)$/,
    in: /^(paid in|money in|credit|credit amount|deposits?|in|received|receipts?)$/,
    type: /^(type|transaction type)$/,
    cat: /^(category|spending category|subcategory)$/,
    extra: /^(memo|notes|notes and #tags|reference|description)$/,
  };
  const norm = (h) => String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function findHeader(rows) {
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const hs = rows[i].map(norm);
      const has = (re) => hs.findIndex((h) => re.test(h));
      const d = has(H.date), a = has(H.amount), o = has(H.out), n = has(H.in);
      if (d >= 0 && (a >= 0 || o >= 0 || n >= 0)) return i;
    }
    return -1;
  }

  /** Guess columns for a file with no header row (HSBC, First Direct): a date column, a money column, the longest text column. */
  function guessColumns(rows) {
    const sample = rows.slice(0, 30), cols = Math.max(...sample.map((r) => r.length));
    const score = (fn) => Array.from({ length: cols }, (_, c) => sample.filter((r) => fn(r[c])).length);
    const dates = score((v) => !!parseDate(v)), money = score((v) => parseMoney(v) !== null && /\d/.test(v || ''));
    const text = Array.from({ length: cols }, (_, c) => sample.reduce((a, r) => a + (/[a-z]/i.test(r[c] || '') ? (r[c] || '').length : 0), 0));
    const date = dates.indexOf(Math.max(...dates));
    const desc = text.indexOf(Math.max(...text));
    let amount = -1, best = -1;
    money.forEach((v, c) => { if (c !== date && c !== desc && v > best) { best = v; amount = c; } });
    return { date, desc, amount, out: -1, in: -1, type: -1, cat: -1, extra: -1 };
  }

  function bankName(header) {
    const h = header.map(norm).join('|');
    if (h.includes('emoji') || (h.includes('money out') && h.includes('local amount'))) return 'Monzo';
    if (h.includes('counter party') && h.includes('spending category')) return 'Starling';
    if (h.includes('started date') && h.includes('completed date')) return 'Revolut';
    if (h.includes('sort code') && h.includes('debit amount')) return 'Lloyds, Halifax or Bank of Scotland';
    if (h.includes('subcategory') && h.includes('memo')) return 'Barclays';
    if (h.includes('paid out') && h.includes('paid in')) return 'Nationwide';
    if (h.includes('account name') && h.includes('value')) return 'NatWest or RBS';
    return null;
  }

  /** Reads a CSV statement into rows of { date, raw, amount (pence, negative = out), bankType, bankCat }. */
  function readStatement(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { rows: [], bank: null, error: 'That file is empty.' };
    const hi = findHeader(rows);
    let cols, body, bank = null;
    if (hi >= 0) {
      const hs = rows[hi].map(norm);
      const idx = (re, not) => hs.findIndex((h, i) => re.test(h) && !(not || []).includes(i));
      const date = idx(H.date);
      const amount = idx(H.amount);
      const out = amount >= 0 ? -1 : idx(H.out), inn = amount >= 0 ? -1 : idx(H.in);
      // description: prefer a merchant-ish column ("Name", "Counter Party", "Description"), then memo
      let desc = hs.findIndex((h) => /^(name|counter ?party|merchant|payee)$/.test(h));
      if (desc < 0) desc = idx(H.desc);
      const extra = hs.findIndex((h, i) => i !== desc && /^(memo|description|reference|transaction description)$/.test(h));
      cols = { date, desc, amount, out, in: inn, type: idx(H.type), cat: idx(H.cat), extra };
      body = rows.slice(hi + 1);
      bank = bankName(rows[hi]);
    } else {
      cols = guessColumns(rows);
      body = rows;
      bank = 'HSBC or First Direct';
    }
    if (cols.date < 0 || cols.desc < 0 || (cols.amount < 0 && cols.out < 0 && cols.in < 0)) {
      return { rows: [], bank, error: "Couldn't find the date, description and amount columns in that file." };
    }
    const out = [];
    for (const r of body) {
      const date = parseDate(r[cols.date]);
      if (!date) continue;
      let amount = null;
      if (cols.amount >= 0) amount = parseMoney(r[cols.amount]);
      else {
        const o = cols.out >= 0 ? parseMoney(r[cols.out]) : null, n = cols.in >= 0 ? parseMoney(r[cols.in]) : null;
        if (o) amount = -Math.abs(o); else if (n) amount = Math.abs(n);
      }
      if (!amount) continue;
      let raw = r[cols.desc] || '';
      if ((!raw || raw.length < 3) && cols.extra >= 0) raw = r[cols.extra] || raw;
      if (/[A-Za-z]/.test(r[cols.extra] || '') && cols.extra >= 0 && raw.length < 4) raw = r[cols.extra];
      out.push({ date, raw: raw.trim(), amount, bankType: cols.type >= 0 ? r[cols.type] || '' : '', bankCat: cols.cat >= 0 ? r[cols.cat] || '' : '' });
    }
    if (!out.length) return { rows: [], bank, error: 'No transactions found in that file.' };
    // Credit cards (Amex and others) list spending as positive amounts. If nearly everything is positive, flip it.
    const pos = out.filter((x) => x.amount > 0).length;
    const flipped = cols.amount >= 0 && out.length >= 3 && pos / out.length > 0.7;
    if (flipped) for (const x of out) x.amount = -x.amount;
    return { rows: out, bank, flipped };
  }

  // ---- making sense of bank descriptions ----
  const NOISE = /\b(card payment to|card payment|contactless payment|contactless|payment to|payment from|debit card|visa purchase|purchase|pos|bcc|clp|dpc|vis|ddr|card|ref|reference|on \d{1,2}[ -/][a-z0-9]{2,3}([ -/]\d{2,4})?|gb|gbr|uk|london|manchester|birmingham|leeds|glasgow|bristol|edinburgh|liverpool|internet|online|apple pay|google pay|gpay)\b/g;
  function cleanDescription(raw) {
    let s = String(raw || '').toLowerCase();
    s = s.replace(/^(dd|so|fpo|fpi|bgc|cr|tfr|bp|cpt|chq|deb)\s+/, '');
    s = s.replace(/\*[a-z0-9]{4,}/g, ' ').replace(/\b[a-z]*\d[a-z0-9]{5,}\b/g, ' ');
    s = s.replace(/\bpaypal \*/g, '').replace(/\bpaypal\s*\*?/g, '');
    s = s.replace(/https?:\/\/\S+/g, ' ').replace(/\.(com|co\.uk|uk|net)\b/g, '');
    s = s.replace(NOISE, ' ').replace(/\b\d{2,}\b/g, ' ').replace(/[^a-z&'+ ]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  // Moves between your own accounts, pots and card repayments: not spending or income.
const TRANSFER = /\b(transfer|tfr|to savings|from savings|savings pot|pot transfer|own account|moved to|moved from|round ?up|between accounts|internal|payment received|thank you|card repayment|credit card payment|balance transfer|amex|american express|barclaycard)\b/i;
  const BANK_CATS = [
    [/grocer/i, 'groceries'], [/eating|restaurant|takeaway|food and drink|coffee/i, 'eating'], [/transport|travel|fuel|car/i, 'transport'],
    [/bill|utilit|household|energy/i, 'bills'], [/shopping|retail/i, 'shopping'], [/entertain|leisure/i, 'fun'], [/holiday/i, 'travel'],
    [/personal care|beauty|health/i, 'personal'], [/gift/i, 'gifts'], [/charit/i, 'gifts'], [/famil|kids|child/i, 'kids'], [/pet/i, 'pets'],
    [/saving/i, 'savings'], [/invest/i, 'invest'],
  ];
  const titleWords = (s, n) => TP.titleCase(s.split(' ').slice(0, n).join(' '));

  /**
   * Turns statement rows into suggested entries, marking ones that look already logged or are transfers.
   * ctx: { existing: [txns], learned, aliases }
   */
  function suggest(rows, ctx) {
    ctx = ctx || {};
    const existing = ctx.existing || [], learned = ctx.learned || {}, aliases = ctx.aliases || {};
    const seen = new Set(existing.map((t) => t.imp).filter(Boolean));
    const dayNum = (d) => Math.round(new Date(d + 'T12:00:00').getTime() / 864e5);
    const pool = existing.map((t) => ({ t, day: dayNum(t.date), used: false }));
    return rows.map((r) => {
      const imp = `${r.date}|${r.amount}|${r.raw.toLowerCase().replace(/\s+/g, ' ')}`;
      const clean = cleanDescription(r.raw);
      const alias = aliases[TP.normKey(clean)];
      const m = alias ? (TP.findMerchant(alias) || { name: alias, cat: null }) : TP.findMerchant(clean) || TP.findMerchant(r.raw.toLowerCase());
      const desc = m ? m.name : titleWords(clean, 3) || titleWords(r.raw.toLowerCase(), 3) || 'Bank entry';
      const mkey = TP.normKey(desc);
      const kwCat = TP.keywordCategory(TP.normKey(clean));
      const bankCat = (BANK_CATS.find(([re]) => re.test(r.bankCat)) || [])[1];
      let cat = learned[mkey] || (m && m.cat) || kwCat || bankCat || 'other';
      let type = r.amount < 0 ? 'out' : 'in';
      const isSaveCat = cat === 'savings' || cat === 'invest';
      let kind = 'new';
      if (type === 'in') cat = isSaveCat ? cat : 'income';
      else if (isSaveCat) type = 'save';
      else if (cat === 'income') cat = 'other';
      // Moves between your own accounts or pots are left out by default. Payments to a known savings or investment
      // provider (Vanguard, Moneybox, Premium Bonds) are real saving, so they stay in.
      const provider = m && (m.cat === 'savings' || m.cat === 'invest');
      if (!provider && (TRANSFER.test(r.raw) || /transfer|pot/i.test(r.bankType))) kind = 'transfer';
      const amt = Math.abs(r.amount);
      if (seen.has(imp)) kind = 'imported';
      else if (kind === 'new') {
        // Already logged by hand (or by a fixed cost): same amount, same direction, within 3 days. Name match first.
        const d = dayNum(r.date);
        const near = pool.filter((p) => !p.used && p.t.amt === amt && ((p.t.type === 'in') === (type === 'in')) && Math.abs(p.day - d) <= 3);
        const hit = near.find((p) => p.t.mkey === mkey) || near[0];
        if (hit) { hit.used = true; kind = 'dupe'; }
      }
      return { date: r.date, raw: r.raw, desc, mkey, cat, type, amt, imp, kind, rawKey: TP.normKey(clean) };
    });
  }

  const api = { parseCSV, parseDate, parseMoney, readStatement, cleanDescription, suggest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Statement = api;
})(typeof window !== 'undefined' ? window : globalThis);
