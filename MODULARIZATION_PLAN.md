# Static site modularization

## Goal

Make the site easier to navigate and maintain while preserving its current static hosting, direct `index.html` preview, no-JavaScript content, layout, and interactions.

## Changes

1. Keep the semantic conference sections in `index.html`; replace the inline CSS and JavaScript with ordered, deferred links to feature files.
2. Split CSS by responsibility: foundation, hero, content sections, forms, people, fees and sponsorship, and motion.
3. Split JavaScript by responsibility: shared helpers, navigation, timeline, video, globe data and drawing, form configuration and country data, forms, and speaker filtering. Share only a small `window.SBRS` namespace because classic deferred scripts also work from `file://`.
4. Teach `build-artifact.mjs` to inline those files and every supplied speaker portrait when producing the standalone artifact.
5. Update deployment and maintenance instructions, and keep static files revalidating at the host.

## Verification

- Compare the important page interactions before and after the extraction in Chromium at desktop and mobile widths.
- Check script syntax, asset loading, responsive overflow, the speaker filter, mobile menu, form validation, globe canvas, and artifact output.
