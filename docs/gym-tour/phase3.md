# Phase 3 — detailed Nexus exterior

The exterior and entrance views now load an original Blender-built model based on the supplied Nexus building photograph. Preview at http://localhost:3000/hero; the normal homepage still enters through the punching-bag intro.

## Delivered

- Layered charcoal gym frontage, panel seams and recessed blue glazing.
- Actual project Nexus wordmark and entry emblem, embedded in the model.
- Cream upper floors with window recesses, sills, central vertical bay and roof coping/housing.
- Connected external stair treads, stringers, landing, continuous handrails and posts.
- AC grilles/brackets, drainage/service details, tiled forecourt, curb and restrained parking marks.
- Original plaster, paving and soft reflected-sky textures generated offline, rather than pixel-generation work during browser rendering.

The model is **2,929,168 bytes (2.79 MiB)**, with **17 materials/primitives**, **45,280 triangles** and **four embedded images**. It is self-contained: no external model textures or third-party asset downloads are required. Geometry/materials are merged into bounded groups.

Dimensions are inferred from photographs, not a measured survey. The reflected sky is a static texture; final lighting baking/contact-lighting refinement remains a later phase. This is a more detailed architectural model, not a photographic scan.

## Runtime behavior and scope

`DetailedExterior.tsx` loads `/models/nexus-gym/exterior.glb` asynchronously. A single fixed-asset promise is cached; each mount clones the scene graph while sharing immutable geometry/materials. Individual mounts do not dispose shared cached resources. The successful swap invalidates the demand renderer.

While loading or after an optional download/parse failure, the existing procedural exterior remains usable. That failure does not reach the whole-scene boundary or block intro entry, scrolling or trial enquiries. A full reload can load the detailed asset after the network recovers. The hidden canvas `data-exterior-source` attribute identifies the active detailed/fallback branch for QA.

Existing application edits are limited to the exterior branch of `GymTourCanvas.tsx` and a small post-commit entry-focus handoff in `GymTourHero.tsx`; the loader is a new component. The interior geometry, camera tracks, guarded renderer lifecycle, hero UI, intro, navbar and downstream sections were retained. `source-scope.json` records the comparison. Browser diagnostics found the old one-shot Page RAF could leave focus on BODY after reveal despite a present heading/non-inert landing. The hero now restores heading focus once after the active commit, only inside the revealed homepage and only when focus is still BODY/already heading. It does not run during scrolling, steal dialog/control focus or affect standalone `/hero`; Page/intro/navbar source was not changed.

## Rebuild

```bash
~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender \
  -b --factory-startup -P scripts/gym-tour/build_exterior.py \
  -- --output public/models/nexus-gym
node scripts/gym-tour/verify-exterior-model.cjs
```

The builder generates original geometry/material textures and embeds the existing `public/assets/nexus-logo.png`. It exports into temporary files and atomically replaces the final GLB/metadata only after successful export, so a browser cannot download a partially overwritten model during a rebuild. Refresh the preview after rebuilding to replace the browser's cached model.

Files:
- `scripts/gym-tour/build_exterior.py`
- `public/models/nexus-gym/exterior.glb`
- `public/models/nexus-gym/exterior.json`
- `src/components/hero/gym-tour/DetailedExterior.tsx`
- Exterior integration in `src/components/hero/gym-tour/GymTourCanvas.tsx`

## Verification

```bash
node scripts/gym-tour/verify-exterior-model.cjs
node scripts/gym-tour/test-tour.cjs
npx tsc --noEmit
AGENT_BROWSER_DEFAULT_TIMEOUT=60000 node scripts/gym-tour/verify-exterior-browser.cjs
TOUR_TEST_OUTPUT=artifacts/gym-tour/phase3 EXPECT_DETAILED_EXTERIOR=1 \
  node scripts/gym-tour/verify-mobile-touch.cjs
```

The exterior browser test waits for the actual detailed asset, captures desktop/mobile exterior and entrance views, blocks the GLB request deliberately, checks the procedural fallback and trial CTA, then verifies restoration after reload. Existing tour browser checks can be directed to Phase 3 evidence with `TOUR_TEST_OUTPUT=artifacts/gym-tour/phase3`.

Model/container/embedded-image/geometry-budget checks, TypeScript and the camera/geometry regression tests passed. Production compilation/static generation passed in a separate `/tmp/nexus-phase3-build` snapshot, with a separate output directory and two workers, keeping running build caches intact.

An independent visual review passed desktop/tablet/mobile appearance, official branding, facade depth and stair continuity, with the original strength interior retained. That review used software rendering. Nonblocking future refinements include final glass/contact-lighting realism and a wider tablet establishing crop.

Final segmented verification contains **32 passing browser checks** across model loading/failure, desktop tour regression, true touch emulation and entry/reduced-motion/settled-context-loss behavior. See `artifacts/gym-tour/phase3/verification.json` and its named input reports. An early native-driver diagnostic appeared when loss was injected during renderer startup; the final context-loss test explicitly waits for the detailed asset and shader initialization to settle. Cold-start driver failure behavior is not certified.

Browser evidence and selected before/after screenshots are under `artifacts/gym-tour/phase3/`. Chromium touch emulation verifies touch points, coarse pointer, DPR3, all four stop taps, 44×44 targets, trial/menu navigation, native touch scrolling and interior access. This does not certify physical-phone/iOS Safari performance or guarantee FPS.

[Desktop exterior](../../artifacts/gym-tour/phase3/desktop-exterior.png) · [Entrance](../../artifacts/gym-tour/phase3/desktop-entrance.png) · [Mobile exterior](../../artifacts/gym-tour/phase3/mobile-touch-exterior.png)

The next phase remains detailed interior/equipment work. Existing interior geometry was deliberately retained in this phase.
