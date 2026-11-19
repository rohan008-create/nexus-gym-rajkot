# Nexus gym tour

Next AI: [continuation handoff](continue-handoff.md). Phases 1-4 complete. [Phase 5 implementation](phase5.md) and [Phase 6 polish](phase6.md) delivered; testing and measured performance were explicitly deferred by the user, so final QA and release readiness remain unverified.

Current interior: [Phase 4 detailed gym](phase4.md). Exterior: [Phase 3 detailed model](phase3.md). Phase 2 implementation: [working hero tour](phase2.md). Phase 1 evidence below remains a historical preparation baseline.

Phase 1 prepares the asset pipeline and integration specification. It does not replace the live hero. The working scroll-tour prototype belongs to Phase 2; realistic facade, detailed equipment and baked final lighting follow later.

## Design contract

- Replace only the visual experience inside `#home`, after the existing punching-bag intro.
- Preserve Navbar, trial dialog, About, Programs and every later section, including navigation and animations.
- Exterior resembles the supplied Nexus photo. Dimensions are estimated; the interior is an original concept, not an accurate reconstruction.
- Tour story: exterior establishing view → entrance approach → strength overview → cardio/final trial CTA.
- Desktop gets a wide view with side copy; mobile gets a separately composed portrait camera track with bottom copy and safe-area spacing.
- Native document scrolling, driven by the existing Lenis integration; hero-local sticky canvas, no wheel hijacking or separate scroll container.
- Hero finishes into the current About section. Navbar links can bypass the tour at any point. Home returns to the first beat.

## Prepared specifications

- [layout.json](layout.json): approximate shell, first-floor elevation, zones, circulation and facade details.
- [layout.svg](layout.svg): concept floor-plan diagram.
- [cameras.json](cameras.json): four desktop and four mobile camera/target stops. Coordinates are draft, not visually approved.
- [assets.json](assets.json): local asset candidates, rights/source status, future export paths and provisional budgets.
- [phase1-results.md](phase1-results.md): actual tooling/baseline results and limitations.

Coordinate convention: metres, +Y up, +X right, +Z toward the street, interior toward -Z, front facade at Z=0, gym floor at Y=4.2. Proposed footprint is 18×12 m, clear gym height 3.6 m. These are modeling assumptions. Do not treat the supplied image as a measured drawing.

The right-side external staircase is a key recognizable exterior feature. Street traffic, utility wires and adjacent shops need not be faithfully modeled. If a continuous doorway camera route clips the shell, use a brief intentional exterior/interior transition; do not fly through an opaque wall.

## Reproducible tooling

Requires Linux x64 and Python 3.11+ (tested with Python 3.12.3). Install the pinned official portable build without sudo:

```bash
python3 scripts/gym-tour/setup-blender.py
```

The installer checks a pinned SHA256 and prints the executable path. It does not change PATH or overwrite an existing installation. Default location:

```text
~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender
```

Source: https://download.blender.org/release/Blender4.5/
Version: Blender 4.5.9 LTS.
SHA256: `dcdc3eca6c9825bb35a8033b689c053f3cb5a9b0cd2a61b2eac2a49436b4ad3d`.
If an official archive is already present, use `--archive /path/to/archive.tar.xz`.

Run the intentionally small pipeline test:

```bash
~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender \
  -b --factory-startup -t 4 -P scripts/gym-tour/smoke_blender.py \
  -- --output qa/gym-tour-phase1/tooling
node scripts/gym-tour/validate-phase1.cjs
node scripts/gym-tour/verify-glb.cjs
```

This creates a simple bench/rack scene, runs an eight-sample Cycles CPU render and exports an uncompressed Y-up GLB. It verifies a pipeline, not finished realism, lighting baking, texture compression or production performance. It does not require a GPU. The browser verifier temporarily serves the exported model and this project's installed Three.js modules, checks actual loading/rendering and saves a screenshot; it adds no Next.js route or public asset. Retained small evidence files live in `artifacts/gym-tour/phase1/`; the `.blend` and raw captures live under ignored `qa/`.

## Baseline capture

Use the agent-browser CLI in a dedicated session. Start the development server separately, then:

```bash
agent-browser --session nexus-gym-phase1-baseline --headed open http://localhost:3000
AGENT_BROWSER_DEFAULT_TIMEOUT=90000 node scripts/gym-tour/capture-baseline.cjs
```

Set `BASELINE_URL`, `AB_SESSION` or `BASELINE_OUTPUT` to override defaults. `BASELINE_TRACE=0` skips generating a new trace; `BASELINE_SKIP_INTRO=1` captures only the responsive hero sweep and must be accompanied by a separately retained intro observation. Use a fresh session when changing the browser timeout. The script closes only its own browser session. It records screenshots, a desktop Chrome trace, a 2.5-second idle RAF/long-task sample per viewport, hero readiness, trial dialog and existing nav destinations. It does not alter source. Samples are development-mode observations with shared browser cache and no controlled network throttling, not cold-cache or physical-mobile benchmarks. A failed capture exits nonzero and preserves its partial report.

Baseline must be repeated after Phase 2 using comparable conditions. Inspect p50/p95/p99 and long tasks, not only average FPS. Record the renderer: software rendering results cannot be claimed as native-GPU performance.

## Integration map for Phase 2

| Existing owner | Required behavior |
| --- | --- |
| `src/app/page.tsx` | Retain intro mount/reveal/replay, inert landing, scroll unlock, `hero-title` focus and readiness timeout. A large asset must not indefinitely gate entry. |
| `src/components/hero/HeroSection.tsx` | Retain the surrounding page tree and Navbar. Replace only `#home` hero visuals. Wire the existing trial callback; keep stable heading and anchors. |
| `src/components/hero/RopeScrollController.ts` | Separate old hero-specific entrance/scroll duties from About/Programs reveal and active-nav tracking. Do not delete the whole hook. A longer hero changes document distances: retarget the About reveal to its own viewport thresholds while preserving its appearance and order. Audit non-null measurements against the new hero wrapper. |
| `src/components/layout/SmoothScroll.tsx` | Keep its single Lenis/GSAP ticker integration. Do not copy the reference's second global scroll provider. |
| Shared CSS | Keep About/Programs/global styles unchanged. Namespace tour styles beneath `.gym-tour-hero`; prevent `.rope-experience .hero-section` rules from leaking into new framing. |

Proposed new Phase 2 files under `src/components/hero/gym-tour/`:
- `GymTourHero.tsx`: HTML heading, copy, CTA, progress UI, poster and responsive wrapper.
- `GymTourCanvas.tsx`: one client-only R3F canvas, asset ownership, readiness and error handling.
- `useGymTourScroll.ts`: scoped scroll progress, cleanup, native navigation and resize behavior.
- `gymTourConfig.ts`: typed adaptation of the prepared layout/camera manifest.
- `gym-tour.css`: isolated desktop/mobile styles.

The current project uses React 18 / R3F 8 / Three r169, while the reference uses React 19 / R3F 9 / a newer Three version. Adapt source to current APIs; do not copy its dependency manifest or migrate to Astro.

Reference repository: https://github.com/mattoznav/templates-bnb-website (MIT). No reference source was copied into application code in Phase 1. If substantial source is reused later, retain its copyright and MIT license notice. Models/textures have separate rights; record each actual asset's author, source URL and license before import. No large reference asset download is required for setup.

## Performance and fallback rules

Initial asset transfer budgets: mobile ≤5 MiB, desktop ≤10 MiB for model plus referenced textures (provisional, not yet achieved). Prefer baked static lighting, shared or instanced equipment, bounded texture sizes and selective reflections. Full realtime mirrors are not the default.

Target approximately 16.7 ms steady frames on measured desktop hardware, with p95/p99 evidence. Establish the mobile target on an available physical phone; viewport emulation alone is insufficient. Stop continuous rendering when hidden/offscreen. Avoid GLB decoding and shader warmup at punching-bag impact. Preload carefully, schedule preparation in bounded work and dispose owned resources on teardown. No guaranteed FPS claim before measurement.

Reduced motion uses a readable, normal-height static overview with working CTAs, not a long empty scroll tunnel. Loading/failure/WebGL loss displays a poster and usable HTML. Preserve retry, keyboard access, heading focus, mobile safe areas and normal touch scrolling.

## Completion gates

Phase 1: captured baseline and limitations; tested Blender render/export and current-loader browser smoke test; validated layout/camera manifest; written architecture, licensing and test plan. Existing production UI remains unchanged by this task.

Phase 2: simple exterior/interior geometry with both camera tracks, hero-local scrolling and the existing intro/navbar/downstream behavior intact. Detailed realism is a later gate.

Regression matrix after integration: intro skip/punch/replay/focus; forward/reverse tour; every navbar link and mobile menu; trial dialog; About and Programs reveal; Plans/Location existing destinations; remaining section visuals; resize/orientation; reduced motion; slow/failed assets; actual WebGL loss/retry; tab reactivation; repeated navigation/replay resource cleanup. Run TypeScript/build and relevant existing tests, recording pre-existing failures separately.
