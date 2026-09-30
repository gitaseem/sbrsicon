/**
 * Builds artifact.html from the static site files.
 *
 * The claude.ai Artifact viewer enforces a strict CSP and serves the page without
 * sibling assets, so relative media and font paths cannot resolve. This inlines
 * the media and fonts as data URIs and strips the document skeleton, which the
 * viewer supplies itself.
 *
 * The hero video is inlined in full. The two below-the-fold clips ship as their poster stills
 * only, to keep the single file at a sane weight — they are duotoned backgrounds, so a still
 * reads almost identically. The hosted site uses index.html plus styles/, scripts/, and assets/.
 *
 *   node build-artifact.mjs
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';

const mime = f => f.endsWith('.mp4') ? 'video/mp4'
  : f.endsWith('.woff2') ? 'font/woff2'
  : f.endsWith('.png') ? 'image/png'
  : f.endsWith('.webp') ? 'image/webp'
  : 'image/jpeg';

const dataURI = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;

let h = readFileSync('index.html', 'utf8');

// 1. The Artifact viewer cannot fetch sibling CSS or JavaScript files. Keep the
// order from index.html so CSS overrides and deferred-script dependencies survive.
h = h.replace(/<link rel="stylesheet" href="(styles\/[a-z-]+\.css)">/g,
  (_, file) => `<style>\n${readFileSync(file, 'utf8')}\n</style>`);

// CSS font URLs are relative to their original stylesheet. Inline them too so
// the single-file preview uses exactly the same typography as the live site.
h = h.replace(/\.\.\/assets\/fonts\/([a-z0-9-]+\.woff2)/g,
  (_, name) => dataURI(`assets/fonts/${name}`));
h = h.replace(/<script defer src="(scripts\/[a-z-]+\.js)"><\/script>/g,
  (_, file) => `<script>\n${readFileSync(file, 'utf8')}\n</script>`);

// 2. Inline every speaker portrait, including additions to the directory.
const portraits = readdirSync('assets')
  .filter(name => /^spk-.+\.(webp|jpg)$/.test(name))
  .map(name => `assets/${name}`);
for (const f of ['assets/hero.mp4', 'assets/hero-poster.jpg', 'assets/bench-poster.jpg',
                 'assets/people-poster.jpg', 'assets/heart.jpg',
                 'assets/iitm-logo.webp', 'assets/iitm-logo.png',
                 'assets/iiitdmj-logo.png', 'assets/sbrs-logo.png',
                 'assets/campus-jabalpur.webp', 'assets/campus-jabalpur.jpg',
                 'assets/hl-bioprinting.webp', 'assets/hl-bioprinting.jpg',
                 'assets/hl-4d.webp', 'assets/hl-4d.jpg',
                 'assets/hl-devices.webp', 'assets/hl-devices.jpg',
                 'assets/hl-products.webp', 'assets/hl-products.jpg',
                 ...portraits]) {
  const before = h.length;
  h = h.split(f).join(dataURI(f));
  if (h.length === before) console.warn('  ! not referenced:', f);
}

// 3. Drop the two deferred clips; their posters stay and carry the frame.
h = h.replace(/\s*<source src="assets\/(bench|people)\.mp4" type="video\/mp4">/g, '');

// 4. The Artifact CSP blocks external hosts, so the Google Maps iframes cannot load there.
//    Swap each for a link-out card; index.html keeps the live embeds.
h = h.replace(/<iframe class="mapframe"[\s\S]*?<\/iframe>/g,
  '<p class="mapstub">Interactive map available on the live site</p>');

// 5. Strip the skeleton the viewer supplies (keep <title> and inline styles).
h = h.replace(/^[\s\S]*?<title>/, '<title>')
     .replace(/<\/head>\s*<body>/, '')
     .replace(/<\/body>\s*<\/html>\s*$/, '')
     .replace(/^﻿/, '');

writeFileSync('artifact.html', h);
const mb = (statSync('artifact.html').size / 1048576).toFixed(2);
console.log(`artifact.html  ${mb} MB` + (mb > 16 ? '  ** OVER THE 16 MB LIMIT **' : '  (limit 16 MB)'));
for (const tag of ['<iframe', '<!doctype', '<html', '<head>', '</head>', '<body>', 'assets/', 'styles/', 'scripts/']) {
  if (h.toLowerCase().includes(tag)) console.warn('  ! leftover:', tag);
}
