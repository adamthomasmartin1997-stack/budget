// ---------- UI state ----------
const ui = { tab: 'home', month: monthOf(todayISO()), filter: 'all', q: '', qaOpen: false, who: 'all', period: 'month', week: null, year: new Date().getFullYear() };
const qa = { who: $('#qaWho'), input: $('#qaInput'), form: $('#qaForm'), chip: $('#qaChip'), quick: $('#qaQuick'), box: $('#qa'), ov: {}, quickItems: [] };
