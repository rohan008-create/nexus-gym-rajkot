const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(process.env.ENTRANCE_TEST_URL || 'http://127.0.0.1:3001', { timeout: 90000 });
    await page.locator('.entrance-skip:not(:disabled)').waitFor({ timeout: 60000 });
    await page.locator('.intro[data-ready="true"]').waitFor({ timeout: 60000 });
    if (process.env.PROFILE_MUTED) await page.getByRole('button', { name: 'Mute explosion sound' }).click();
    await page.waitForTimeout(3500);
    const cdp = process.env.PROFILE_CPU ? await page.context().newCDPSession(page) : null;
    if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
    await page.evaluate(() => {
      const gl = document.querySelector('.intro canvas').getContext('webgl2');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      window.entranceProfile = { frames: [], tasks: [], spikes: [], started: 0, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (window.entranceProfile.started) window.entranceProfile.tasks.push({ at: Math.round(entry.startTime - window.entranceProfile.started), duration: Math.round(entry.duration) });
        }
      });
      observer.observe({ type: 'longtask', buffered: false });
      document.querySelector('.intro canvas').addEventListener('pointerdown', () => {
        const profile = window.entranceProfile;
        profile.started = performance.now();
        let last = profile.started;
        function frame(time) {
          if (time - last > 33.4) profile.spikes.push({ at: Math.round(time - profile.started), duration: Math.round(time - last) });
          profile.frames.push(time - last); last = time;
          if (time - profile.started < 2800) requestAnimationFrame(frame);
          else observer.disconnect();
        }
        requestAnimationFrame(frame);
      }, { once: true });
    });
    await page.mouse.click(720, 459);
    await page.locator('[data-entrance="revealed"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    if (cdp) {
      const { profile } = await cdp.send('Profiler.stop');
      const duration = new Map();
      profile.samples?.forEach((id, i) => duration.set(id, (duration.get(id) || 0) + profile.timeDeltas[i]));
      console.log('CPU samples:', profile.nodes.map(n => ({ function: n.callFrame.functionName, url: n.callFrame.url.split('/').slice(-1)[0], ms: Math.round((duration.get(n.id) || 0) / 1000) })).sort((a, b) => b.ms - a.ms).slice(0, 12));
    }
    const report = await page.evaluate(() => {
      const { frames, tasks, spikes, renderer } = window.entranceProfile;
      const sorted = frames.filter(x => x > 0).sort((a, b) => a - b);
      return { renderer, frames: frames.length, medianMs: Math.round(sorted[Math.floor(sorted.length * .5)] * 10) / 10,
        p95Ms: Math.round(sorted[Math.floor(sorted.length * .95)] * 10) / 10,
        worstMs: Math.round(Math.max(...frames)), framesOver50ms: frames.filter(x => x > 50).length, longTasks: tasks, spikes };
    });
    fs.mkdirSync('qa', { recursive: true });
    fs.writeFileSync(`qa/entrance-profile-${process.env.PROFILE_LABEL || 'current'}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
