// Two-phone sync test. Needs the dev server running (npm run dev) and Playwright.
// node test/sync.e2e.mjs [http://localhost:8888]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const base = process.argv[2] || 'http://localhost:8888';
let fails = 0, step = 0;
const check = (cond, name, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', ++step, name, extra); if (!cond) fails++; };
const real = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('tally.v1')).txns.filter((t) => !t.example));
const sync = (p) => p.evaluate(() => fetch('api/sync').then(() => 0)).then(() => p.click('.hdr-prefs')).then(() => p.click('[data-sync-now]')).then(() => p.waitForTimeout(400));

const b = await chromium.launch();
const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs; return { c, p }; };
const A = await mk(), B = await mk();

// Phone A: set up and start a household
await A.p.goto(base + '/'); await A.p.waitForTimeout(300);
await A.p.fill('#obName1', 'Adam'); await A.p.fill('#obName2', 'Sam'); await A.p.click('.ob-go');
await A.p.locator('#qaInput').type('tesco 23.40'); await A.p.keyboard.press('Enter');
await A.p.click('.hdr-prefs'); await A.p.click('[data-sync-start]'); await A.p.waitForTimeout(600);
const code = (await A.p.locator('#hhCode').innerText()).trim();
check(/^[a-z0-9]{4}(-[a-z0-9]{4}){4}$/.test(code), 'phone A starts a household and gets a code', code);
check((await A.p.locator('#syncLine').innerText()).includes('Synced'), 'phone A shows synced');

// Phone B: opens the invite link, joins from the welcome screen
await B.p.goto(`${base}/?join=${code}`); await B.p.waitForTimeout(300);
check((await B.p.inputValue('#obCode')) === code, 'invite link fills the code on phone B');
await B.p.click('[data-ob-join]'); await B.p.waitForTimeout(800);
check(await B.p.locator('#onboard').isHidden(), 'phone B joins and skips setup');
const bState = await B.p.evaluate(() => JSON.parse(localStorage.getItem('tally.v1')));
check(bState.people.join() === 'Adam,Sam', 'phone B gets the names from phone A', bState.people.join());
check((await real(B.p)).some((t) => t.desc === 'Tesco' && t.amt === 2340), "phone B sees A's Tesco entry");
check(!bState.txns.some((t) => t.example), 'example data cleared on phone B');
check(Object.keys(bState.budgets).length === 0, "phone B does not bring placeholder budgets into the household", JSON.stringify(bState.budgets));

// Both log at the same time, then sync
await B.p.goto(base + '/#home'); await B.p.waitForTimeout(200);
await B.p.locator('#qaInput').type('coffee 3.2 sam'); await B.p.keyboard.press('Enter');
await A.p.goto(base + '/#home'); await A.p.waitForTimeout(200);
await A.p.locator('#qaInput').type('petrol 55 adam'); await A.p.keyboard.press('Enter');
await sync(B.p); await sync(A.p); await sync(B.p);
const descA = (await real(A.p)).map((t) => t.desc).sort().join(), descB = (await real(B.p)).map((t) => t.desc).sort().join();
check(descA === 'Coffee,Petrol,Tesco' && descB === descA, 'entries made on both phones end up on both', `${descA} | ${descB}`);

// Edit on B, delete on A
await B.p.goto(base + '/#activity'); await B.p.waitForTimeout(200);
await B.p.evaluate(() => { const s = JSON.parse(localStorage.getItem('tally.v1')); s.txns.find((t) => t.desc === 'Tesco').amt = 2999; localStorage.setItem('tally.v1', JSON.stringify(s)); });
await B.p.reload(); await B.p.waitForTimeout(300); await sync(B.p); await sync(A.p);
check((await real(A.p)).find((t) => t.desc === 'Tesco').amt === 2999, 'an edit on phone B reaches phone A');
await A.p.goto(base + '/#activity'); await A.p.waitForTimeout(200);
await A.p.locator('#view-activity .tx', { hasText: 'Petrol' }).click(); await A.p.click('#sheet [data-act=del]'); await A.p.waitForTimeout(200);
await sync(A.p); await sync(B.p);
check(!(await real(B.p)).some((t) => t.desc === 'Petrol'), 'a delete on phone A removes it on phone B');

// Fixed cost logged by both phones merges into one entry
await A.p.goto(base + '/#fixed'); await A.p.waitForTimeout(200);
await A.p.click('[data-add-fixed]'); await A.p.fill('#fxDesc', 'Rent'); await A.p.fill('#fxAmt', '950'); await A.p.selectOption('#fxDay', '1'); await A.p.click('#sheet button[type=submit]');
await A.p.waitForTimeout(200);
// simulate B having posted it independently before syncing: B pulls the fixed record and posts it itself
await sync(A.p); await sync(B.p); await B.p.reload(); await B.p.waitForTimeout(300); await sync(B.p); await sync(A.p);
const rentsA = (await real(A.p)).filter((t) => t.desc === 'Rent').length, rentsB = (await real(B.p)).filter((t) => t.desc === 'Rent').length;
check(rentsA === 1 && rentsB === 1, 'a fixed cost posted on both phones is not doubled', `A:${rentsA} B:${rentsB}`);

// Names, budgets and learning travel too
await A.p.goto(base + '/#budget'); await A.p.waitForTimeout(200);
await A.p.evaluate(() => { const s = JSON.parse(localStorage.getItem('tally.v1')); s.budgets.groceries = 52000; s.learned['tesco'] = 'shopping'; s.aliases = Object.assign(s.aliases || {}, { js: "Sainsbury's" }); localStorage.setItem('tally.v1', JSON.stringify(s)); });
await A.p.reload(); await A.p.waitForTimeout(300); await sync(A.p); await sync(B.p);
const bs = await B.p.evaluate(() => JSON.parse(localStorage.getItem('tally.v1')));
check(bs.budgets.groceries === 52000 && bs.learned.tesco === 'shopping' && bs.aliases.js === "Sainsbury's", 'budgets, learned categories and learned names sync');

// Offline: B logs while the server is unreachable, then catches up
await B.c.route('**/api/sync', (r) => r.abort());
await B.p.goto(base + '/#home'); await B.p.waitForTimeout(200);
await B.p.locator('#qaInput').type('lunch 8.50'); await B.p.keyboard.press('Enter'); await B.p.waitForTimeout(1600);
check(await B.p.evaluate(() => JSON.parse(localStorage.getItem('tally.sync')).state === 'error'), 'phone B notices it cannot sync');
await B.c.unroute('**/api/sync'); await sync(B.p); await sync(A.p);
check((await real(A.p)).some((t) => t.desc === 'Lunch'), 'entry made while offline arrives once back online');

// A wrong code is refused cleanly
const C = await mk(); await C.p.goto(base + '/'); await C.p.waitForTimeout(200);
await C.p.fill('#obCode', 'zzzz-zzzz-zzzz-zzzz-zzzz'); await C.p.click('[data-ob-join]'); await C.p.waitForTimeout(500);
check(await C.p.locator('#onboard').isVisible() && (await C.p.locator('#toastText').innerText()).includes('No household'), 'unknown code is refused with a clear message');

check(!A.p.errs.length && !B.p.errs.length && !C.p.errs.length, 'no script errors', [...A.p.errs, ...B.p.errs, ...C.p.errs].join(' | '));
await b.close();
console.log(fails ? `${fails} FAILED` : 'all sync tests passed');
process.exit(fails ? 1 : 0);
