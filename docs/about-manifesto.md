# About 3D studio redesign

Current design replaces the photo collage with an original Three.js weight sculpture over a circular plinth. It shares the gym tour's warm/cool lighting colors and intensities, local PMREM reflection helper, charcoal materials and crimson accents. The heading now follows the tour's bold italic typography.

Scroll changes the assembly angle and plate spacing. Pointer position adds a small tilt. The three HTML accordion rows change the accent illumination and visible scene caption. On reduced motion, scroll/pointer motion is disabled. A faint photographic backdrop remains behind the decorative canvas. Existing trial button, section/title anchors, panel messages and downstream navigation tracking remain.

The scene loads once the section intersects the viewport, uses demand rendering, limits DPR to 1.25, and guards manual rendering while hidden/offscreen/context-lost. On context loss the canvas is hidden and content remains usable. Error boundaries preserve HTML content if decorative rendering fails. No external models or HDR assets were added. No source was copied from the previously cloned BnB repository.

Policy: compact planning, dependency-level reconnaissance, no delegation. Scope: About component, local CSS, original scene and documentation. Runtime route returned HTTP 200 after implementation. Test suites, visual/browser QA and performance profiling remain skipped according to the user's earlier instruction. Smoothness/device support is unverified.
