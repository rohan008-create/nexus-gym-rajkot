# Phase 1 results

Scope: preparation only. This task adds files under `docs/gym-tour`, `scripts/gym-tour` and `artifacts/gym-tour/phase1`. It does not replace the production hero or edit the navbar, punching-bag intro or downstream application sections. Other optimization work was modifying the shared workspace during capture; no clean-worktree or global no-regression claim is made.

## Tooling evidence

- Official Blender 4.5.9 LTS Linux x64 archive downloaded and checked against its published SHA256: `dcdc3eca6c9825bb35a8033b689c053f3cb5a9b0cd2a61b2eac2a49436b4ad3d`.
- Portable installation: `~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender`. No sudo or PATH change.
- Headless Cycles CPU render completed at 480×320, eight samples. Default Cycles device enumeration listed Intel Core i5-6500 CPU; other GPU compute backends were not exhaustively audited.
- Exported uncompressed GLB: 14,264 bytes, nine meshes, 108 triangles.
- Browser loaded and rendered that GLB using the installed Three.js revision 169; renderer reported ANGLE / Mesa Intel HD Graphics 530. Nine draw calls observed for this tiny test scene.
- This demonstrates the render/export/current-loader pipeline. It does not certify final gym realism, baked-lighting export, compression, or full-tour performance.

Evidence: [tooling.json](../../artifacts/gym-tour/phase1/tooling.json), [browser-smoke.json](../../artifacts/gym-tour/phase1/browser-smoke.json), [Blender render](../../artifacts/gym-tour/phase1/smoke-render.png), [browser render](../../artifacts/gym-tour/phase1/smoke-browser.png), [GLB](../../artifacts/gym-tour/phase1/smoke.glb).

## Prepared design and integration

Three non-overlapping concept zones (reception, strength, cardio), an approximate first-floor shell and right-hand staircase are documented in [layout.json](layout.json). The existing `nexus-real-building.webp` was visually inspected and matches the supplied Nexus building from a different angle. Dimensions remain assumptions.

Eight camera stops are defined: four for desktop and four for mobile. Numeric/schema checks passed; framing and doorway traversal await Phase 2's visual prototype. The asset manifest explicitly identifies equipment/materials that are not yet selected or downloaded.

The integration plan preserves the existing single Lenis owner, intro readiness/entry/focus contracts, navbar, trial callback and all later sections. About/Programs animation duties must be retained when isolating the old combined hero controller. Reference dependencies will not be copied into the React 18 / R3F 8 application.

## Baseline conditions

A source snapshot was served on temporary port 3002 with a separate Next.js development cache. This avoids source changes and repeated server termination by concurrent builds in the shared workspace. Public assets and installed dependencies were shared. [source-snapshot.json](../../artifacts/gym-tour/phase1/source-snapshot.json) identifies the captured source.

Measurements are short idle RAF/long-task samples in headed desktop Chrome, with viewport emulation and shared caches. Background build/setup work occurred during the task. These are baseline observations, not controlled production benchmarks or physical-phone certification. Cold-cache loading, explosion/drag profiling and per-frame production draw-call/triangle counts were not certified. Raw screenshots and a desktop trace are under ignored `qa/gym-tour-phase1/baseline/`. The trace is from an earlier snapshot capture, not the same interval as the final four responsive idle samples.

## Recorded responsive observations

| Viewport | Size | Idle p50 | Idle p95 | Idle p99 | Hero ready / overflow |
| --- | --- | --- | --- | --- | --- |
| desktop | 1440×900 | 16.7 ms | 33.3 ms | 33.4 ms | ready / False |
| wide-desktop | 1920×1080 | 16.7 ms | 33.4 ms | 41.0 ms | ready / False |
| tablet | 768×1024 | 16.7 ms | 33.3 ms | 33.4 ms | ready / False |
| mobile | 390×844 | 16.7 ms | 33.4 ms | 49.9 ms | ready / False |

All four hero scenes reported ready, no horizontal overflow was observed, and the final sweep recorded no uncaught browser errors. Mobile here means the 390×844 CSS viewport: observed DPR was 1 and coarse-pointer detection was false. Touch-device emulation, iOS Safari and physical-phone GPU performance were not verified.

The baseline includes a failed existing interaction observation: the wide-desktop hero trial button did not open its dialog within the timeout. Other sizes opened/closed the dialog. This task records that result without changing unrelated behavior; do not report all functional checks passed. Location currently navigates to About, and its active label can become About; preserve/document that existing contract unless explicitly changing it later.

The separate intro observation confirmed skip unlocked the landing and focused `hero-title`, but intro scene readiness timed out. Normal bag punching/explosion is therefore not certified by this Phase 1 capture. The initial live workspace also briefly showed an import/export mismatch while external optimization was changing the intro; this was not edited by this task.

The final responsive sweep completed without capture-infrastructure errors. Collection success is separate from the failed application interaction above. [baseline.json](../../artifacts/gym-tour/phase1/baseline.json) includes all observations, checks and limitations. [Desktop baseline](../../artifacts/gym-tour/phase1/desktop-hero.png) and [mobile viewport baseline](../../artifacts/gym-tour/phase1/mobile-hero.png) are retained; full About/Programs captures and the trace remain under `qa/`.

## Remaining phase boundaries

Phase 1 does not deliver the final gym GLB, approved camera framing, realistic equipment, final lighting bake, compressed mobile/desktop exports or a production hero replacement. Those belong to the following phases. The tiny bench/rack model is solely a pipeline smoke test.

The next implementation milestone is the Phase 2 geometry prototype inside the hero boundary, with separate desktop/mobile framing and preservation of the existing intro/navbar/downstream sections. Before claiming smoothness, repeat measurements on a quiet system and a physical mobile device, and test the complete interaction matrix in the README.
