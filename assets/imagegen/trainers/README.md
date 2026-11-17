# Demo trainer campaign portraits

Three separate fictional adult portraits generated with built-in image_gen, saved as `trainer-01-original.png`, `trainer-02-original.png`, and `trainer-03-original.png`. They do not represent real Nexus staff. Every badge and the section explicitly labels the content as demo. No experience, certification, or personal identity is invented.

Run `npm run assets:trainers` to compose the six 768 × 1080 PNG card faces, three optimized portrait WebPs and the seamless horizontal strap tile in `public/assets/trainers/`. Artwork is composed programmatically with Sharp/SVG, preserving the existing official logo. The Lanyard component rotates the horizontal strap tile onto its fabric UVs. Front and back share the supplied portrait card aspect ratio.

## Final prompt set

Each portrait used the following prompt with its subject substituted:

Use case: ads-marketing. One photorealistic fitness trainer portrait for a fictional demo staff ID badge: SUBJECT. Waist-up portrait, facing camera, calm confident expression, arms relaxed, plain black athletic shirt. Natural skin and realistic anatomy. Premium sports campaign photography, deep black studio backdrop, soft white key light upper left and restrained crimson rim light right. Centered head with generous top margin and shoulders fully in frame. Portrait 3:4 composition. No writing, logos, certification, watermark, collage or badge artwork. This is a fictional development demo person, not a real Nexus employee.

- 01: an athletic adult man with short dark hair and a trimmed beard, strength coach demo portrait
- 02: an athletic adult woman with tied-back dark hair, functional training coach demo portrait
- 03: an athletic adult man with close-cropped hair and darker skin, conditioning coach demo portrait
