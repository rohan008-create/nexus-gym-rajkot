# Ryan arrival tour

The hero now fills the viewport without the navbar, headline overlay or old
numbered footer strip. The initial camera faces the building nearly straight on.
A small entry hint moves toward Ryan; Skip tour reaches the existing About.
Trial and Programs actions return at the end of the tour.

Ryan greets at the stair approach rather than teleporting from the upstairs
doorway. Wave plays on arrival and again on approach. Walking is sampled from
scroll distance, including reverse scroll. A two-bone leg solver places his
feet on the twenty existing treads and lowers the pelvis when needed. It restores
the original animation sample before every solve to prevent cumulative drift.
The landing joins the stairs to the front door without covering the walking lane.

The existing exterior and interior GLBs are retained. Exterior material clones
carve a world-space entrance at X 7.12–8.98, Y 4.515–6.44, Z -0.85–1.2. A separate
door opens as the camera approaches. Both rooms coexist in the scene; there is
no black shutter or camera teleport. The interior is raised 0.31m to meet the
existing top landing at Y 4.51. These remain inferred dimensions, not a survey.

The source Ryan asset is unchanged. `prepare-ryan.cjs` derives a 1,713,764-byte
hero model from the 40,881,436-byte user-supplied file, keeping Idle/Walk/Wave,
removing editor extras/unused animation buffers, baking the fixed facial expression, resizing textures to 512px
and preserving the hair alpha mask. See `ryan-guide-source.json` for provenance.
The avatar preview route still retains both characters and all Ryan animations.

Animation runs only while the hero is active, intersecting and the tab visible.
The animated guide necessarily invalidates demand frames while visible; the old
"zero idle draws" expectation no longer applies. Reduced motion keeps a short
static hero with HTML actions. A failed guide is optional; context loss switches
the whole hero to the existing static fallback and Retry remains available.

Verification commands:

- `node scripts/gym-tour/test-tour.cjs`: continuous camera/guide paths, stair
  dimensions, door clearance, forward/reverse convergence and fallback geometry.
- `node scripts/gym-tour/verify-arrival.cjs`: desktop/mobile, greeting, foot
  placement, stopped/reversed scroll, touch/wheel, final actions, skip,
  reduced motion, main intro focus handoff and context-loss fallback.
- `npm run build`: production compilation and TypeScript checks.

Browser evidence is saved under `artifacts/gym-tour/arrival/`. Tests use an
explicit D3D11 ANGLE backend to match the repository's Windows entrance checks.
SwiftShader was too slow for interaction timing on this host; default-backend
testing also encountered shader validation errors without a compiler message.
No physical-phone, guaranteed frame rate or measured performance claim is made.
Legacy phase-2 browser checks assert the removed navbar/stops and zero idle
draws; the arrival validator supersedes those requirements for this redesign.
