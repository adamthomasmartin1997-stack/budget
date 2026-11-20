/* Tally quick-add parser. Pure functions, no DOM. Works in the browser (window.TallyParser) and Node (module.exports). */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'groceries', name: 'Groceries', hue: 142 },
    { id: 'eating', name: 'Eating out', hue: 24 },
    { id: 'transport', name: 'Transport', hue: 208 },
    { id: 'bills', name: 'Bills', hue: 262 },
    { id: 'home', name: 'Home', hue: 38 },
    { id: 'shopping', name: 'Shopping', hue: 322 },
    { id: 'fun', name: 'Entertainment', hue: 286 },
    { id: 'subs', name: 'Subscriptions', hue: 186 },
    { id: 'health', name: 'Health', hue: 352 },
    { id: 'personal', name: 'Personal care', hue: 12 },
    { id: 'travel', name: 'Travel', hue: 228 },
    { id: 'gifts', name: 'Gifts', hue: 52 },
    { id: 'kids', name: 'Kids', hue: 98 },
    { id: 'pets', name: 'Pets', hue: 30 },
    { id: 'other', name: 'Other', hue: 160 },
    { id: 'savings', name: 'Savings', hue: 270, save: true },
    { id: 'invest', name: 'Investments', hue: 250, save: true },
    { id: 'income', name: 'Income', hue: 150, income: true },
  ];

  const KEYWORDS = {
    groceries: ['tesco', 'aldi', 'lidl', 'sainsburys', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'coop', 'co-op', 'ocado',
      'iceland', 'm&s', 'marks and spencer', 'farmfoods', 'spar', 'budgens', 'nisa', 'londis', 'groceries', 'grocery', 'food shop',
      'supermarket', 'butcher', 'bakery', 'big shop', 'milk', 'bread', 'veg'],
    eating: ['coffee', 'costa', 'starbucks', 'pret', 'nero', 'caffe nero', 'greggs', 'lunch', 'dinner', 'breakfast', 'brunch',
      'restaurant', 'pub', 'takeaway', 'deliveroo', 'ubereats', 'uber eats', 'just eat', 'justeat', 'nandos', 'mcdonalds', 'maccies',
      'kfc', 'pizza', 'burger', 'cafe', 'wagamama', 'subway', 'leon', 'itsu', 'chippy', 'curry', 'drinks', 'pint', 'pints', 'beer', 'tea'],
    transport: ['shell', 'bp', 'esso', 'texaco', 'petrol', 'diesel', 'fuel', 'train', 'trains', 'trainline', 'tfl', 'oyster', 'tube',
      'bus', 'taxi', 'uber', 'bolt', 'parking', 'ringgo', 'paybyphone', 'toll', 'dart charge', 'mot', 'car wash', 'railcard',
      'ev charge', 'car park', 'charging', 'tyres', 'service'],
    bills: ['rent', 'mortgage', 'council tax', 'council', 'electric', 'electricity', 'gas bill', 'energy', 'water', 'broadband',
      'internet', 'phone bill', 'mobile', 'ee', 'vodafone', 'o2', 'three', 'giffgaff', 'sky', 'bt', 'virgin media', 'octopus',
      'british gas', 'edf', 'eon', 'e.on', 'ovo', 'insurance', 'tv licence', 'tv license', 'thames water'],
    subs: ['netflix', 'spotify', 'disney', 'disney+', 'amazon prime', 'prime', 'icloud', 'youtube', 'audible', 'now tv', 'nowtv',
      'patreon', 'chatgpt', 'claude', 'xbox', 'playstation', 'subscription', 'apple music', 'apple tv'],
    shopping: ['amazon', 'argos', 'primark', 'next', 'zara', 'h&m', 'asos', 'tk maxx', 'tkmaxx', 'john lewis', 'ebay', 'clothes',
      'shoes', 'uniqlo', 'currys', 'vinted', 'etsy', 'shein', 'superdry'],
    home: ['ikea', 'b&q', 'wickes', 'screwfix', 'dunelm', 'homebase', 'toolstation', 'the range', 'furniture', 'cleaning', 'diy',
      'plants', 'garden centre', 'hardware'],
    fun: ['cinema', 'odeon', 'vue', 'cineworld', 'tickets', 'ticket', 'gig', 'concert', 'theatre', 'steam', 'game', 'games', 'books',
      'book', 'waterstones', 'bowling', 'museum', 'festival', 'football', 'golf'],
    health: ['pharmacy', 'chemist', 'boots', 'superdrug', 'dentist', 'doctor', 'optician', 'prescription', 'gym', 'puregym',
      'physio', 'vitamins'],
    personal: ['haircut', 'barber', 'barbers', 'hairdresser', 'nails', 'beauty', 'salon'],
    travel: ['hotel', 'airbnb', 'booking.com', 'flight', 'flights', 'easyjet', 'ryanair', 'jet2', 'british airways', 'holiday',
      'eurostar', 'premier inn', 'travelodge'],
    gifts: ['gift', 'gifts', 'present', 'presents', 'birthday', 'wedding', 'charity', 'donation', 'card'],
    kids: ['nursery', 'childcare', 'school', 'kids', 'toys', 'babysitter'],
    pets: ['vet', 'vets', 'pets at home', 'dog food', 'cat food', 'pet', 'pets', 'kennel', 'groomer'],
    savings: ['emergency fund', 'emergency', 'savings', 'saving', 'save', 'saved', 'cash isa', 'premium bonds', 'rainy day', 'savings pot',
      'house deposit', 'holiday fund', 'easy access'],
    invest: ['stocks and shares isa', 'stock and share isa', 'stocks & shares isa', 'stocks and shares', 'stocks & shares', 's&s isa', 's&s', 'isa',
      'lisa', 'lifetime isa', 'pension', 'sipp', 'invest', 'investment', 'investing', 'vanguard', 'freetrade', 'trading 212', 'trading212',
      'hargreaves', 'hargreaves lansdown', 'aj bell', 'moneybox', 'nutmeg', 'etf', 'shares', 'crypto'],
    income: ['salary', 'wages', 'wage', 'payday', 'bonus', 'refund', 'interest', 'dividend', 'cashback', 'paid back', 'repayment',
      'income', 'freelance', 'invoice', 'pension', 'child benefit'],
  };

  const SAVE_IDS = new Set(CATEGORIES.filter((c) => c.save).map((c) => c.id));
  const WORD_MAP = new Map();
  const PHRASES = [];
  for (const [cat, list] of Object.entries(KEYWORDS)) {
    for (const kw of list) {
      if (kw.includes(' ')) PHRASES.push([kw, cat]);
      else if (!WORD_MAP.has(kw)) WORD_MAP.set(kw, cat);
    }
  }
  PHRASES.sort((a, b) => b[0].length - a[0].length);

  const RECUR_WORDS = new Set(['monthly', 'pm', 'p/m', 'recurring', 'fixed', 'repeat']);
  const SHARED_WORDS = new Set(['split', 'shared', 'joint', 'both', 'us', 'half', 'halves']);
  const FILLER = new Set(['at', 'on', 'for', 'from', 'the', 'a', '£', 'gbp', 'quid']);
  const WEEKDAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  const COMMON = new Set(['week', 'wait', 'with', 'from', 'that', 'this', 'there', 'their', 'water', 'stuff', 'things', 'present', 'parking',
    'chips', 'chippy', 'cards', 'party', 'drink', 'drinks', 'snack', 'snacks', 'plants', 'paint', 'bills', 'tickets', 'books', 'clothes', 'shoes',
    'house', 'hotel', 'train', 'trains', 'buses', 'coach', 'night', 'money', 'month', 'today', 'cash', 'nails', 'tyres', 'shops', 'shop', 'market',
    'delivery', 'deliveries', 'bingo', 'tools', 'ticket', 'games', 'boot', 'chip', 'bolts', 'virginia', 'primary', 'nextdoor', 'service', 'charges', 'sports']);
  const SMALL = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'at']);
  const UPPER = new Set(['isa', 'sipp', 'lisa', 'etf', 's&s', 'aj', 'hl', 'bp', 'tfl', 'ee', 'o2', 'bt', 'kfc', 'm&s', 'b&q', 'h&m', 'tv', 'mot', 'diy', 'ev', 'edf', 'ovo']);


  // UK shops and brands: [proper name, category, ...other ways people write it]. Used to tidy names and spot typos.
  const MERCHANTS = [
    ['Tesco', 'groceries', 'tescos', 'tesco express', 'tesco extra', 'tesco metro', 'tesco stores', 'tesco store', 'tesco pfs'],
    ["Sainsbury's", 'groceries', 'sains', 'sainsburys', 'sainsbury', 'sainos', 'sainsburies', 'sainsbos', 'sainsburys local', 'js online grocery', 'sainsburys s/mkts', 'sainsburys smkt'],
    ['Asda', 'groceries', 'asdas'],
    ['Morrisons', 'groceries', 'morrys', 'morries', 'morrison', 'morrissons'],
    ['Aldi', 'groceries', 'aldis'],
    ['Lidl', 'groceries', 'lidls'],
    ['Waitrose', 'groceries', 'waitroses'],
    ['M&S', 'groceries', 'marks and spencer', 'marks & spencer', 'marks and sparks', 'marks', 'm and s', 'ms food', 'm&s food'],
    ['Co-op', 'groceries', 'coop', 'co op', 'the coop'],
    ['Iceland', 'groceries'], ['Ocado', 'groceries'], ['Farmfoods', 'groceries'], ['Costco', 'groceries'], ['Booths', 'groceries'],
    ["McDonald's", 'eating', 'maccies', 'maccys', 'mackies', 'mcdonalds', 'mcdonald', 'mcds', 'mcd', 'macdonalds', 'mickey ds'],
    ['KFC', 'eating'], ['Burger King', 'eating', 'bk'], ["Nando's", 'eating', 'nandos'], ['Greggs', 'eating', 'gregs'],
    ['Pret', 'eating', 'pret a manger'], ['Costa', 'eating', 'costa coffee'], ['Starbucks', 'eating', 'sbux', 'starbs', 'starbucks coffee'],
    ['Caffè Nero', 'eating', 'nero', 'cafe nero', 'caffe nero'], ['Wetherspoons', 'eating', 'spoons', 'weatherspoons', 'wetherspoon', 'weatherspoon', 'jd wetherspoon'],
    ['Wagamama', 'eating', 'wagas', 'wagamamas', 'wagamamma'], ['Pizza Express', 'eating', 'pizzaexpress'], ["Domino's", 'eating', 'dominos'],
    ['Pizza Hut', 'eating'], ['Five Guys', 'eating', '5 guys'], ['Subway', 'eating'], ['Leon', 'eating'], ['Itsu', 'eating'], ['Wasabi', 'eating'],
    ['Deliveroo', 'eating', 'deliveroos'], ['Uber Eats', 'eating', 'ubereats', 'uber eat'], ['Just Eat', 'eating', 'justeat'],
    ['Toby Carvery', 'eating', 'toby', 'tobys'], ['Harvester', 'eating'], ['Zizzi', 'eating', 'zizzis'], ['Prezzo', 'eating'], ['Dishoom', 'eating'],
    ['Tim Hortons', 'eating', 'timmies'], ['Taco Bell', 'eating'], ['Krispy Kreme', 'eating'],
    ['Shell', 'transport'], ['BP', 'transport'], ['Esso', 'transport'], ['Texaco', 'transport'],
    ['TfL', 'transport', 'oyster', 'tfl travel', 'tfl travel ch', 'tfl.gov.uk'], ['Trainline', 'transport', 'the trainline'], ['Uber', 'transport'], ['Bolt', 'transport'],
    ['National Express', 'transport'], ['Megabus', 'transport'], ['LNER', 'transport'], ['GWR', 'transport'], ['Avanti', 'transport', 'avanti west coast'],
    ['RingGo', 'transport', 'ringo', 'ring go'], ['PayByPhone', 'transport', 'pay by phone'], ['JustPark', 'transport', 'just park'],
    ['Halfords', 'transport'], ['Kwik Fit', 'transport', 'kwikfit'],
    ['British Gas', 'bills'], ['Octopus Energy', 'bills', 'octopus'], ['EDF', 'bills', 'edf energy'], ['E.ON', 'bills', 'eon', 'e.on next', 'eon next'],
    ['OVO', 'bills', 'ovo energy'], ['Scottish Power', 'bills'], ['BT', 'bills', 'bt broadband'], ['Sky', 'bills'], ['Virgin Media', 'bills', 'virgin'],
    ['EE', 'bills'], ['Vodafone', 'bills'], ['O2', 'bills'], ['giffgaff', 'bills', 'giff gaff'], ['Thames Water', 'bills'], ['Severn Trent', 'bills'],
    ['TV Licence', 'bills', 'tv license', 'tv licensing'],
    ['Netflix', 'subs', 'netflix.com'], ['Spotify', 'subs', 'spotify uk', 'spotify p'], ['Disney+', 'subs', 'disney', 'disney plus', 'disneyplus'], ['Amazon Prime', 'subs', 'prime', 'prime video'],
    ['iCloud', 'subs', 'apple icloud'], ['YouTube Premium', 'subs', 'youtube'], ['Audible', 'subs'], ['NOW', 'subs', 'now tv', 'nowtv'],
    ['Xbox Game Pass', 'subs', 'game pass', 'gamepass'], ['PlayStation Plus', 'subs', 'ps plus', 'psplus'], ['ChatGPT', 'subs', 'chat gpt'],
    ['Amazon', 'shopping', 'amzn', 'amazon uk', 'amazon.co.uk', 'amznmktplace', 'amzn mktp', 'amazon mktplace', 'amazon marketplace', 'amznmktp', 'amazon.co.uk*', 'amazon retail'], ['Argos', 'shopping'], ['Primark', 'shopping', 'primarni'], ['Next', 'shopping'],
    ['Zara', 'shopping'], ['H&M', 'shopping', 'h and m'], ['ASOS', 'shopping'], ['TK Maxx', 'shopping', 'tkmaxx', 'tk max', 'tkmax'],
    ['John Lewis', 'shopping', 'jlp', 'john lewis and partners'], ['Currys', 'shopping', 'currys pc world', 'pc world'], ['eBay', 'shopping'],
    ['Vinted', 'shopping'], ['Etsy', 'shopping'], ['Uniqlo', 'shopping'], ['JD Sports', 'shopping', 'jd'], ['Sports Direct', 'shopping'],
    ['Matalan', 'shopping'], ['B&M', 'shopping', 'b and m', 'bandm'], ['Home Bargains', 'shopping'], ['Poundland', 'shopping'],
    ['Hobbycraft', 'shopping'], ['Shein', 'shopping'], ['Temu', 'shopping'],
    ['IKEA', 'home'], ['B&Q', 'home', 'bnq', 'b and q', 'bandq'], ['Wickes', 'home'], ['Screwfix', 'home'], ['Toolstation', 'home'],
    ['Dunelm', 'home'], ['Homebase', 'home'], ['The Range', 'home'],
    ['Boots', 'health'], ['Superdrug', 'health'], ['Holland & Barrett', 'health', 'holland and barrett', 'h&b'], ['PureGym', 'health', 'pure gym'],
    ['The Gym Group', 'health', 'gym group'], ['David Lloyd', 'health'], ['Specsavers', 'health'], ['Vision Express', 'health'],
    ['Odeon', 'fun'], ['Vue', 'fun'], ['Cineworld', 'fun'], ['Ticketmaster', 'fun'], ['Steam', 'fun'], ['Waterstones', 'fun'],
    ['WHSmith', 'shopping', 'whsmiths', 'wh smith', 'whs', 'smiths'],
    ['easyJet', 'travel', 'easy jet'], ['Ryanair', 'travel', 'ryan air'], ['Jet2', 'travel', 'jet 2'], ['British Airways', 'travel', 'ba'],
    ['Premier Inn', 'travel'], ['Travelodge', 'travel'], ['Airbnb', 'travel', 'air bnb'], ['Booking.com', 'travel', 'booking'], ['Eurostar', 'travel'],
    ['Smyths', 'kids', 'smyths toys'], ['Pets at Home', 'pets', 'petsathome', 'pets at home'],
    ['Card Factory', 'gifts', 'cardfactory'], ['Clintons', 'gifts', 'clinton cards'],
    ['Vanguard', 'invest'], ['Trading 212', 'invest', 'trading212', 't212'], ['Freetrade', 'invest', 'free trade'],
    ['Hargreaves Lansdown', 'invest', 'hl', 'hargreaves'], ['AJ Bell', 'invest', 'ajbell'], ['Moneybox', 'invest', 'money box'],
    ['Nutmeg', 'invest'], ['Chip', 'savings'], ['Plum', 'savings'], ['Premium Bonds', 'savings', 'nsi', 'ns&i'],
  ];
  const nk = (s) => normKey(s).replace(/[.\-]/g, '').replace(/^the /, '');
  const MERCH_PHRASE = [], MERCH_WORD = new Map(), MERCH_FUZZY = [];
  MERCHANTS.forEach((m, i) => {
    for (const a of [m[0]].concat(m.slice(2))) {
      const k = nk(a);
      if (!k) continue;
      if (k.includes(' ')) MERCH_PHRASE.push([k.split(' '), i]); else if (!MERCH_WORD.has(k)) MERCH_WORD.set(k, i);
      const flat = k.replace(/ /g, '');
      if (flat.length >= 5) MERCH_FUZZY.push([flat, i]);
    }
  });
  MERCH_PHRASE.sort((a, b) => b[0].length - a[0].length);
  const MERCH_NAMES = new Set(MERCHANTS.map((m) => m[0]));

  // Optimal string alignment distance (Levenshtein plus swapped neighbours), capped for speed.
  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  /** Finds a known merchant in one word: exact nickname, then a clear start of a name, then a near-miss spelling. */
  function merchantForWord(w) {
    const k = nk(w);
    if (MERCH_WORD.has(k)) return MERCH_WORD.get(k);
    if (COMMON.has(k)) return -1; // everyday words ("chips", "delivery") never become shops
    const bare = k.replace(/'?s$/, '');
    if (bare !== k && MERCH_WORD.has(bare)) return MERCH_WORD.get(bare);
    if (WORD_MAP.has(k) || k.length < 4 || !/^[a-z&]+$/.test(k)) return -1;
    // clear start of a name: at least 4 letters and nearly half the name, and only one shop fits
    const pre = new Set();
    for (const [name, i] of MERCH_FUZZY) if (name.startsWith(k) && k !== name && k.length >= Math.ceil(name.length * 0.5)) pre.add(i);
    if (pre.size === 1) return [...pre][0];
    if (k.length < 5) return -1;
    // near-miss spelling: one slip for shorter words, two for long ones, and only if one shop is clearly closest
    const max = k.length >= 9 ? 2 : 1;
    let best = -1, bestD = max + 1, tie = false;
    for (const [name, i] of MERCH_FUZZY) {
      const dd = editDistance(k, name, max);
      if (dd < bestD) { bestD = dd; best = i; tie = false; } else if (dd === bestD && i !== best) tie = true;
    }
    return bestD <= max && !tie ? best : -1;
  }

  /** Replaces any shop names in the words with their proper names. Returns {words, cat} (cat of the first shop found). */
  function tidyMerchants(words) {
    const out = [];
    let cat = null;
    const lw = words.map((w) => nk(w));
    for (let i = 0; i < words.length;) {
      let hit = null;
      for (const [parts, mi] of MERCH_PHRASE) {
        if (parts.length > 1 && parts.every((p, j) => lw[i + j] === p)) { hit = [parts.length, mi]; break; }
      }
      if (!hit) { const mi = merchantForWord(words[i]); if (mi >= 0) hit = [1, mi]; }
      if (hit) {
        out.push(MERCHANTS[hit[1]][0]);
        if (!cat) cat = MERCHANTS[hit[1]][1];
        i += hit[0];
      } else { out.push(words[i]); i++; }
    }
    return { words: out, cat };
  }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function normKey(s) {
    return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&+.\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function titleCase(s) {
    return String(s || '').split(' ').filter(Boolean).map((w, i) => {
      const l = w.toLowerCase();
      if (UPPER.has(l)) return l.toUpperCase();
      if (i > 0 && SMALL.has(l)) return l;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  /** "23.40" "£23.4" "+2400" "2,400" "2.4k" "50p" → {pence, sign, strong} */
  function parseAmount(tk) {
    const t = String(tk).trim();
    let m = /^([+-])?£?(\d{1,3})p$/i.exec(t);
    if (m) {
      const pence = parseInt(m[2], 10);
      return pence > 0 ? { pence, sign: m[1] || '', strong: true } : null;
    }
    m = /^([+-])?£?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|\.\d{1,2})(k)?$/i.exec(t);
    if (!m) return null;
    let v = parseFloat(m[2].replace(/,/g, ''));
    if (m[3]) v *= 1000;
    const pence = Math.round(v * 100);
    if (!(pence > 0)) return null;
    return { pence, sign: m[1] || '', strong: !!(m[1] || t.includes('£') || m[2].includes('.') || m[3]) };
  }

  function parseDateToken(low, next, today) {
    const d = new Date(today);
    if (low === 'today' || low === 'tdy') return { date: iso(d), used: 1 };
    if (low === 'yesterday' || low === 'yday' || low === 'yest' || low === 'ystd') { d.setDate(d.getDate() - 1); return { date: iso(d), used: 1 }; }
    let used = 1;
    let wd = low;
    let strictlyPast = false;
    if (low === 'last' && next && WEEKDAYS[next] !== undefined) { wd = next; used = 2; strictlyPast = true; }
    if (WEEKDAYS[wd] !== undefined) {
      let back = (d.getDay() - WEEKDAYS[wd] + 7) % 7;
      if (back === 0 && strictlyPast) back = 7;
      d.setDate(d.getDate() - back);
      return { date: iso(d), used };
    }
    const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(low);
    if (m) {
      const day = +m[1], mon = +m[2];
      if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
      let year = m[3] ? +m[3] : today.getFullYear();
      if (year < 100) year += 2000;
      let dt = new Date(year, mon - 1, day, 12);
      if (dt.getMonth() !== mon - 1) return null;
      if (!m[3] && dt > today) dt = new Date(year - 1, mon - 1, day, 12);
      return { date: iso(dt), used: 1 };
    }
    return null;
  }

  function keywordCategory(key) {
    if (!key) return null;
    const padded = ' ' + key + ' ';
    for (const [kw, cat] of PHRASES) if (padded.includes(' ' + kw + ' ')) return cat;
    for (const w of key.split(' ')) {
      if (WORD_MAP.has(w)) return WORD_MAP.get(w);
      if (w.length > 3 && w.endsWith('s') && WORD_MAP.has(w.slice(0, -1))) return WORD_MAP.get(w.slice(0, -1));
    }
    return null;
  }

  function matchCategory(q) {
    q = q.toLowerCase();
    return (CATEGORIES.find((c) => c.id === q || c.name.toLowerCase() === q) ||
      CATEGORIES.find((c) => c.id.startsWith(q) || c.name.toLowerCase().startsWith(q)) || {}).id || null;
  }

  function matchPerson(low, people) {
    const t = low.replace(/[’']s$/, '');
    for (const p of people) {
      const n = String(p).toLowerCase();
      if (!n) continue;
      if (t === n || (t.length >= 3 && n.startsWith(t) && t.length >= Math.min(3, n.length))) return p;
    }
    return null;
  }

  /**
   * parse("tesco 23.40", {people:["Adam","Sam"], learned:{}, defaultWho:"shared", today:Date})
   */
  function parse(text, ctx) {
    ctx = ctx || {};
    const today = ctx.today ? new Date(ctx.today) : new Date();
    today.setHours(12, 0, 0, 0);
    const people = (ctx.people || []).filter(Boolean);
    const learned = ctx.learned || {};
    const out = { amt: null, type: 'out', desc: '', mkey: '', cat: 'other', catSource: 'default', date: iso(today),
      who: null, whoExplicit: false, recur: false, valid: false };
    const raw = String(text || '').trim();
    if (!raw) return out;

    // Split "tesco23.40"-style glued tokens? Keep simple: whitespace tokens, with "£ 23" handled by FILLER.
    const tokens = raw.split(/\s+/);
    const lows = tokens.map((t) => t.toLowerCase());
    const role = new Array(tokens.length).fill(null);

    // 1. dates
    for (let i = 0; i < tokens.length; i++) {
      if (role[i]) continue;
      const d = parseDateToken(lows[i], lows[i + 1], today);
      if (d) { out.date = d.date; role[i] = 'date'; if (d.used === 2) role[i + 1] = 'date'; }
    }
    // 2. amount: prefer a "strong" number (£, decimals, sign), otherwise the first number
    let amtIdx = -1, amtInfo = null;
    for (let i = 0; i < tokens.length; i++) {
      if (role[i]) continue;
      const a = parseAmount(tokens[i]);
      if (!a) continue;
      if (amtIdx === -1 || (a.strong && !amtInfo.strong)) { amtIdx = i; amtInfo = a; }
      if (a.strong) break;
    }
    let forceOut = false, forceIn = false;
    if (amtInfo) {
      out.amt = amtInfo.pence;
      role[amtIdx] = 'amt';
      if (amtInfo.sign === '+') forceIn = true;
      if (amtInfo.sign === '-') forceOut = true;
    }
    // 3. markers
    const last = tokens.length - 1;
    let explicitCat = null;
    for (let i = 0; i < tokens.length; i++) {
      if (role[i]) continue;
      const low = lows[i];
      if (low === '+') { forceIn = true; role[i] = 'mark'; continue; }
      if (low === '-') { forceOut = true; role[i] = 'mark'; continue; }
      // "in"/"out" only count as markers at the end or right after the amount ("salary 2400 in", "lunch in town" stays text)
      if ((low === 'in' || low === 'out') && (i === last || i === amtIdx + 1)) {
        if (low === 'in') forceIn = true; else forceOut = true;
        role[i] = 'mark'; continue;
      }
      if (RECUR_WORDS.has(low)) { out.recur = true; role[i] = 'mark'; continue; }
      if (SHARED_WORDS.has(low)) { out.who = 'shared'; out.whoExplicit = true; role[i] = 'who'; continue; }
      const person = matchPerson(low, people);
      if (person) { out.who = person; out.whoExplicit = true; role[i] = 'who'; continue; }
      if (low.length > 1 && low[0] === '#') {
        const c = matchCategory(low.slice(1));
        if (c) { explicitCat = c; role[i] = 'cat'; continue; }
      }
    }
    const words = [];
    for (let i = 0; i < tokens.length; i++) {
      if (role[i]) continue;
      if (FILLER.has(lows[i])) continue;
      words.push(tokens[i]);
    }
    let descRaw = words.join(' ');
    out.rawKey = normKey(descRaw); // what was typed, before tidying, so a correction can be learned
    let merchantCat = null;
    const aliases = ctx.aliases || {};
    if (descRaw && aliases[normKey(descRaw)]) {
      // a name this household corrected before, e.g. "js" -> "Sainsbury's"
      descRaw = aliases[normKey(descRaw)];
      out.desc = descRaw;
      const t = tidyMerchants([descRaw]); merchantCat = t.cat || keywordCategory(normKey(descRaw));
    } else {
      const t = tidyMerchants(words);
      merchantCat = t.cat;
      out.desc = t.words.map((w, i) => (MERCH_NAMES.has(w) ? w : titleCase(w).replace(/^./, (c) => (i > 0 && SMALL.has(w.toLowerCase()) ? c.toLowerCase() : c)))).join(' ');
    }
    out.mkey = normKey(out.desc);
    out.merchant = !!merchantCat;

    // 4. category
    if (explicitCat) { out.cat = explicitCat; out.catSource = 'explicit'; }
    else if (out.mkey && learned[out.mkey]) { out.cat = learned[out.mkey]; out.catSource = 'learned'; }
    else if (merchantCat) { out.cat = merchantCat; out.catSource = 'keyword'; }
    else {
      const k = keywordCategory(out.mkey);
      if (k) { out.cat = k; out.catSource = 'keyword'; }
    }

    // 5. income vs expense
    if (forceIn) out.type = 'in';
    else if (forceOut) out.type = 'out';
    else if (out.cat === 'income') out.type = 'in';
    if (out.type === 'in' && out.cat !== 'income' && out.catSource !== 'explicit' && out.catSource !== 'learned') {
      out.cat = 'income'; out.catSource = 'auto';
    }
    if (out.type === 'out' && out.cat === 'income' && out.catSource !== 'explicit') { out.cat = 'other'; out.catSource = 'default'; }
    // Money moved into savings or investments is not spending
    if (out.type === 'out' && SAVE_IDS.has(out.cat)) out.type = 'save';

    // 6. who
    if (people.length < 2) { out.who = null; out.whoExplicit = false; }
    else if (!out.whoExplicit) out.who = ctx.defaultWho || 'shared';

    out.valid = out.amt > 0;
    return out;
  }

  /** First known shop mentioned anywhere in a piece of text, e.g. a bank description. Returns {name, cat} or null. */
  function findMerchant(text) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lw = words.map((w) => nk(w));
    for (let i = 0; i < words.length; i++) {
      for (const [parts, mi] of MERCH_PHRASE) if (parts.length > 1 && parts.every((p, j) => lw[i + j] === p)) return { name: MERCHANTS[mi][0], cat: MERCHANTS[mi][1] };
      const mi = merchantForWord(words[i]);
      if (mi >= 0) return { name: MERCHANTS[mi][0], cat: MERCHANTS[mi][1] };
    }
    return null;
  }

  const api = { CATEGORIES, KEYWORDS, MERCHANTS, findMerchant, merchantForWord, editDistance, parse, parseAmount, keywordCategory, normKey, titleCase, iso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TallyParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
