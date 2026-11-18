# Phase 2 — working hero tour

The hero after the punching-bag intro now contains a four-stop, scroll-driven gym prototype: Nexus exterior → entrance → strength floor → cardio. Open `/hero` to preview it directly, or enter through the existing intro at `/`.

## Implementation

The prototype uses original procedural Three.js geometry, merged by material into bounded exterior/interior draw-call groups. It includes the recognizable black/glass first-floor facade, Nexus signage, right-side external staircase, reception, racks, benches, dumbbells and treadmills. This phase establishes navigation and framing; detailed equipment, realistic materials and final Blender lighting bakes remain later phases.

The runtime camera tracks are in `src/components/hero/gym-tour/gymTourConfig.ts`. They adapt the Phase 1 draft rather than importing its unvalidated camera coordinates verbatim. Desktop uses wide architectural shots and side copy. Mobile uses portrait shots, bottom copy and a shorter scroll range. A brief masked camera cut separates exterior and interior, avoiding a flight through an opaque wall.

The tour occupies only `#home`. A sticky stage stays within that section and exits into the existing About section. The existing Lenis owner remains responsible for smooth page scrolling; no second provider, wheel interception or page-wide tour overlay was added. Stop buttons can jump between views; navbar links and the trial/program callbacks remain available.

The canvas renders on demand. Scroll updates continuous progress through refs, while React updates only discrete beats/readiness. Camera position, look target and FOV settle using frame-rate-independent damping. FOV snaps at its final tolerance so a tiny residual cannot keep the renderer running forever. Readiness is announced after a measured-size frame rather than before the initial draw.

Reduced motion and WebGL/context failure use a short static poster hero with readable HTML and working calls to action. The renderer stops continuous work outside the visible/interactive hero. Resize, visibility and event listeners have explicit cleanup.

## Scope

Existing application files edited:
- `src/components/hero/HeroSection.tsx`: replaces only the old hero subtree.
- `src/components/hero/RopeScrollController.ts`: optional tour integration; preserves About/Programs reveal and active-navigation duties using About-local thresholds.

New application files are confined to `src/components/hero/gym-tour/`. Navbar, intro and all downstream section source files are unchanged by this phase. `artifacts/gym-tour/phase2/source-scope.json` records source hash comparison against the start of this task.

The existing `npm run check:hero` command now delegates to the tour browser checks instead of asserting the removed floating-equipment hero. No package/dependency upgrade was made. Phase 1's integration validator recognizes the extracted hero component.

## Verification commands

```bash
npx tsc --noEmit
node scripts/gym-tour/test-tour.cjs
node scripts/gym-tour/validate-phase1.cjs --evidence
AGENT_BROWSER_DEFAULT_TIMEOUT=90000 node scripts/gym-tour/verify-tour-browser.cjs
node scripts/gym-tour/verify-mobile-touch.cjs
```

The browser CLI script requires agent-browser and a running local server. Set `TOUR_TEST_URL` for another origin. `TOUR_TEST_VIEWPORTS=desktop`, `wide-desktop`, `mobile` or a comma-separated list selects a subset; `TOUR_TEST_VIEWPORTS=none` runs only the extra intro/reduced-motion/context-loss cases. `TOUR_TEST_EXTRAS=0` skips those extras. `TOUR_REPORT_LABEL` and `AB_SESSION` isolate segmented runs. A completed successful script prints `VERDICT: PASS`; interrupted or failed attempts must not be treated as full passes.

The supplemental mobile test uses the installed Playwright package and a separate Chromium context with real touch emulation. This is necessary because this agent-browser installation's device preset did not expose touch points/coarse pointer. It uses software WebGL and does not certify iOS Safari or physical-phone GPU performance.

Evidence and desktop/mobile screenshots are under `artifacts/gym-tour/phase2/`. Functional, visual and environment-specific outcomes are recorded in `phase2-results.md`. Native GPU capture stalls observed before the FOV-settling fix and interrupted runs are kept separate from final verification. No guaranteed production FPS is claimed.
