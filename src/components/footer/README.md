# Nexus footer

The footer closes the site with a large booking invitation, the Nexus brand, local section links, the configured club address/phone, directions and a back-to-top link. It uses the existing Outfit font and CSS entrance transitions; no canvas or WebGL renderer is mounted.

Light mode uses `public/assets/nexus-logo-light.webp`, a transparent light-background adaptation of the supplied official logo. It retains the red emblem and lettering, with charcoal X and subtitle. Dark mode keeps the original `nexus-logo.png`. Neither logo has a backing panel, padding or a badge background. The source edit and prompt are in `assets/imagegen/footer/`.

The main site passes `linkBase=""`; the standalone `/footer-preview` uses `/hero` links. Address, telephone and map destination come from `location/globeConfig.ts`. Reduced motion disables transitions and keeps content visible.

Run `npx tsc --noEmit` and `node scripts/test-footer.cjs`. Browser checks and screenshots are saved to `artifacts/footer-redesign/`.
