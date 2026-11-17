# The Human Evolution — processing and delivery

The supplied source is preserved as `source.mp4`. `source-metadata.json` contains the actual ffprobe output. It is H.264/yuv420p with no alpha, 1920 × 1080, 24 FPS, **239 decoded video frames**, 9.958984 seconds of video and 9.963 seconds of container/audio duration. The original frame ends at the thighs; there are no feet in this export. Its source sparkle watermark and burned-in 24 FPS label are retained.

## Reproduce

Run from the project root. The application already depends on Sharp and Three.js; no runtime package was added for this section.

```powershell
npm install --prefix qa/video-tools --no-audit --no-fund ffmpeg-static ffprobe-static
node qa/video-tools/node_modules/ffmpeg-static/install.js
npm run assets:evolution
npm run archive:evolution
```

Alternatively use FFmpeg/ffprobe on PATH or set `FFMPEG_PATH` / `FFPROBE_PATH`. The pipeline used FFmpeg 6.1.1 locally. Supply another input path as `node scripts/prepare-evolution.cjs "absolute-source-path.mp4"`. The script checks source framing; review its attribution coordinates before using a differently composed export. Temporary lossless PNGs and local tools stay in ignored `qa/`.

The pipeline probes/counts the source, decodes at 24 FPS without adding fabricated frames, chroma-keys sampled green `0x15d229` at similarity 0.13/blend 0.06, despills green, then encodes WebP with full alpha quality. Because a broad chromakey also attenuates the faint source watermark, a local green-unmix matte preserves that attribution at its original pixels before encoding. It is never erased or covered. Source skin, shorts and internal anatomy remain visible. Union subject bounds are measured across all 239 mattes; the full output frame remains uncropped, including attribution. Website composition draws the subject and both source overlays visibly from those same frames.

Delivery:

- `public/animations/nexus-evolution/desktop/frame-0001.webp` … `frame-0239.webp`: 1280 × 720, quality 84, 12,988,758 bytes combined.
- `mobile/`: 768 × 432, quality 80, 6,051,398 bytes combined.
- `manifest.json`: measured source/output properties, frame count, sizes, alpha bounds and attribution regions.
- `poster.webp`: transparent first frame; no website background baked into it.
- `artifacts/nexus-human-evolution.zip`: 479 verified entries (239 desktop, 239 mobile, manifest), 19,136,933 bytes. The app reads extracted WebPs, never the ZIP.

The four journey chapters use inspected source timing. Skin returns near 9 seconds, so the last editorial chapter maps to the final 9% of the source; the preceding training chapter covers the longer internal transformation. Skeleton/muscle callouts use observed anatomy. Core/plank and legs/squat labels appear only during the corresponding visible highlights; these are educational examples, not promised transformation outcomes. This is an illustrative generated sequence, not a clinical model.
