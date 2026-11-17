# Generated campaign photography

All six assets were generated using the **built-in image_gen tool**, not the API/CLI fallback. They are fictional illustrative campaign visuals. They are not photographs of Nexus Fitness Club, its premises, members or trainers.

The official project logo is **not generated**. `AboutGymVisual.tsx` places the unchanged `public/assets/nexus-logo.png` over the empty rear wall, matching its mild perspective and lighting with CSS. The source photograph contains no signage. The full design reference is never used as a background or program photograph.

| Asset | Original saved here | Optimized website asset |
| --- | --- | --- |
| About interior | `about-gym-original.png` | `public/assets/photography/about-gym.webp` |
| Strength | `program-strength-original.png` | `public/assets/photography/program-strength.webp` |
| Muscle building | `program-muscle-original.png` | `public/assets/photography/program-muscle.webp` |
| Cardio | `program-cardio-original.png` | `public/assets/photography/program-cardio.webp` |
| Functional | `program-functional-original.png` | `public/assets/photography/program-functional.webp` |
| Personal training | `program-personal-original.png` | `public/assets/photography/program-personal.webp` |

Run `npm run assets:optimize` to rebuild delivery assets from these preserved originals. Sharp is a development dependency; it is not shipped to the browser. The six WebP files total approximately 550 KiB. Below-fold photography is lazy-loaded. The images can be replaced with genuine club photography without changing the components.

## Final prompt set

About prompt:

> Use case: photorealistic-natural. Create one premium cinematic gym interior photograph for a fitness website's About section, landscape 3:2 composition. Modern upscale strength gym with charcoal concrete walls, matte black equipment, dumbbell racks, professional adjustable benches, dark rubber floor with natural reflections, industrial black ceiling and restrained crimson LED strips. Wide-angle architectural photography, realistic buildable equipment, carefully controlled shadow detail, black and crimson palette. Empty gym, no people. IMPORTANT composition: a large blank flat dark-concrete rear wall panel occupies the upper middle-right of the image, approximately x=48%-78%, y=25%-43%, nearly frontal with only very slight perspective; leave this wall clear for a separate real logo overlay. Racks below that panel, benches in the foreground, depth to the right. No lettering, no logos, no signage, no watermark. This is an illustrative fictional interior, not an actual business photograph. Deliver a standalone photograph, no webpage, no cards, no collage.

Each program prompt used this exact shared prefix followed by its subject:

> Use case: photorealistic-natural. Create one standalone portrait 2:3 premium gym campaign photograph, no webpage or collage. Dark upscale strength gym, black and charcoal palette, restrained crimson LED rim lighting and soft white key light. Preserve real material and skin texture, realistic equipment and anatomy. No text, brand marks, logos or watermarks. Leave upper margin for a separate HTML title.

- **Strength:** Subject: low-angle close view of a heavy black barbell with stacked cast-iron weight plates, sharply focused plates and knurled steel bar, professional racks softly visible behind. No people.
- **Muscle:** Subject: an adult muscular male athlete wearing a plain black sleeveless shirt performing a controlled single dumbbell curl. Three-quarter waist-up centered framing, head upper third, dumbbell clearly visible lower-middle. Believable hands gripping the weight, natural effort and safe form.
- **Cardio:** Subject: a cinematic row of modern black treadmills in an upscale cardio room. Clear foreground running belt, handles and console, strong perspective leading into depth, dark industrial ceiling and restrained red LED accents. No people.
- **Functional:** Subject: a heavy textured matte black kettlebell with thick braided battle ropes coiled and trailing through a functional-training area. Sharp cast-iron and nylon details, black rubber flooring, depth and realistic equipment scale. No people.
- **Personal:** Subject: an adult male personal trainer wearing plain charcoal activewear attentively coaching an adult female member in a plain black athletic outfit during a controlled dumbbell exercise. Respectful professional coaching, distinct people, safe believable hands and exercise posture, three-quarter composition.
