/**
 * Builds artifact.html from index.html.
 *
 * The claude.ai Artifact viewer enforces a strict CSP (no external hosts except Google Fonts)
 * and serves the page without a sibling assets/ directory, so relative media paths cannot
 * resolve. This inlines the media as data URIs and strips the document skeleton, which the
 * viewer supplies itself.
 *
 * The hero video is inlined in full. The two below-the-fold clips ship as their poster stills
 * only, to keep the single file at a sane weight — they are duotoned backgrounds, so a still
 * reads almost identically. index.html remains the complete deliverable.
 *
 *   node build-artifact.mjs
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const mime = f => f.endsWith('.mp4') ? 'video/mp4'
  : f.endsWith('.png') ? 'image/png'
  : f.endsWith('.webp') ? 'image/webp'
  : 'image/jpeg';

const dataURI = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;

let h = readFileSync('index.html', 'utf8');

// 1. inline the media the artifact keeps
for (const f of ['assets/hero.mp4', 'assets/hero-poster.jpg', 'assets/bench-poster.jpg',
                 'assets/people-poster.jpg', 'assets/heart.jpg',
                 'assets/iitm-logo.webp', 'assets/iitm-logo.png',
                 'assets/iiitdmj-logo.png', 'assets/sbrs-logo.png',
                 'assets/campus-jabalpur.webp', 'assets/campus-jabalpur.jpg']) {
  const before = h.length;
  h = h.split(f).join(dataURI(f));
  if (h.length === before) console.warn('  ! not referenced:', f);
}

// 2. drop the two deferred clips; their posters stay and carry the frame
h = h.replace(/\s*<source src="assets\/(bench|people)\.mp4" type="video\/mp4">/g, '');

// 3. the Artifact CSP blocks external hosts, so the Google Maps iframes cannot load there.
//    Swap each for a link-out card; index.html keeps the live embeds.
h = h.replace(/<iframe class="mapframe"[\s\S]*?<\/iframe>/g,
  '<p class="mapstub">Interactive map available on the live site</p>');

// 4. strip the skeleton the viewer supplies (keep <title>, the font link, and <style>)
h = h.replace(/^[\s\S]*?<title>/, '<title>')
     .replace(/<\/head>\s*<body>/, '')
     .replace(/<\/body>\s*<\/html>\s*$/, '')
     .replace(/^﻿/, '');

writeFileSync('artifact.html', h);
const mb = (statSync('artifact.html').size / 1048576).toFixed(2);
console.log(`artifact.html  ${mb} MB` + (mb > 16 ? '  ** OVER THE 16 MB LIMIT **' : '  (limit 16 MB)'));
for (const tag of ['<iframe', '<!doctype', '<html', '<head', '<body', 'assets/']) {
  if (h.toLowerCase().includes(tag)) console.warn('  ! leftover:', tag);
}
