// Builds dist/ (installable PWA) and artifact/tally.html (single-page preview) from src/.
const fs = require('fs'), path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const css = r('styles.css'), body = r('body.html'), parser = r('parser.js');
// The app is written as ordered modules in src/app/ that share one scope; they are joined inside a single closure.
const appDir = path.join(__dirname, 'src', 'app');
const app = "(function () {\n'use strict';\n" + fs.readdirSync(appDir).filter((f) => f.endsWith('.js')).sort()
  .map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(appDir, f), 'utf8')).join('\n') + '})();\n';
const version = 'tally-' + Date.now().toString(36);
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Manrope:wght@400;500;600;700;800&display=swap">';
const scripts = (pwa) => `<script>${pwa ? 'window.TALLY_PWA=true;' : ''}</script>\n<script>\n${parser}\n</script>\n<script>\n${app}\n</script>`;

const pwa = `<!doctype html>
<html lang="en-GB" data-style="pop">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tally</title>
<meta name="description" content="Log household spending in seconds.">
<meta name="theme-color" content="#e6edff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14151b" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Tally">
<link rel="manifest" href="manifest.webmanifest">
<script>try{var t=JSON.parse(localStorage.getItem('tally.v1')||'null');if(t&&t.theme&&t.theme.chosen&&t.theme.style)document.documentElement.setAttribute('data-style',t.theme.style)}catch(e){}</script>
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
${fonts}
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
[hidden] { display: none !important; }
${css}
</style>
</head>
<body>
${body}
${scripts(true)}
</body>
</html>
`;
const manifest = {
  name: 'Tally', short_name: 'Tally', description: 'Log household spending in seconds.',
  start_url: './?source=pwa', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#e6edff', theme_color: '#ff5a36', lang: 'en-GB',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
  shortcuts: [{ name: 'Add an entry', short_name: 'Add', url: './?add=1#add', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }],
};
fs.mkdirSync(path.join(__dirname, 'dist/icons'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), pwa);
fs.writeFileSync(path.join(__dirname, 'dist/manifest.webmanifest'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(__dirname, 'dist/sw.js'), r('sw.js').replace('__VERSION__', version));
fs.copyFileSync(path.join(__dirname, 'src/icon.svg'), path.join(__dirname, 'dist/icons/icon.svg'));

// Artifact preview: the host wraps the page in its own document skeleton, and service workers are unavailable there.
const preview = `<title>Tally</title>
<script>try{var t=JSON.parse(localStorage.getItem('tally.v1')||'null');document.documentElement.setAttribute('data-style',(t&&t.theme&&t.theme.chosen&&t.theme.style)||'pop')}catch(e){document.documentElement.setAttribute('data-style','pop')}</script>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
${body}
${scripts(false)}
`;
fs.mkdirSync(path.join(__dirname, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'artifact/tally.html'), preview);
console.log('built', version);
