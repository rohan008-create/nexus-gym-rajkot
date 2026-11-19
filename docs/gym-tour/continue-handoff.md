# Nexus gym tour: continuation handoff

Updated 2026-11-18 after the Phase 5/6 implementation continuation. Read [Phase 5](phase5.md) and [Phase 6](phase6.md) first. The user explicitly requested skipping testing: implementation is delivered, but performance measurements and final QA are deferred and release readiness is unverified. The detailed phase instructions below describe the original acceptance scope; their verification steps were not executed in this continuation.

## Status and remaining phases

| Phase | Status | Work |
| --- | --- | --- |
| 1 | Complete | Reference analysis, Blender pipeline, baseline and integration specification. |
| 2 | Complete | Working four-stop scroll hero, desktop/mobile camera tracks, fallback and integration. |
| 3 | Complete | Detailed original exterior inspired by the supplied Nexus building photo. |
| 4 | Complete | Detailed original concept interior with strength/cardio equipment, reception, branding and static mirrors. |
| 5 | Implementation delivered; unverified | Contact shading, one-time reflections, lighting balance, loading scheduling and render guards. Offline baking/compression not adopted; performance measurements deferred by user. See phase5.md. |
| 6 | Polish delivered; QA deferred by user | Retry/loading timeout, focus and short-screen layout improvements. Browser/device regressions, typecheck, build and release certification not run. See phase6.md. |

Both implementation passes have been delivered. Their original verification gates remain open under the user's testing waiver. Do not claim measured smoothness, passed regression QA or release readiness. Do not restart completed work.

## User-approved product scope

Keep the existing punching-bag intro. After “Enter Nexus”, improve only the gym-tour hero. Keep the Navbar and all later sections and their interactions. The user wants a realistic, smooth experience on desktop and mobile without removing existing features. The exterior approximates the real gym photo; the interior is deliberately invented. Do not call it an accurate scan or promise photorealism/60 FPS without evidence.

The current worktree also contains separately developed intro, footer, membership, social and modal changes. Preserve them. The pushed snapshot includes these existing changes; they are not all gym-tour phase work. Do not restore the deleted evolution components or revert unrelated sections automatically.

## Read first

- `docs/gym-tour/README.md`: scope, integration contract, tooling, budgets and reference licensing.
- `docs/gym-tour/phase2.md`, `phase3.md`, `phase4.md`: delivered implementation and limitations.
- `artifacts/gym-tour/phase4/verification.json`: historical Phase 4 evidence (36 passing segmented browser checks, typecheck and isolated production build at that time). Rerun relevant checks after new edits.
- Repository skill instructions, especially `.agents/skills/gravitas/SKILL.md`, and applicable frontend/browser skills in the environment.

## Architecture and files

Next.js 14 / React 18 / React Three Fiber 8 / Drei 9 / Three r169. Keep the existing framework and dependencies compatible; the reference repository uses a different stack.

- `src/components/hero/gym-tour/GymTourHero.tsx`: sticky hero, HTML copy/CTA, four stops, readiness, visibility and reduced-motion fallback. `#home` exposes status/beat/progress data attributes for QA.
- `GymTourCanvas.tsx`: one demand-rendered canvas, camera damping, final render ownership, context-loss guards, exterior/interior visibility cut. Preserve demand rendering and exact FOV settling so idle frames stop.
- `DetailedExterior.tsx`, `DetailedInterior.tsx`: optional GLB loading with cached promises and mounted scene clones sharing immutable resources. Never dispose shared cached assets from a single mount. The interior waits until interactive plus 350 ms; keep parsing away from punching impact. Failed optional assets retain procedural fallbacks.
- `gymTourConfig.ts`: separate desktop/mobile camera tracks and intentional exterior/interior cut around progress .45. Do not interpolate through an opaque wall.
- `buildGymGeometry.ts`: merged procedural fallback geometry. Retain it.
- `gym-tour.css`: isolated hero styles, mobile safe areas and 44 px stop controls.
- `src/components/hero/HeroSection.tsx`: surrounding page and trial wiring. Preserve the rest of the page tree.
- `src/app/page.tsx`: punching intro, inert landing, reveal, scroll unlock and readiness timeout. The hero also has a post-commit focus safeguard; retain it.
- `RopeScrollController.ts`: downstream reveals/navigation still depend on this controller. Do not remove it.
- `src/components/layout/SmoothScroll.tsx`: existing single Lenis/GSAP integration. Do not add a second scroll provider or hijack wheel/touch scrolling.
- `TrialDialog.tsx`: current animated modal uses `role="dialog"` and `#trial-enquiry-form`, not only a native `<dialog>` selector.

Preview: `/hero` bypasses intro; `/` tests the actual intro-to-hero flow. Start with `npm ci` if needed and `npm run dev` (port 3000); check for an existing server first.

## Assets and reproducibility

- `scripts/gym-tour/build_exterior.py` -> `public/models/nexus-gym/exterior.glb` and metadata.
- `scripts/gym-tour/build_interior.py` -> `public/models/nexus-gym/interior.glb` and metadata.
- Blender: `python3 scripts/gym-tour/setup-blender.py`; installed Linux executable is normally `~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender`.
- Run builder with `-b --factory-startup -P scripts/gym-tour/build_interior.py -- --output public/models/nexus-gym` (analogously exterior).
- Builders publish atomically. Keep this property. Geometry is original; no third-party house assets were copied. Reference repo: https://github.com/mattoznav/templates-bnb-website.git ; retain MIT notices if later copying substantial code, and separately verify asset licenses.
- Current exterior: 2,929,168 bytes, 17 material/primitives, 45,280 triangles.
- Current interior: 1,346,856 bytes, 19 material/primitives, 19,278 triangles.
- Combined: 4,276,024 bytes (~4.08 MiB). Provisional combined mobile model/texture target: 5 MiB. Images are embedded; no external Draco decoder currently required.
- Static mirrors/sky textures exist, but final baked lighting has NOT been implemented. Source logo stays unchanged; builders optimize embedded versions.
- Do not reintroduce the near-camera ceiling crossbeam at interior Z=-2.5: it hid equipment. Rear/perimeter structure remains.

## Original Phase 5 scope (implementation notes in phase5.md; measurements deferred)

1. Capture comparable baseline screenshots and loading/scroll performance before edits. Record hardware, native versus software rendering, viewport/DPR, cache/network and dev versus production conditions.
2. Improve contact shading, depth, lighting balance and material readability. Prefer reproducible offline AO/light baking where useful; document what was actually baked. Polish static/selective reflections without an unbounded realtime mirror cost. Preserve equipment, branding and all tour features.
3. Optimize textures/materials/draw calls and asset delivery within budgets. Evaluate compression only with compatible loaders, recovery and measured tradeoffs. Keep the procedural fallbacks and reliable ready/retry behavior.
4. Preserve intro scheduling, one demand canvas, zero settled idle draws, hidden/offscreen stopping, shared-cache ownership and context-loss handling. Measure p50/p95/p99 frame times/long tasks during real scroll as well as load and idle behavior. Do not equate a viewport screenshot with mobile performance.
5. Compare desktop/tablet/mobile captures, get independent visual review according to the available frontend skill, and fix issues before completion.
6. Store actual evidence under `artifacts/gym-tour/phase5/` and write `docs/gym-tour/phase5.md`. Record limitations and exact commands/results.

## Original Phase 6 QA scope (deferred by user; polish notes in phase6.md)

Test the full intro -> hero -> About journey, all four stops in both directions, navbar bypass/Home, trial CTA and close/Escape, touch/native scroll, keyboard/focus/inert unlock, mobile menu, resize/orientation, portrait/short landscape and desktop/tablet framing. Check reduced motion, failed/slow assets, real WebGL context loss and retry, tab reactivation, repeated navigation/replay and resource behavior. Verify downstream sections remain functional. Run TypeScript, relevant tests and a production build, then document remaining device/browser limitations. Physical Android/iOS Safari testing is still needed; emulation does not certify them. Publishing/deploying is a separate user decision.

## Existing verification tools

```bash
npx tsc --noEmit
node scripts/gym-tour/test-tour.cjs
node scripts/gym-tour/verify-exterior-model.cjs
node scripts/gym-tour/verify-interior-model.cjs
node scripts/gym-tour/verify-exterior-browser.cjs
INTERIOR_TEST_MODE=views node scripts/gym-tour/verify-interior-browser.cjs
INTERIOR_TEST_MODE=failure node scripts/gym-tour/verify-interior-browser.cjs
TOUR_TEST_OUTPUT=artifacts/gym-tour/phase5 EXPECT_DETAILED_EXTERIOR=1 EXPECT_DETAILED_INTERIOR=1 node scripts/gym-tour/verify-mobile-touch.cjs
TOUR_TEST_OUTPUT=artifacts/gym-tour/phase5 TOUR_REPORT_LABEL=final EXPECT_DETAILED_EXTERIOR=1 EXPECT_DETAILED_INTERIOR=1 node scripts/gym-tour/verify-tour-browser.cjs
```

Some model/interior/exterior verifiers have historical fixed Phase 3/4 output paths; make them configurable before retaining new-phase evidence so old evidence is not mislabeled or overwritten. Inspect scripts for current environment options.

Browser CLI: keep session and launch flags identical across commands or it can restart to about:blank. Run native headed checks sequentially: occluded tabs can become hidden and intentionally defer model loading. Touch verifier uses Playwright with SwiftShader and a real Chromium touch context; it is emulation. Wait for fonts/layout/assets/camera settling before screenshots. Modal tests must support `[role=dialog] #trial-enquiry-form`. Wait for scrolling to settle before asserting a CTA.

Use separate production build output/source snapshot if a development server is running; do not corrupt its cache. Existing Next config separates `.next-dev` and `.next`. Do not treat an interrupted exit143 run as passing. The historical build is evidence for its source snapshot only, not proof that future edits pass.

## Suggested instruction to the next AI

Read `docs/gym-tour/phase5.md` and `phase6.md` before making further edits. Phase 5/6 source changes are delivered with testing explicitly skipped at the user's request. Preserve that preference unless the user authorizes validation. If validation is later requested, use the original QA scope above and write fresh evidence into the correct phase output directories. Do not present historical Phase 4 evidence as proof for these changes. Do not replace the punching-bag intro, redesign later sections or claim unmeasured smoothness.
