# Entrance images

Generated with the built-in `image_gen` tool. The supplied reference guided the scene composition and black/crimson lighting. The existing logo, live 3D bag, and editable typography are kept separate from generated assets.

Current rendering: only the clean bottom 19% of the background image supplies the reflective floor. The photographed smoke is excluded. Walls, practical strip lights, and the animated volumetric smoke are now generated in code. The transparent equipment cutouts are retained.

## Background prompt

Use case: photorealistic-natural. Asset type: ultra-wide 16:9 website entrance BACKGROUND PLATE for a premium black and red fitness club. Create a photorealistic cinematic empty dark gym stage photographed from a low straight-on camera. The upper 70 percent is almost black negative space, no wall details, no objects in the center because a live interactive punching bag and large typography will be composited there. Bottom 28 percent: real charcoal rubber gym tiles with subtle seams, worn slightly wet reflective texture, rich realistic crimson light reflections pooling at center, darkening at the corners. Beautiful volumetric RED smoke hugs the ground from left to right around the center, wispy delicate curls backlit by powerful crimson practical lights from behind; black space above remains clean. At extreme left and right edges ONLY, a tall black steel gym upright with vertical red LED tube set into it, leaning in very slightly with perspective. Soft scarlet light shafts at upper left. Premium high contrast cinematography, real optical bloom, detailed photograph, believable light scattering and floor reflections, gritty luxury gym commercial. Color palette jet black, gunmetal and saturated crimson red, no orange. ABSOLUTELY NO text, no logos, no lettering, no bag, no chains, no weights, no people, no circles, no HUD rings. This is only the empty background stage.

Output: `public/assets/entrance/red-gym-stage.webp`.

## Dumbbells prompt

Use case: product-mockup. Asset type: photorealistic gym equipment foreground cutout for compositing into the BOTTOM LEFT corner of a black and crimson cinematic gym website. A closely grouped pair of heavy black round rubber dumbbells, seen extremely close from a low front three-quarter angle. Foreground dumbbell diagonal toward the lower right, second dumbbell slightly behind to the left. Real rubber round weight plates, concentric beveled edges, dark knurled steel handles, subtle scuffs and believable premium material texture. Strong soft silver highlights from upper left, vivid crimson RED rim light along RIGHT edges, deep black shadows. Entire objects visible with generous small padding, no cropping. Composition compact and wide, approximately landscape 3:2. True transparent alpha background, isolated objects ONLY, no floor, no background, no opaque shadows, no smoke, no text, no labels, no logos, no watermarks. Studio product photography, not illustration.

Output: `public/assets/entrance/dumbbells-cutout.webp`. Generated with `transparent_background: true`; alpha retained during WebP optimization.

## Kettlebell and gloves prompt

Use case: product-mockup. Asset type: photorealistic gym gear foreground cutout to composite into BOTTOM RIGHT corner of a black and crimson premium gym website. A compact carefully composed still life: one heavy black cast iron kettlebell at the back right, its smooth arched black steel handle clearly visible; a pair of black leather training boxing gloves with deep red wrist straps lying together in front, oriented diagonally toward the bottom right. Entire grouped objects visible, no cropping, slight breathing room. Real pebbled leather with fine stitches and mild wear, real textured cast iron, dark realistic materials. Soft silver highlights from upper left and intense crimson RED rim lighting from LEFT and rear edges, with rich deep shadows. Low camera angle, authentic luxury gym commercial product photography. True transparent alpha background, no scene background, no floor, no opaque ground shadows, no text, no letters, no numbers, no branding, no logos, no watermark. Compact landscape 3:2 composition, objects only.

Output: `public/assets/entrance/kettlebell-gloves-cutout.webp`. Generated with `transparent_background: true`; alpha retained during WebP optimization.
