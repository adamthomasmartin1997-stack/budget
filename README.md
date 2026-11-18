# Budget

A household budget tracker for one or two people. Logging a cost is one line: `tesco 23.40`. Both phones share one household, so everything either of you logs shows on both. GBP, UK dates. It's a web app you add to your home screen; no app store needed.

## What's in it
- **Home:** the quick-add box with one-tap **Adam · Sam · Joint** buttons, this month against budget with a tile for each of you, and your latest entries. Shortcut buttons for things you repeat appear after a month of use.
- **Insights:** Week, Month and Year views for everyone, each person or joint. Includes a spending calendar, charts, fixed vs day-to-day, saved & invested, top places and biggest costs. Weekly and monthly recaps appear at the top, and the tab shows a dot when one is new.
- **Fixed:** bills and subscriptions that log themselves on their day each month.
- **Income:** money in this month, what's still to come, regular income (salaries log themselves on payday), where the money went, and the last 12 months.
- **Budget:** savings goals (target, progress, when you'll get there) and a monthly budget for each category.
- **Activity** (list icon, top right): every entry, searchable.
- **Settings** (sliders icon): sync between phones, names, style, shorthand guide, learned merchants, backup.

It knows about 180 UK shops and brands, including nicknames and typos: `sains` is Sainsbury's, `maccies` is McDonald's, `spoons` is Wetherspoons, `tescp` is Tesco. Correct a name once (in the preview or by editing an entry) and it remembers that spelling on both phones.

Savings and investments (`stocks and shares isa 300 adam`, `emergency fund 150`, `pension 400`) are recorded as **saved or invested**, never as spending.

## Put it online (Netlify, free)
Sync needs the small server function in `netlify/functions/`. That means deploying through Git or the Netlify CLI; dragging the `dist` folder onto Netlify Drop would skip the function.

**With GitHub (easiest to keep updated)**
1. Create an empty private repository on GitHub and push this folder to it.
2. In Netlify: **Add new site → Import an existing project →** choose the repository. The build settings are read from `netlify.toml`, so just press **Deploy**.
3. Open the site on your phone, enter your names, then go to **Settings → Sync between phones → Start a household**.
4. Tap **Copy invite link** and send it to your partner. They open it on their phone and tap **Join household**.
5. On each phone, add the site to the home screen (Safari: Share → Add to Home Screen; Chrome: menu → Install app).

**With the Netlify CLI instead**

    npx netlify-cli login
    npx netlify-cli deploy --prod

Storage uses Netlify Blobs, which is built into every Netlify site; there is nothing to configure.

**About the household code:** anyone who has the code (or the invite link) can see and change your household, so share it only with each other. The server stores a hash of the code, not the code itself.

## Work on it
    npm install
    npm run dev        # builds, then serves on http://localhost:8888 with a local stand-in for the sync server
    npm test           # shorthand parser (20 cases) and sync merge rules (10 cases)
    npm run test:sync  # two-phone sync, end to end (needs `npm run dev` running and Playwright)

- `src/parser.js`: the shorthand parser and keyword-to-category map.
- `src/app/`: the app, split into ordered modules that `build.js` joins into one script (state, quick add, insights, fixed, income, goals, sync and so on).
- `src/styles.css`, `src/body.html`, `src/sw.js`: styles (five styles; Pop is the default), markup and offline cache.
- `netlify/lib/merge.mjs`: the sync rules (newest change to each record wins, deletes are remembered, concurrent saves retry).
- `netlify/functions/sync.mjs`: the `/api/sync` endpoint on Netlify.

`node build.js` writes the site to `dist/` and a single-page preview to `artifact/tally.html`.
