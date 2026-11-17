export type SequenceImage = ImageBitmap | HTMLImageElement;
type Entry = { image: SequenceImage; touched: number };
export type SequenceSample = { index: number; lower: SequenceImage; upper: SequenceImage; mix: number };

// Compressed frames can be warmed without retaining hundreds of decoded RGBA
// images. Network work and visible-frame decoding have independent limits.
export class ImageSequence {
  private cache = new Map<number, Entry>();
  private blobs = new Map<number, Blob>();
  private fetching = new Map<string, AbortController>();
  private badPacks = new Set<number>();
  private decoding = new Set<number>();
  private failed = new Set<number>();
  private fetchQueue: number[] = [];
  private decodeQueue: number[] = [];
  private alive = true;
  private paused = false;
  private desired = 0;
  private direction = 1;
  private cursor = 0;
  private clock = 0;
  private blobBytes = 0;
  private requestTime = 0;
  private speed = 0;
  constructor(private base: string, private count: number, private capacity: number, private notify: () => void, private unavailable: () => void, private byteBudget = 20 * 1024 * 1024, private packSize = 0) {}
  private job(index: number) { const group = this.packSize ? Math.floor(index / this.packSize) : -1; return group >= 0 && !this.badPacks.has(group) ? `pack:${group}` : `frame:${index}`; }
  request(index: number) {
    const target = Math.max(0, Math.min(this.count - 1, index));
    const now = performance.now();
    if (this.requestTime) this.speed = this.speed * .75 + Math.min(240, Math.abs(target - this.desired) / Math.max(.008, (now - this.requestTime) / 1000)) * .25;
    this.requestTime = now;
    if (Math.abs(target - this.desired) > .01) this.direction = target > this.desired ? 1 : -1;
    this.desired = target;
    const current = Math.round(target);
    const decode = [Math.floor(target), Math.ceil(target), current, 0];
    const ahead = this.capacity - 5;
    for (let distance = 1; distance <= ahead; distance++) decode.push(current + distance * this.direction);
    for (let distance = 1; distance <= 3; distance++) decode.push(current - distance * this.direction);
    this.decodeQueue = Array.from(new Set(decode)).filter(i => i >= 0 && i < this.count && !this.failed.has(i)).slice(0, this.capacity - 2);
    const lead = this.speed > 8 ? Math.min(18, Math.ceil(this.speed * .16)) : 0;
    const predicted = Math.max(0, Math.min(this.count - 1, current + lead * this.direction));
    const network = [predicted, predicted + this.direction, ...this.decodeQueue];
    for (let distance = ahead + 1; distance <= 22; distance++) network.push(current + distance * this.direction);
    this.fetchQueue = Array.from(new Set(network)).filter(i => i >= 0 && i < this.count && !this.failed.has(i));
    this.pumpDecode(); this.pumpFetch();
  }
  setPaused(value: boolean) { this.paused = value; if (!value) this.request(this.desired); }
  sample(index: number): SequenceSample | null {
    const target = Math.max(0, Math.min(this.count - 1, index));
    const floor = Math.floor(target), ceil = Math.ceil(target);
    const a = this.cache.get(floor), b = this.cache.get(ceil);
    if (a && b) { a.touched = b.touched = ++this.clock; return { index: target, lower: a.image, upper: b.image, mix: target - floor }; }
    let best = -1;
    this.cache.forEach((_, candidate) => { if (best === -1 || Math.abs(candidate - target) < Math.abs(best - target)) best = candidate; });
    if (best === -1) return null;
    const entry = this.cache.get(best)!; entry.touched = ++this.clock;
    return { index: best, lower: entry.image, upper: entry.image, mix: 0 };
  }
  get size() { return this.cache.size; }
  get encodedBytes() { return this.blobBytes; }
  private release(image: SequenceImage) { if ('close' in image) image.close(); else image.src = ''; }
  private trimDecoded() {
    while (this.cache.size > this.capacity) {
      const shown = this.sample(this.desired);
      const entries = Array.from(this.cache.entries()).filter(([i]) => i !== 0 && i !== Math.floor(this.desired) && i !== Math.ceil(this.desired) && i !== Math.floor(shown?.index ?? -1) && i !== Math.ceil(shown?.index ?? -1));
      entries.sort((a, b) => Number(this.decodeQueue.includes(a[0])) - Number(this.decodeQueue.includes(b[0])) || Math.abs(b[0] - this.desired) - Math.abs(a[0] - this.desired) || a[1].touched - b[1].touched);
      if (!entries.length) break;
      this.release(entries[0][1].image); this.cache.delete(entries[0][0]);
    }
  }
  private trimBlobs() {
    if (this.blobBytes <= this.byteBudget) return;
    const indices = Array.from(this.blobs.keys()).filter(i => i !== 0 && Math.abs(i - this.desired) > 12 && !this.decoding.has(i)).sort((a, b) => Math.abs(b - this.desired) - Math.abs(a - this.desired));
    for (const index of indices) { if (this.blobBytes <= this.byteBudget) break; this.blobBytes -= this.blobs.get(index)!.size; this.blobs.delete(index); }
  }
  private pumpFetch() {
    if (!this.alive || this.paused) return;
    while (this.fetching.size < 3) {
      let index = this.fetchQueue.find(i => !this.blobs.has(i) && !this.fetching.has(this.job(i)) && !this.failed.has(i));
      if (index === undefined) {
        while (this.cursor < this.count && (this.blobs.has(this.cursor) || this.fetching.has(this.job(this.cursor)) || this.failed.has(this.cursor))) this.cursor++;
        if (this.cursor >= this.count) break;
        index = this.cursor++;
      }
      const controller = new AbortController(), job = this.job(index); this.fetching.set(job, controller);
      void this.fetchFrame(index, job, controller);
    }
  }
  private async fetchFrame(index: number, job: string, controller: AbortController) {
    try {
      const packed = job.startsWith('pack:');
      const group = packed ? Number(job.slice(5)) : -1;
      const url = packed ? `${this.base}-packs/pack-${String(group + 1).padStart(3, '0')}.bin?v=${this.packSize}` : `${this.base}/frame-${String(index + 1).padStart(4, '0')}.webp`;
      const response = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
      if (!response.ok) throw new Error('Frame unavailable');
      if (!this.alive) return;
      if (packed) {
        const buffer = await response.arrayBuffer(); if (!this.alive) return; const view = new DataView(buffer);
        const first = view.getUint32(0, true), count = view.getUint32(4, true);
        if (first !== group * this.packSize || count < 1 || count > this.packSize || first + count > this.count) throw new Error('Invalid frame batch');
        let offset = 8;
        for (let i = 0; i < count; i++) { const bytes = view.getUint32(offset, true); offset += 4; if (!bytes || offset + bytes > buffer.byteLength) throw new Error('Truncated frame batch'); const blob = new Blob([buffer.slice(offset, offset + bytes)], { type: 'image/webp' }); offset += bytes; if (!this.blobs.has(first + i)) { this.blobs.set(first + i, blob); this.blobBytes += blob.size; } }
      } else { const blob = await response.blob(); if (!this.alive) return; this.blobs.set(index, blob); this.blobBytes += blob.size; }
      this.trimBlobs();
    } catch {
      if (!controller.signal.aborted) { if (job.startsWith('pack:')) this.badPacks.add(Number(job.slice(5))); else { this.failed.add(index); if (!this.cache.size && this.failed.size >= 2) this.unavailable(); } }
    } finally { this.fetching.delete(job); this.pumpDecode(); this.pumpFetch(); }
  }
  private pumpDecode() {
    if (!this.alive || this.paused) return;
    while (this.decoding.size < 2) {
      let index = this.decodeQueue.find(i => this.blobs.has(i) && !this.cache.has(i) && !this.decoding.has(i) && !this.failed.has(i));
      if (index === undefined) {
        const shown = this.sample(this.desired);
        const distance = shown ? Math.abs(shown.index - this.desired) : Infinity;
        index = Array.from(this.blobs.keys()).filter(i => !this.cache.has(i) && !this.decoding.has(i) && !this.failed.has(i) && Math.abs(i - this.desired) < distance).sort((a, b) => Math.abs(a - this.desired) - Math.abs(b - this.desired))[0];
        if (index !== undefined) this.decodeQueue = [index, ...this.decodeQueue.filter(i => i !== index)].slice(0, this.capacity - 2);
      }
      if (index === undefined) break;
      this.decoding.add(index); void this.decodeFrame(index);
    }
  }
  private async decodeFrame(index: number) {
    try {
      const blob = this.blobs.get(index)!;
      let image: SequenceImage;
      if (typeof createImageBitmap === 'function') image = await createImageBitmap(blob);
      else {
        const url = URL.createObjectURL(blob);
        try { image = new Image(); image.src = url; await image.decode(); }
        finally { URL.revokeObjectURL(url); }
      }
      if (!this.alive) { this.release(image); return; }
      this.cache.set(index, { image, touched: ++this.clock }); this.trimDecoded(); this.notify();
    } catch { this.failed.add(index); if (!this.cache.size && this.failed.size >= 2) this.unavailable(); }
    finally { this.decoding.delete(index); this.pumpDecode(); }
  }
  destroy() { this.alive = false; this.fetching.forEach(controller => controller.abort()); this.cache.forEach(entry => this.release(entry.image)); this.cache.clear(); this.blobs.clear(); this.blobBytes = 0; this.fetchQueue = []; this.decodeQueue = []; }
}
