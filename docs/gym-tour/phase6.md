# Phase 6: interaction, accessibility and responsive polish

Implementation delivered 2026-11-18; final QA was skipped at the user's explicit request. This record describes source changes, not passed regression checks.

## Changes

- Error fallback now offers a keyboard-accessible **Retry tour** action. It remounts the canvas and error boundary, resets the readiness status and keeps the existing HTML trial/programs actions available.
- A 12-second visible-page loading timeout switches to the usable poster if no initial successful render is announced. Hiding the page cancels the timer; visibility restoration starts a fresh interval. Optional GLB failures continue to use procedural geometry rather than blocking readiness.
- Poster visibility includes loading as well as reduced-motion/error states. The media query and initial document visibility are read on mount.
- All hero buttons receive an explicit focus-visible outline. Short desktop CTA targets now retain at least 44 px height. Reduced-motion CSS disables local transitions/animations in addition to the existing static tour mode.
- Short mobile layouts use more compact typography, positioning and footer controls. Very short viewports use a 450 px stage (550 px static overview), with descriptions hidden to keep the primary actions accessible through native page scrolling. These breakpoints require visual/device confirmation.
- Stop navigation clamps the travel range to zero to avoid negative destinations in short static layouts.

## Preserved scope

The punching-bag intro, page entry wiring, Navbar, trial dialog implementation, About, Programs, membership/social/footer and other downstream sections were not edited. Existing camera tracks, four stops, native scroll provider, fallback models and cached model ownership remain.

## QA waiver and remaining confidence limits

The full intro-to-About journey, touch scrolling, orientation changes, keyboard/focus flows, retry under actual WebGL loss, optional asset failures, repeated replay and resource behavior have not been exercised after these edits. No new screenshots, build or TypeScript results exist. Physical Android and iOS Safari remain unverified. Final QA and measured performance are deferred by the user, so Phase 6's original release-readiness gate is not certified. Publishing remains a separate action.
