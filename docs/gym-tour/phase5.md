# Phase 5: lighting and rendering polish

Implementation delivered 2026-11-18. The user explicitly requested skipping testing for this continuation. Runtime appearance, frame timings and performance improvements are unverified.

## Changes

- `TourLighting.tsx` generates a deterministic 512 x 512 soft-contact texture matching the equipment layout in `build_interior.py`. One transparent floor plane grounds racks, benches, dumbbell storage, treadmills, bike and reception. It uses no shadow-map pass, downloads or continuous animation. This is an artistic contact approximation, **not ray-traced AO or a Blender light bake**.
- A local Three.js RoomEnvironment supplies a prefiltered reflection map once per canvas mount. Preparation starts after 700 ms of active hero time, separate from the intro impact. It is shared by scene materials; no live mirror render loop or external HDR asset is added. The original static mirror/glass treatments remain.
- Interior and exterior use separate light intensities. ACES filmic tone mapping and exposure are explicit. The interior uses less direct light and more cool fill to separate metal, upholstery and rubber.
- Interior loading still waits 350 ms after activation, then requests an idle slot with a 1200 ms timeout where supported. This schedules the optional request; it does not make GLB parsing asynchronous or guarantee absence of main-thread stalls.
- Hidden tabs skip draws. Once initial readiness has been announced, inactive/offscreen scenes skip queued draws too. Reactivation still invalidates and snaps the camera through the existing lifecycle. Demand rendering, camera/FOV settling and context-loss handling remain.
- Reflection targets and owned contact-shading geometry/material/texture have teardown disposal. Shared GLB resources retain their existing cache ownership.
- Historical model/browser verifiers accept `TOUR_TEST_OUTPUT`; model reports use distinct interior/exterior names when overridden, avoiding overwrites of Phase 3/4 evidence.

## Asset decision

The GLBs and their reproducible Blender builders are unchanged. Historical combined size is 4,276,024 bytes, already below the provisional 5 MiB mobile transfer budget. No decoder dependency, model compression or asset regeneration was introduced without measurements to justify that tradeoff. The new shading texture is generated in memory, not transferred; the reflection map consumes additional GPU memory and adds a one-time preparation cost. Actual memory, draw calls and timing have not been profiled.

## Verification status

No browser captures, device checks, performance baselines, p50/p95/p99 samples, test suite, typecheck or production build were run, per the user's request to skip testing. Historical Phase 4 results do not validate these edits. No FPS, photorealism, native mobile performance or release-readiness claim is made.

See `artifacts/gym-tour/phase5/implementation-status.json` for the explicit unverified status and `phase6.md` for interaction/responsive changes.
