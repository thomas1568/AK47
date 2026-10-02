const clamp = value => Math.max(0, Math.min(1, value));

// Compressed files stay small; only a bounded window of decoded images is kept.
export class FilmPlayer {
  constructor({ canvas, video, container, onState }) {
    Object.assign(this, { canvas, video, container, onState });
    this.context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.bitmaps = new Map();
    this.blobs = new Map();
    this.pending = new Set();
    this.failed = new Set();
    this.wanted = [];
    this.limit = matchMedia('(max-width: 760px)').matches ? 10 : 18;
    this.target = this.current = this.drawn = 0;
    this.progress = 0;
    this.visible = this.loaded = this.frozen = false;
    this.backend = 'poster';
    this.request = 0;
    this.lastTime = 0;
    this.drawn = -1;
    this.base = new URL(`${import.meta.env.BASE_URL}sequence/`, document.baseURI);
    this.resize = new ResizeObserver(() => { this.drawn = -1; this.render(this.current); });
    this.resize.observe(container);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) { this.load(); this.wake(); }
      else { cancelAnimationFrame(this.request); this.request = 0; this.lastTime = 0; }
    }, { rootMargin: '400px' });
    this.observer.observe(container);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
    video.addEventListener('seeked', () => this.seekVideo());
  }

  async load() {
    if (this.loading || this.loaded) return;
    this.loading = true;
    try {
      if (!this.context || !window.createImageBitmap) throw new Error('Frame decoding unavailable');
      const response = await fetch(new URL('manifest.json', this.base));
      if (!response.ok) throw new Error('Sequence unavailable');
      this.manifest = await response.json();
      if (!Number.isInteger(this.manifest.frames) || this.manifest.frames < 2) throw new Error('Invalid sequence');
      this.backend = 'sequence';
      this.loaded = true;
      this.target = this.progress * (this.manifest.frames - 1);
      this.current = this.frozen ? 0 : this.target;
      this.prime(Math.round(this.current));
    } catch { this.useVideo(); }
    finally { this.loading = false; }
  }

  async useVideo() {
    if (this.backend === 'video') return;
    this.backend = 'video';
    this.loaded = true;
    this.video.preload = 'auto';
    this.video.addEventListener('loadeddata', () => {
      this.container.classList.add('uses-video');
      this.container.dataset.backend = 'video';
      this.onState('ready');
      this.seekVideo();
    }, { once: true });
    const fail = () => { this.onState('error'); this.container.dataset.backend = 'poster'; };
    this.video.addEventListener('error', fail, { once: true });
    this.video.querySelector('source')?.addEventListener('error', fail, { once: true });
    this.video.load();
  }

  setProgress(value) {
    this.progress = clamp(value);
    if (this.manifest) this.target = this.progress * (this.manifest.frames - 1);
    if (this.backend === 'video') this.seekVideo();
    this.wake();
  }

  freeze(value) {
    this.frozen = value;
    if (value) { cancelAnimationFrame(this.request); this.request = 0; this.video.pause(); }
    else { this.wake(); this.seekVideo(); }
  }

  seekVideo() {
    if (this.backend !== 'video' || this.frozen || !this.visible || this.video.seeking || this.video.readyState < 2) return;
    const time = this.progress * Math.max(0, this.video.duration - .04);
    if (Math.abs(this.video.currentTime - time) > .035) this.video.currentTime = time;
  }

  wake() {
    if (this.request || this.frozen || !this.visible || document.hidden || this.backend !== 'sequence') return;
    this.request = requestAnimationFrame(time => this.tick(time));
  }

  tick(time) {
    this.request = 0;
    const dt = this.lastTime ? Math.min(50, time - this.lastTime) : 16;
    this.lastTime = time;
    // Time-based damping is consistent on both 60 Hz and 120 Hz screens.
    this.current += (this.target - this.current) * (1 - Math.exp(-dt / 115));
    if (Math.abs(this.target - this.current) < .025) this.current = this.target;
    const frame = Math.round(this.current);
    this.prime(frame);
    this.render(frame);
    if (this.current !== this.target) this.wake();
    else this.lastTime = 0;
  }

  prime(frame) {
    if (!this.manifest || this.backend !== 'sequence') return;
    const direction = this.target >= this.current ? 1 : -1;
    this.wanted = [...new Set([frame, frame + direction, frame - direction, frame + direction * 2, frame + direction * 3, frame + direction * 4, frame + direction * 6])]
      .filter(index => index >= 0 && index < this.manifest.frames);
    this.pump();
  }

  pump() {
    if (!this.visible || this.backend !== 'sequence' || document.hidden) return;
    for (const index of this.wanted) {
      if (this.pending.size >= 3) break;
      if (this.pending.has(index) || this.bitmaps.has(index) || this.failed.has(index)) continue;
      this.pending.add(index);
      this.decode(index);
    }
  }

  async decode(index) {
    try {
      let blob = this.blobs.get(index);
      if (!blob) {
        const response = await fetch(new URL(`ak-${String(index).padStart(3, '0')}.webp`, this.base));
        if (!response.ok) throw new Error('Frame unavailable');
        blob = await response.blob();
        this.blobs.set(index, blob);
      }
      const bitmap = await createImageBitmap(blob);
      this.bitmaps.set(index, bitmap);
      // Evict the most distant decoded frame, never the frame currently on screen.
      while (this.bitmaps.size > this.limit) {
        const furthest = [...this.bitmaps.keys()].filter(key => key !== Math.round(this.current))
          .sort((a, b) => Math.abs(b - this.current) - Math.abs(a - this.current))[0];
        this.bitmaps.get(furthest).close(); this.bitmaps.delete(furthest);
      }
      this.container.dataset.decodedFrames = String(this.bitmaps.size);
      if (this.drawn < 0 || Math.abs(index - this.current) <= 1) this.render(Math.round(this.current));
      this.wake();
    } catch {
      this.failed.add(index);
      if (this.failed.size >= 3 && this.drawn < 0) this.useVideo();
    } finally { this.pending.delete(index); this.pump(); }
  }

  render(frame) {
    if (!this.context || !this.bitmaps.size) return;
    const candidates = [...this.bitmaps.keys()].sort((a, b) => Math.abs(a - frame) - Math.abs(b - frame));
    const index = this.bitmaps.has(frame) ? frame : candidates[0];
    if (this.drawn === index) return;
    // Late decode completions must not briefly reverse a forward scroll.
    if (this.drawn >= 0 && this.target >= this.drawn && index < this.drawn) return;
    if (this.drawn >= 0 && this.target <= this.drawn && index > this.drawn) return;
    const image = this.bitmaps.get(index);
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const mobile = rect.width < 761;
    const scale = mobile ? Math.min(width / image.width, height * .63 / image.height) * 1.12 : Math.max(width / image.width, height / image.height);
    const w = image.width * scale, h = image.height * scale;
    const x = (width - w) / 2, y = mobile ? height * .26 - h / 2 : (height - h) / 2;
    this.context.fillStyle = '#030303'; this.context.fillRect(0, 0, width, height);
    this.context.drawImage(image, x, y, w, h);
    this.drawn = index;
    this.container.dataset.frame = String(index);
    const firstFrame = this.container.dataset.backend !== 'sequence';
    this.container.dataset.backend = 'sequence';
    this.container.classList.add('has-sequence');
    if (firstFrame) this.onState('ready');
  }
}
