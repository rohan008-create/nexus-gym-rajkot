# Nexus footer

The footer renders a red Nexus boxing glove, section links, and the club phone number. Moving the pointer or swiping over the padded leather compresses it locally and lets it ease back into shape. The “Go Beyond” wordmark dissolves on hover or keyboard focus and links back to the top. Reduced motion keeps the glove and wordmark still.

Both themes use the transparent artwork at `public/assets/footer/nexus-boxing-glove.webp`.

The main site passes `linkBase=""` for in-page navigation. The standalone `/footer-preview` links to `/hero`. The telephone number and map destination come from `location/globeConfig.ts`.

Run `npx tsc --noEmit` and `node scripts/test-footer.cjs` with the dev server running. Set `FOOTER_SCREENSHOT_DIR` to save the browser screenshots.
