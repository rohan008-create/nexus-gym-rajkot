# Nexus footer

The shared `FuzzyGazeFooter` renders the red mascot, section links, and the club phone number. Its eyes follow the pointer, blink, and wander when idle. Moving the pointer or swiping over the mascot bends individual fur strands away from the contact point and nudges the mascot before it settles. The “Go Beyond” wordmark dissolves on hover or keyboard focus and links back to the top. Reduced motion keeps the mascot and wordmark still.

Both themes use the artwork in `public/assets/fuzzy-gaze-footer/`. The footer's SVG filter applies the Nexus palette and lets the active page background show through. The eye positions in the component are aligned to that artwork.

The main site passes `linkBase=""` for in-page navigation. The standalone `/footer-preview` links to `/hero`. The telephone number and map destination come from `location/globeConfig.ts`.

Run `npx tsc --noEmit` and `node scripts/test-footer.cjs` with the dev server running. Set `FOOTER_SCREENSHOT_DIR` to save the browser screenshots.
