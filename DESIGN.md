# Design System: SBRS ICON 2027

## Visual theme

A conference page shaped by material science: pale anodised plates, deep petrol chambers, precise rules, and natural, unretouched portraits. The page has the clarity of an editorial programme, with a little instrument-like structure. Its content is allowed to feel human.

## Color and roles

- Plate `#DDE3DC` and secondary plate `#CFD7CE`: light page surfaces.
- Paper `#EDF0EB`: raised reading surface and card fill.
- Chamber `#0E2A2B`: hero, technical sections, and footer.
- Graphite `#161C1B`: primary reading text.
- Toolpath `#4F5C57`: secondary text and structural notation.
- Phenol `#D6215F`: the action and focus color. Amber `#E8A33D` belongs to the existing media treatment and dark-surface highlights.

## Typography

- Fraunces gives the conference title, section headings, and speaker names a warm editorial voice. Source Sans 3 carries reading text, controls, and small labels.
- Both variable faces are self-hosted WOFF2 files, so the live site and local preview use the same type without a font service.
- Headlines stay deliberate and distinct from the relaxed body copy. Labels use restrained tracking and a readable size; monospaced lettering is reserved for actual measurements or code.

## Components and layout

- Portrait cards share a 4:5 image frame and preserve the supplied photograph's natural color.
- Text-only members use an open directory separated by hairline rules, rather than empty photo frames.
- The content width remains bounded at 1520px. Speaker cards and the directory collapse to one column on narrow screens.
- Desktop section links collapse to a compact, fully labeled menu on smaller screens.
- Buttons have clear focus and hover states and at least a 44px touch target where used on touch screens.

## Motion and restraint

- Keep the existing restrained entrance and speaker filter transition, with the reduced-motion path intact.
- Avoid neon glows, generic placeholder portraits, excessive gradient text, emoji, and decorative monospace.
