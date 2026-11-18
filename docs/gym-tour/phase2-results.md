# Phase 2 results

The working tour is integrated into the hero. View it directly at http://localhost:3000/hero or enter through the existing punching-bag intro at http://localhost:3000/.

## Delivered

- Four forward/reverse views: exterior, entrance, strength and cardio.
- Original merged procedural building/equipment geometry; recognizable Nexus facade/signage and right-hand stair.
- Separate desktop/mobile camera tracks, sticky hero-local stage and existing normal page scrolling.
- Existing navbar, trial dialog callbacks and downstream sections retained. About/Programs reveal logic is scoped independently of the longer hero.
- Demand rendering that settles to zero idle draw calls in the desktop browser check.
- Mobile stop controls at least 44×44 CSS pixels and larger footer text.
- Short static reduced-motion/context-loss fallback with working CTA; no tall empty scroll tunnel.

## Verification

Final verification was split into independent runs after an earlier long native run was interrupted. `artifacts/gym-tour/phase2/browser-checks.json` is an explicitly labeled aggregate of successful final runs, not an assertion that the original interrupted command completed.

| Check | Result | Evidence |
| --- | --- | --- |
| Camera sampling, finite geometry, bounded material groups, FOV settling regression | PASS | `node scripts/gym-tour/test-tour.cjs` |
| TypeScript | PASS | `npx tsc --noEmit` |
| Production compilation/static generation | PASS | isolated build snapshot, `artifacts/gym-tour/phase2/build.log` and `build.json` |
| Desktop native browser: four stops, reverse controls, wheel scrolling, idle render settling, trial, Programs and About | PASS | `browser-desktop-final.json` |
| Intro entry/unlock/focus, reduced motion, actual WebGL context loss, fallback CTA and no uncaught errors | PASS | `browser-extras.json` |
| True touch-context emulation: four stop taps, 44×44 targets, trial/menu, native touch scroll and interior | PASS | `mobile-touch.json` |
| Phase 1 preparation evidence/integration anchors | PASS | `node scripts/gym-tour/validate-phase1.cjs --evidence` |

The three successful final browser runs contain **23 checks**. Desktop uses headed native Chrome; mobile uses Chromium touch emulation (390×844, DPR 3, coarse pointer, touch points enabled) with software WebGL. This does not certify a physical phone, iOS Safari or production FPS. Earlier wide-desktop/native-mobile viewport observations and interrupted attempts are retained separately.

The production build ran from `/tmp/nexus-phase2-build` with separate output and two workers so existing running build caches were untouched. The hero source files match the verified build snapshot. Other concurrent footer edits observed afterward are outside this task; the build is not a certification of every later workspace edit.

## Bugs caught during verification

- A tiny FOV residual could remain below the update tolerance but above the render-stop tolerance, keeping demand rendering alive. It now snaps to the target, with a regression test and an actual idle draw-call check.
- Initial readiness could announce before a measured-size frame. It now follows the first successful draw.
- Forced GPU loss could leave a queued Three r169 render accessing an invalid shader program. The tour owns its final draw, checks context validity and stops pending work before fallback/disposal. Only confirmed context-loss render errors are suppressed; unrelated failures still propagate. Final GPU-loss verification records no uncaught errors.

## Visual review and scope

An independent design agent passed desktop, tablet, portrait mobile and landscape compositions. Fresh second-round review also passed: no copy/footer overlap at390×844 or320×740, measured44×44 targets and a rendered building at the first ready state. Software-rendered visual review is distinct from native performance measurement.

This task edited existing application source only in `HeroSection.tsx` and `RopeScrollController.ts`; new runtime files are under `src/components/hero/gym-tour/`. No intro/navbar/downstream section source was edited by this task. Hash comparison recorded concurrent changes to `NexusFooter.tsx` and `footer.css`; those were left untouched. See `source-scope.json` for the precise distinction.

## Remaining phases and limits

This is a functional procedural prototype, not the finished photorealistic model. Detailed exterior/materials, realistic equipment, final lighting baking and export/compression tuning remain later phases. Rotating/resizing preserves normal document scroll position rather than explicitly preserving normalized tour progress; this can advance the current beat when the hero becomes shorter. Normal navigation remains usable.

Selected screenshots: [desktop exterior](../../artifacts/gym-tour/phase2/desktop-exterior.png), [desktop strength](../../artifacts/gym-tour/phase2/desktop-strength.png), [mobile exterior](../../artifacts/gym-tour/phase2/mobile-touch-exterior.png), [mobile interior](../../artifacts/gym-tour/phase2/mobile-touch-interior.png).
