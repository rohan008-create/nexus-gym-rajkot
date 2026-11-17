# Simple Nexus footer

The previous stone wall, extruded letters, rocks, textures, typeface subset, and 3D renderer have been removed from the footer. The main navbar and other site sections remain unchanged.

`NexusFooter.tsx` renders the official logo, six local navigation anchors, configured address and phone, booking CTA, and copyright. The main site passes `linkBase=""` to keep navigation within the current page. `/footer-preview` defaults to `/hero` destinations.

`RisingHorizon.tsx` is an **original custom Canvas 2D implementation**, selected by the user after the React Bits Pro license key was found to be unavailable. It is not the licensed React Bits Pro Rising Lines component and contains no copied Pro source. The public visual reference is https://pro.reactbits.dev/docs/components/rising-lines. No Pro install or shadcn initialization is required for this custom version, and no paid registry requests are made.

The animation uses a fixed line field (78 desktop / 42 coarse pointer) and 24 reusable volley slots. Hover increases the updraft beneath the pointer. Click or tap launches a bounded volley; movement during touch scrolling does not trigger it. Links retain native navigation. Motion runs in one owned animation loop, draws at a lower cadence while idle, pauses offscreen/in a hidden tab, and becomes a still frame for reduced motion. DPR is capped at 1.5 desktop / 1.25 coarse pointer. All observers, listeners, and the animation loop are cleaned up.

The CSS supplies a static horizon glow when Canvas 2D is unavailable, and reserves layout dimensions before initialization. The footer reuses the site's crimson token and existing self-hosted Outfit font. It adds no dependencies and uses no WebGL context.

## Preview and checks

Run `npm run dev` and open `/footer-preview`, or scroll to the bottom of the main landing page. Move over the horizon panel, then click/tap away from the booking link.

Run `npx tsc --noEmit`, `npm run build`, and `node scripts/test-footer.cjs`. Set `FOOTER_TEST_URL` to select another server. Browser checks cover animation, bounded volleys, mobile taps, responsive widths, reduced motion, offscreen pause, real anchors, and fallback rendering. Artifacts go to `qa/footer-simple`.
