# The Road to NEXUS: geographic provenance

Destination: NEXUS FITNESS CLUB, first floor Avadh Complex, Dhebar Road, above Anand Medical, Nagrik Bank Chowk, Bhakti Nagar, Rajkot. The user supplied the address, postcode 360002 and phone +91 95587 52573. No opening hours, live traffic or navigable route is asserted.

## Coordinate verification

The Yandex Maps business listing [153622330949](https://yandex.com/maps/org/nexus_fitness_club_best_gym_in_rajkot/153622330949/) exposes `data-coordinates="70.800109,22.279650"`. These provider-resolved business POI coordinates are the scene origin. `destination-verification.json` records the extraction source and retrieval time. [Yappe's matching full-address business listing](https://yappe.in/gujarat/rajkot/nexus-fitness-club/1979777) independently embeds 22.2796878,70.8000517, approximately 7m away. Nominatim reverse lookup of the chosen POI resolved nearby OSM way 312472093, Dhebar Road, approximately 18m east. This is corroboration of the street, not a surveyed doorway or geocoded first-floor position. Listings disagree on postal code; display retains the user's 360002.

## Map data and geometry

Original source: [OpenStreetMap API extract](https://api.openstreetmap.org/api/0.6/map?bbox=70.7948,22.2748,70.8054,22.2845). `osm-source.osm` preserves the response. The public extract and derived `public/maps/nexus/map.json` are distributed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) with © OpenStreetMap contributors attribution and a public source download. Only closed building ways are used; multipolygon relations and unmapped buildings are omitted.

`npm run assets:location` converts the checked-in extract offline. It projects WGS84 coordinates to local metres (equirectangular around the provider POI; X east, Z south), clips road segments at ±520m and keeps complete nearby footprints. Output: 222 road ways and 295 building footprints. 294 heights are uniform, clearly stylized 8m masses. One building has four mapped levels, rendered as an approximate 12m. Road widths are visual class-based estimates; bridge elevations and architectural detail are not reconstructed.

No licensed, verified exterior imagery or identified OSM footprint of Avadh Complex was available for this implementation. No footprint contains the destination POI. The scene therefore uses a first-floor destination marker, not a fictional standalone gym or invented Avadh model. Replacing this marker area with a verified future model is isolated in `RoadMapScene.tsx`.

The crimson reveal follows actual OSM Dhebar Road way 312472093, ending at its closest point approximately 17.8m from the POI. It illustrates approach direction only; no routing engine calculated it, no origin is requested, and it is explicitly labeled as non-navigational. Real directions open Google Maps with the complete destination address.

## Runtime and fallbacks

The 114KB map is served locally; no public geocoder, tile server, routing service or API key is used at runtime. Desktop uses merged geometry and a single demand-rendered R3F scene driven by one reversible GSAP timeline. Road subdivisions preserve their original alignment, permitting smooth draw ranges. Heights rise from their actual footprints. Materials, geometry, listeners and timeline are cleaned up. DPR is capped at 1.35; no realtime shadows or image textures are required.

Below 900px, under 600px height, or with reduced motion, the scene uses a lightweight real-data SVG map, no extra WebGL context and no scroll pin. Data errors and WebGL context loss retain the address and both actions. Free camera controls are intentionally omitted so drag cannot interfere with page scrolling.

Run `npm run check:location` against the production preview on port 3001 (or set `ARMORY_TEST_URL`). It checks data provenance, five stages, reversible camera/building state, hold, marker and skip controls, real links, mobile/reduced motion, data failure and context-loss fallbacks. Screenshots/results are in ignored `qa/location-*`.

Validation completed on 10 November 2026: `npx tsc --noEmit`, `npm run build`, `check:location`, `check:booking`, `check:voices`, `check:evolution`, `check:lockers` and `check:armory` all passed. The final production preview returned HTTP 200 on the LAN address. `npm run lint -- --no-cache` was attempted but exited at Next's ESLint setup prompt because this repository has no ESLint configuration; lint completion is not claimed.
