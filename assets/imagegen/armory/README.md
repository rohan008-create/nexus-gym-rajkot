# The Nexus Armory image assets

Three distinct illustrative equipment images were created using the **built-in image_gen tool**, not the CLI/API fallback. No website screenshots, previous reference images, people, fake Nexus logos or watermarks were used. These are studio concept visuals, not proof of the club's installed equipment inventory.

| Original, preserved in this folder | Website delivery asset |
| --- | --- |
| `barbell-original.png` | `public/assets/armory/barbell.webp` |
| `treadmill-original.png` | `public/assets/armory/treadmill.webp` |
| `cable-machine-original.png` | `public/assets/armory/cable-machine.webp` |

All three optimized assets are approximately 1600 × 900. Together they total about 253 KiB. `npm run assets:optimize` rebuilds them from the preserved originals. Replace these with verified equipment photography whenever available; no component changes are needed.

## Final prompt set

Each image used this shared prompt prefix followed by its specific subject:

> Use case: photorealistic-natural. One standalone premium commercial equipment product photograph, wide landscape 16:9 framing. Deep black studio and matte charcoal floor, restrained atmospheric haze, realistic contact shadows. Soft overhead white key light from upper left and controlled crimson rim lighting from right and behind. High-end industrial product-launch photography, physically believable construction, sharp material detail in rubber and metal, black/red cinematic color grading. No people, no text, no signage, no logos, no watermarks. Keep the full equipment recognizable with generous black breathing room. Not a website or poster.

- **Barbell:** Subject: a heavy professional Olympic barbell loaded with several large black weight plates at both ends. Premium steel bar with realistic knurling, dark rubber plates, dramatic diagonal three-quarter low angle composition. Barbell centered and visually dominant, not cut off at the plate edges.
- **Treadmill:** Subject: a premium full-sized commercial treadmill, three-quarter side angle. Black metal frame, detailed realistic console and support arms, visible textured running belt, recognizably correct proportions. Full treadmill centered, no cropped front or rear.
- **Cable machine:** Subject: a premium professional dual-pulley cable crossover machine. Full black metal structure, realistic separate weight stacks, visible pulley wheels and tensioned cables, two hanging cable handles, credible mechanical connections. Slight three-quarter perspective with a balanced symmetrical machine, complete top beam and floor bases visible. No disconnected cables or impossible construction.
