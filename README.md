# SBRS ICON 2027 — conference landing page

First-announcement / save-the-date site for the **1st SBRS International Conference on Sustainable
Materials, Design, and Biomanufacturing for Human Health**, 14–16 December 2027, PDPM IIITDM
Jabalpur, Madhya Pradesh, India.

One self-contained page. No build step, no dependencies, no framework.

---

## Deploy

Copy `index.html` and the `assets/` folder to any static host.

Hosted on **Render** from `github.com/gitaseem/sbrsicon` — `render.yaml` configures it as a static
site with no build command. Every `git push` to `main` redeploys.

`assets/source/` holds the untouched originals and is **not needed in production** (it is gitignored).

Local preview: open `index.html`, or `npx serve .`

---

## Forms — Register & Submit Abstract

Both CTAs open a modal form. **Nothing is wired up until you deploy the Apps Script.**

### Setup

1. Open **`apps-script/Code.gs`** and follow the header comment: create a Sheet, paste the script in
   via Extensions → Apps Script, set `NOTIFY_TO` and `SHEET_ID`, then deploy as a **Web app** with
   *Execute as: Me* and *Who has access:* **Anyone**.
2. Copy the `/exec` URL it gives you.
3. In `index.html`, find near the top of the `<script>`:
   ```js
   var FORM_ENDPOINT = "";
   ```
   Paste the URL between the quotes. Commit and push.

Until you do that, submitting opens a pre-filled email to `office@sbrsin.org` instead — so the forms
are never a dead end.

### What it validates

Client-side, before anything is sent:

| Field | Rule |
|---|---|
| Every required field | Cannot be empty; the submit button reports how many need attention and focuses the first |
| Email | Must match `name@domain.tld` |
| Country | Must be chosen — 176 countries, each carrying its dial code |
| Phone | Country must be picked first; digits only; 4–14 national digits; dial code + number capped at 15 (E.164) |
| Abstract | 20–300 words, counted live |

Errors appear under each field, mark it `aria-invalid`, and clear as you correct them. A hidden
honeypot field silently drops bots. The server re-checks name and email before emailing.

Submissions arrive as email (with the submitter as `Reply-To`) and, if you set `SHEET_ID`, as a row
in a per-form tab of your Sheet.

---

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole site — markup, CSS, inline SVG, canvas globe, forms |
| `assets/` | Web-ready media and logos |
| `assets/source/` | Originals, untouched (not deployed) |
| `apps-script/Code.gs` | Google Apps Script form receiver — deploy this to make the forms live |
| `render.yaml` | Render static-site config with cache headers |
| `tools/build-globe-data.js` | Regenerates the globe dot payload from Natural Earth data |
| `build-artifact.mjs` | Builds `artifact.html` for publishing to a claude.ai Artifact |
| `.impeccable/review/` | Review screenshots |

---

## Still to supply

- **`FORM_ENDPOINT`** — the forms email you only once this is set (above).
- **Highlight imagery** — the four highlight cells (3D Bioprinting, 4D Biomanufacturing, Advanced
  Medical Devices, Biomanufactured Medical Products) are currently title-only, waiting on one photo
  each.
- **Abstract file upload** — the form takes abstract text, not a `.docx`/`.pdf`. Apps Script can
  accept files, but it needs base64 upload and a Drive folder; say the word if you want it.
- **QR code destination** — the poster has a QR code; it is not on the site because its target is unknown.
- **Speakers, programme, fees, sponsors, committee** — no sections, because no content was supplied.

The About photograph is captioned **ILLUSTRATIVE** because it is a generic additive-manufacturing
still, not a result from this conference. Keep that label if the image stays.

---

## Media provenance

Everything shipping is a transcode of a client-supplied original in `assets/source/`. Nothing was
generated and no third-party asset was fetched.

| Shipping file | Source | Treatment |
|---|---|---|
| `hero.mp4` + `hero-poster.jpg` | `8940765-uhd_…mp4` | 4K → 1920×1080 H.264 CRF 28, audio stripped (26 MB → 2.0 MB) |
| `bench.mp4`, `people.mp4` (+ posters) | `7705427-…`, `8327269-…` | → 1280×720 CRF 30 |
| `heart.jpg` / `.webp` | `printing-blue-human-heart.jpg` | → 1600 px wide |
| `campus-jabalpur.jpg` / `.webp` | `Campus photograph of PDPM IIITDM Jabalpur.jpg` | → 1400 px, displayed as a 21:9 band |
| `sbrs-logo.png` | `…sbrs logo.png` | → 440 px, alpha preserved |
| `iiitdmj-logo.png` | `PDPM IIITDM Jabalpur logo.png` | → 380 px, alpha preserved |
| `iitm-logo.png` / `.webp` | `IIT_Madras_Logo.svg.webp` | → 176 px, alpha preserved |

All three institutional logos are reproduced **unaltered** — marks are never recoloured into the palette.

**Not used**: `…Kancheepuram_logo.png` is IIITDM **Kancheepuram**, a different institution from the
host. `845.jpg` has *"World Health Day"* burned in and belongs to another campaign. The two CGI DNA
clips are off-subject. The remaining stock lab stills were left out on design grounds. All are still
in `assets/source/`.

---

## Design system

**Palette** — materials this audience knows by sight.

| Token | Value | Role |
|---|---|---|
| `--plate` | `#DDE3DC` | Page ground |
| `--chamber` | `#0E2A2B` | Petrol — hero, tracks, footer |
| `--graphite` | `#161C1B` | Body and display type |
| `--phenol` | `#D6215F` | Actions and focus rings, nothing else |
| `--bioink` | `#E8A33D` | Accent, duotone highlight end |
| `--toolpath` | `#869690` | Rules and instrument labels |

**Type** — Archivo (variable `wdth` + `wght`) for display and body; Martian Mono for labels. Google
Fonts, the only external host the Artifact CSP permits.

**Footage** is duotoned `--chamber` → `--bioink` via a grayscale + `lighten`/`multiply` sandwich, so
no clip introduces a colour outside the system. Institutional logos are exempt.

---

## The globe

The hero carries a **dotted halftone globe** on canvas 2D — orthographic projection, drag to rotate,
slow auto-rotation that pauses while you drag. It starts centred on India and marks two locations:

| Pin | Colour |
|---|---|
| PDPM IIITDM Jabalpur — venue & host | `--phenol` |
| IIT Madras — co-organizer | `--bioink` |

Labels are chipped, separated, and flip to the other side of the pin near the frame edge, so the two
Indian locations never collide.

**No d3 and no runtime fetch.** Land dots (2,946, on an equal-area lattice) and simplified coastlines
are precomputed from Natural Earth 110m land data and packed base36 into a 16 KB inline constant.
Regenerate with the script in `tools/` if you ever want a different dot density.

A hand-built inline SVG globe sits beneath as the base layer, so no-JS and `prefers-reduced-motion`
still land on a complete static page. Reduced motion renders one static frame, already centred on India.

Wheel-zoom was deliberately left out: trapping the scroll wheel over a hero breaks page scrolling.

## Maps

The two host cards embed live Google Maps (`maps?q=…&output=embed`) — no API key needed. The Artifact
build swaps them for a link-out card, since the Artifact CSP blocks external hosts.

---

## Verified

- Content diffed literally against the official poster copy.
- Text contrast ≥ 4.5:1 (≥ 3:1 large) on every pair.
- Forms: empty submit blocked, invalid email/phone caught, dial code auto-filled, 300-word cap enforced.
- One `<h1>`, skip link first in tab order, all focusables named, `<dialog>` traps focus and restores it.
- `prefers-reduced-motion`: animation at final state, videos paused, globe renders one static frame.
- No horizontal overflow at 375 / 768 / 1440 px. Zero console errors.
