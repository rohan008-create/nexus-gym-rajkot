// Local reproducible pipeline. Requires ffmpeg/ffprobe on PATH, FFMPEG_PATH /
// FFPROBE_PATH, or the ignored qa/video-tools static binaries documented below.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const sharp = require('sharp');
sharp.concurrency(2);
const root = path.resolve(__dirname, '..');
const resolveTool = (env, module, fallback) => process.env[env] || (() => { try { const item = require(path.join(root, 'qa/video-tools/node_modules', module)); return typeof item === 'string' ? item : item.path; } catch { return fallback; } })();
const ffmpeg = resolveTool('FFMPEG_PATH', 'ffmpeg-static', 'ffmpeg');
const ffprobe = resolveTool('FFPROBE_PATH', 'ffprobe-static', 'ffprobe');
const input = path.resolve(process.argv[2] || path.join(root, 'assets/video/human-evolution/source.mp4'));
const output = path.join(root, 'assets/evolution/nexus-evolution');
const temp = path.join(root, 'qa/evolution-processing');
const watermark = { x: 1650, y: 810, width: 210, height: 210 };
const run = args => new Promise((resolve, reject) => { const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); let error = ''; child.stderr.on('data', data => { error = (error + data).slice(-5000); }); child.on('error', reject); child.on('close', code => code ? reject(new Error(error)) : resolve()); });
(async () => {
  const metadata = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', input], { encoding: 'utf8', windowsHide: true }));
  const video = metadata.streams.find(stream => stream.codec_type === 'video');
  if (video.width !== 1920 || video.height !== 1080) throw new Error('Review the source subject/attribution coordinates before processing a differently framed export.');
  const [n, d] = video.avg_frame_rate.split('/').map(Number);
  const fps = Math.min(24, n / d);
  for (const dir of ['desktop', 'mobile']) await fs.mkdir(path.join(output, dir), { recursive: true });
  for (const dir of ['key', 'mark']) await fs.mkdir(path.join(temp, dir), { recursive: true });
  await fs.writeFile(path.join(root, 'assets/video/human-evolution/source-metadata.json'), JSON.stringify(metadata, null, 2));
  const filter = `[0:v]fps=${fps},split=2[a][b];[a]chromakey=0x15d229:0.13:0.06,despill=type=green:mix=0.35,format=rgba[key];[b]crop=${watermark.width}:${watermark.height}:${watermark.x}:${watermark.y},format=rgba[mark]`;
  console.log(`Source: ${video.width}x${video.height}, ${video.nb_read_frames} frames, ${video.duration}s video, ${metadata.format.duration}s container, ${n / d} FPS, ${video.pix_fmt}.`);
  await run(['-y', '-i', input, '-filter_complex', filter, '-map', '[key]', '-fps_mode', 'passthrough', path.join(temp, 'key/frame-%04d.png'), '-map', '[mark]', '-fps_mode', 'passthrough', path.join(temp, 'mark/frame-%04d.png')]);
  const frames = (await fs.readdir(path.join(temp, 'key'))).filter(name => /^frame-\d{4}\.png$/.test(name)).sort();
  if (frames.length !== Number(video.nb_read_frames)) throw new Error(`Expected ${video.nb_read_frames} source frames; found ${frames.length}. Use a fresh processing directory for a different export.`);
  const sizes = { desktop: { width: 1280, height: 720, quality: 84, bytes: 0 }, mobile: { width: 768, height: 432, quality: 80, bytes: 0 } };
  const bounds = { left: video.width, top: video.height, right: 0, bottom: 0 };
  let next = 0, completed = 0;
  async function worker() {
    while (next < frames.length) {
      const index = next++, name = frames[index];
      const keyed = await sharp(path.join(temp, 'key', name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const mark = await sharp(path.join(temp, 'mark', name)).ensureAlpha().raw().toBuffer();
      // The faint source sparkle is semi-transparent white over green. A broad
      // chromakey erases it, so unmix just that attribution region, then restore
      // every pixel at its original source position. Never crop/cover the mark.
      const background = [21, 210, 41];
      for (let y = 0; y < watermark.height; y++) for (let x = 0; x < watermark.width; x++) {
        const p = (y * watermark.width + x) * 4;
        const alpha = Math.max(0, Math.min(1, 1 - (mark[p + 1] - Math.max(mark[p], mark[p + 2])) / (background[1] - Math.max(background[0], background[2]))));
        const q = ((y + watermark.y) * video.width + x + watermark.x) * 4;
        keyed.data[q + 3] = alpha < .055 ? 0 : Math.round(alpha * 255);
        if (alpha >= .055) for (let c = 0; c < 3; c++) keyed.data[q + c] = Math.max(0, Math.min(255, (mark[p + c] - (1 - alpha) * background[c]) / alpha));
      }
      for (let y = 0; y < video.height; y += 2) for (let x = 400; x < 1450; x += 2) if (keyed.data[(y * video.width + x) * 4 + 3] > 32) { bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x + 2); bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y + 2); }
      for (const [variant, config] of Object.entries(sizes)) {
        const target = path.join(output, variant, name.replace('.png', '.webp'));
        await sharp(keyed.data, { raw: keyed.info }).resize(config.width, config.height).webp({ quality: config.quality, alphaQuality: 100, effort: 4 }).toFile(target);
        config.bytes += (await fs.stat(target)).size;
      }
      if (++completed % 24 === 0 || completed === frames.length) console.log(`Optimized ${completed}/${frames.length} frames.`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const subjectBounds = { x: Math.max(0, bounds.left - 10) / video.width, y: Math.max(0, bounds.top - 8) / video.height, width: (Math.min(video.width, bounds.right + 10) - Math.max(0, bounds.left - 10)) / video.width, height: (Math.min(video.height, bounds.bottom + 8) - Math.max(0, bounds.top - 8)) / video.height };
  const manifest = {
    version: 1, frameCount: frames.length, namingPattern: 'frame-%04d.webp', frameRate: fps,
    originalDuration: Number(metadata.format.duration), videoDuration: Number(video.duration), sequenceDuration: frames.length / fps,
    source: { width: video.width, height: video.height, frameRate: n / d, frameCount: Number(video.nb_read_frames), pixelFormat: video.pix_fmt, hasAlpha: false, colorSpace: video.color_space, colorPrimaries: video.color_primaries, colorTransfer: video.color_transfer, colorRange: video.color_range },
    desktop: sizes.desktop, mobile: sizes.mobile, totalBytes: sizes.desktop.bytes + sizes.mobile.bytes,
    subjectBounds,
    sourceOverlays: [{ id: 'frame-rate-label', x: 0, y: 0, width: .14, height: .1 }, { id: 'source-watermark', x: watermark.x / video.width, y: watermark.y / video.height, width: watermark.width / video.width, height: watermark.height / video.height }],
    notes: ['Original framing ends at the thighs; feet are absent in the supplied export.', 'The source sparkle watermark and burned-in 24 FPS label remain in every frame. They are also drawn visibly in the web composition.', 'The generated anatomy is illustrative, not a clinical model or a guarantee of results.', 'No source audio is used. Frames have an independent alpha channel; no website background is baked in.'],
  };
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.copyFile(path.join(output, 'desktop/frame-0001.webp'), path.join(output, 'poster.webp'));
  console.log(JSON.stringify(manifest, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
