# Phase 4 — detailed concept gym interior

The strength and cardio views now load an original Blender-built interior instead of the simple equipment prototype. Preview http://localhost:3000/hero and choose views 03/04, or enter through the existing homepage intro.

## Delivered

- Rack columns, adjustment holes/J-hooks, barbells, collars and stacked plate storage.
- Separate upholstered bench pads, supports and feet; varied hex dumbbells and storage racks.
- Five treadmills with belts, rollers, consoles, screens and handles, plus a recognizable spin bike with flywheel, saddle, cranks and pedals.
- Rubber tile floor, aisle markings, wall/baseboard depth and static mirror treatment.
- Official Nexus branding, LED fixtures, reception desk, towel storage and water bottles.
- The near-camera ceiling cross-span was removed after visual review because it obscured rack heads and cardio consoles. Rear/perimeter lighting structure remains.

This is an original concept interior, as authorized, not a scan or claim about the real gym's exact interior layout. Final contact lighting/baking and reflection polish remain later work. Mirrors use a static treatment rather than full-scene realtime reflections.

## Model and loading

`interior.glb` is **1,346,856 bytes**, with **19 materials/primitives**, **19,278 triangles** and **four embedded images**. Exterior plus interior total **4,276,024 bytes (about4.08MiB)**, below the provisional5MiB combined model target. No third-party equipment downloads were used. The official logo is optimized offline inside the model; the source logo file is unmodified.

`DetailedInterior.tsx` waits until the hero is interactive, then starts the optional load after350ms. This avoids parsing the interior during punching-bag impact. A single asset promise is cached; mounted scene clones share immutable source resources without disposing the shared cache. Successful loading invalidates the demand renderer once. The previous procedural interior stays usable during loading/failure, and the whole hero remains ready.

The canvas exposes hidden `data-interior-source=detailed/fallback` for deterministic QA. This is not displayed in the product UI. The exterior model, exterior loader, cameras and renderer safeguards were retained.

## Rebuild

```bash
~/.cache/nexus-gym/tooling/blender-4.5.9-linux-x64/blender \
  -b --factory-startup -P scripts/gym-tour/build_interior.py \
  -- --output public/models/nexus-gym
node scripts/gym-tour/verify-interior-model.cjs
```

The builder generates original geometry/textures, merges by material, embeds its images and publishes GLB/metadata atomically. Refresh the browser after rebuilding to replace its cached scene.

## Verification

```bash
node scripts/gym-tour/verify-interior-model.cjs
node scripts/gym-tour/test-tour.cjs
npx tsc --noEmit
AGENT_BROWSER_DEFAULT_TIMEOUT=30000 INTERIOR_TEST_MODE=views \
  node scripts/gym-tour/verify-interior-browser.cjs
AGENT_BROWSER_DEFAULT_TIMEOUT=30000 INTERIOR_TEST_MODE=failure \
  node scripts/gym-tour/verify-interior-browser.cjs
TOUR_TEST_OUTPUT=artifacts/gym-tour/phase4 \
  EXPECT_DETAILED_EXTERIOR=1 EXPECT_DETAILED_INTERIOR=1 \
  node scripts/gym-tour/verify-mobile-touch.cjs
```

The interior browser checks cover desktop/mobile strength/cardio shots, return to the detailed exterior, deliberately blocked interior download, attempted request under interception, ready fallback, usable trial CTA and reload recovery. Touch tests use a true Chromium touch context with coarse pointer/DPR3, all four stops, 44×44 targets, native touch scrolling and menu/trial interaction. These are emulation checks, not physical-phone/iOS Safari performance certification.

Independent visual review passed the updated desktop/tablet/mobile compositions after the ceiling fix. Lighting/reflection polish and tighter tablet framing remain nonblocking refinements. The evaluator could not confirm the trial CTA using an obsolete native-dialog selector; separate functional tests use the current dialog role/enquiry form.

## Scope and concurrent work

This task adds `build_interior.py`, `interior.glb`/metadata and `DetailedInterior.tsx`, and replaces only the interior branch in `GymTourCanvas.tsx`. Exterior bytes are checked against the start-of-task hash. Existing interior fallback geometry, camera configuration, intro/navbar and downstream sections were not edited by this task.

Other work changed several application files during a long interruption, including the trial dialog's conversion to a custom animated modal. Those changes were not overwritten. Tests were adapted to support both the old native dialog and the current semantic dialog/form. `source-scope.json` distinguishes task-owned edits from observed concurrent changes; no whole-worktree immutability claim is made.

Final segmented verification contains **36 passing browser checks**; the tablet trial CTA also passed with the current animated modal. TypeScript, model budgets, camera/geometry regressions and the isolated production build completed successfully (exit0).

Final evidence and before/after screenshots are under `artifacts/gym-tour/phase4/`; `verification.json` lists the completed test inputs. Production build validation uses a separate source/output snapshot so running build caches are not replaced.

[Desktop strength](../../artifacts/gym-tour/phase4/desktop-strength.png) · [Desktop cardio](../../artifacts/gym-tour/phase4/desktop-cardio.png) · [Mobile interior](../../artifacts/gym-tour/phase4/mobile-touch-interior.png)
