# NEXUS FITNESS CLUB — Cinematic 3D Punching Bag Tear Intro (Phase 1 Prompt)

> **Target Tool:** Google AI Studio (Gemini 1.5 Pro / Gemini 2.0)  
> **Frameworks:** React + TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP, Tailwind CSS  
> **Input Assets to Attach in AI Studio:**  
> 1. Official Logo: `Nexus Fitness Club Logo.png`  
> 2. 3-Stage Reference Image: `Hanging Bag -> Crack -> Tear`

---

```markdown
You are an expert Creative Technologist, Three.js Engineer, React Developer, and 3D Animation Specialist.

## Objective

Create a premium, ultra-realistic, full-screen 3D website intro animation for **NEXUS FITNESS CLUB**.

**IMPORTANT: Build ONLY the intro animation. Do NOT build the Hero Section, Navbar, or any other website sections.**

I will provide two reference images:
1. The official NEXUS FITNESS CLUB logo.
2. A three-stage visual reference showing the hanging punching bag, center crack, and final tear animation.

Use the reference images as the primary visual direction.

## Visual Design

- Full viewport black background (#000000).
- One realistic black leather punching bag suspended from the top by metallic chains.
- The bag must be centered horizontally and positioned slightly deeper inside the 3D scene, not extremely close to the camera.
- Maintain generous negative space around the bag.
- Display the official NEXUS FITNESS CLUB logo on the front surface of the bag.
- Add a thin glowing red vertical line behind the bag.
- Optional extremely subtle red rim lighting.
- Realistic leather material, stitching, folds, metallic chain reflections, and soft shadows.
- No gym interior, humans, gloves, equipment, additional text, or decorative UI.

## Animation Sequence

### Stage 1 — Suspended Bag (0–1 second)

- Show the punching bag hanging naturally from chains.
- The bag should have a very subtle, realistic idle sway.
- Keep the logo clearly visible.
- The background stays pure black.
- The thin red light glows softly behind the bag.

### Stage 2 — Automatic Center Tear (1–1.6 seconds)

- Exactly after 1 second, automatically begin the tear animation.
- No click, tap, keyboard input, or punching interaction required.
- A thin red glowing crack begins at the top center of the bag.
- The crack travels downward through the leather.
- The leather deforms naturally around the tear.
- Show irregular ripped edges, subtle fibers, and realistic material separation.
- Avoid excessive explosions, camera shake, or blinding flashes.

### Stage 3 — Bag Opens (1.6–3 seconds)

- The bag gradually tears into two major halves.
- The left half peels toward the left and the right half peels toward the right.
- The motion should resemble a heavy leather curtain being torn open.
- Maintain believable chain attachment and physical weight.
- Add subtle red particles and minimal atmospheric haze.
- The center gap gradually widens.
- Reveal only the black background and thin red light behind the bag.
- Keep the final torn pieces visible briefly before smoothly moving them out of view.

## Critical Animation Requirements

- The tear must look like actual leather ripping, not two clean cylinder halves simply separating.
- Prefer a pre-fractured 3D mesh with irregular tear geometry.
- If no external model is available, create custom geometry with believable torn edges and thickness.
- Use GSAP for carefully synchronized animation.
- Use React Three Fiber and Three.js for real 3D rendering.
- Ensure smooth animation with proper easing.
- Avoid fake CSS-only 3D effects.
- Never display a boxing glove or simulate a punch.

## Technical Stack

- React + TypeScript
- Tailwind CSS
- Three.js
- @react-three/fiber
- @react-three/drei
- GSAP

## Performance

- Responsive across desktop, tablet, and mobile.
- Preserve the same centered composition on different screen sizes.
- Reduce particle count and rendering complexity on mobile.
- Preload necessary 3D assets.
- Respect prefers-reduced-motion.
- Prevent layout shifts.
- Clean up animation timelines and Three.js resources on unmount.

## Deliverables

Build a standalone reusable `PunchingBagIntro` component.

Separate the implementation into logical components for the 3D scene, bag geometry, tearing animation, and lighting.

The animation must run automatically once the component is ready.

Provide an `onComplete` callback for future integration with the website Hero Section, but do not implement the Hero Section now.

## Final Instructions

Focus entirely on visual realism, cinematic quality, correct scale, and a seamless automatic leather-tearing animation.

**The desired result is simple: black screen → hanging branded 3D punching bag → automatic center tear after 1 second → two leather halves open → black background remains.**

Do not add any features beyond this scope.
```
