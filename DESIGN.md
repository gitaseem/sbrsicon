# SBRS ICON 2027 - editorial

Reads like a well-set scientific journal, not a product landing page. The speakers' faces and the type carry it.

**Colour.** Two lights, white `#FFFFFF` and paper `#F6F4EE`. One pop, vermilion `#C8320F`, capped at a couple of uses per screen plus the footer. Ink `#16130F` and muted `#57524A` for text. To change the accent, edit `--pop` and `--on-pop` in `styles/foundation.css`.

**Type.** Newsreader for headings, large statements and names. Archivo for reading text, labels, tables and controls. Both self-hosted.

**Signature.** Portraits are monochrome so mixed source photos read as one set, and colour returns on hover. Highlight images are set as numbered figures.

**Surfaces.** Flat, hairline rules, 2px corners at most. Glass only on the sticky navigation, where content really passes behind it. No cards, blobs, gradients or decorative shapes.

**Page order.** Hero, speakers, about, tracks, highlights, dates, fees, sponsorship, venue, committee. Real people come first.

**Motion.** One easing, 150ms for controls, 380ms and 12px of travel for reveals. Reveals are limited to headings and a few key blocks; portraits, reading text and fee tables are never hidden. The globe turns only when dragged or scrolled, with no idle loops. The deadline line draws in as the dates scroll into view. With reduced motion on, only the progress line remains.

**Interaction.** Effects answer the visitor and most do a job. Headline letters thicken near the cursor (variable weight with locked widths, so nothing shifts). Buttons jump the globe to each location. A colour lens follows the cursor over portraits; on touch, the card at screen centre turns colour. Each track row opens the abstract form with that track chosen. The fee finder reads its prices from the published tables and marks the matching cell; it stays pinned beside the tables on wide screens, and on narrow screens only the chosen table shows, directly under the options, so the mark stays in view. The About section is a pinned scroll sequence: the paragraph lights up word by word and a red marker sweeps across its key phrase, then each objective takes the screen in turn with a step counter. It runs only when each step fits the screen, and otherwise falls back to plain text, as it does with reduced motion or without scripts. Other reading text inks in on scroll. All of it lives in `scripts/interactions.js`, `scripts/motion.js` and `styles/motion.css`, has touch and keyboard equivalents where it matters, and stays off or instant with reduced motion.


## Conference highlights

The four highlights are diagrams drawn in code (`scripts/highlights.js`), not images. Each is scrubbed by moving the mouse across it, dragging sideways on touch, or using its slider. Each plays once on entering the view and then draws only when something changes. With reduced motion they show the finished state, with no autoplay and no smoothing.

On load an unseen cursor drifts once across the hero headline on every device, using the same effect as hovering; devices with a cursor can then hover it. Reduced motion turns both off.
