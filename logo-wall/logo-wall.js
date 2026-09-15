/* ==========================================================================
   LogoWall
   Client logos that swap through blur, with a left-to-right wave and a
   smooth re-layout between breakpoints. No dependencies.

   Usage:
     new LogoWall('#clients', {
       logos: ['logos/comfy.svg', 'logos/synevo.svg', …],
       rows: 2,
     });

   Logo entries, any mix of:
     'logos/comfy.svg'                         path, fetched and inlined; name from the file name
     { src: 'logos/comfy.svg', name: 'Comfy' } same, with an explicit accessible name
     { name: 'Comfy', svg: '<svg …>…</svg>' }  full SVG markup, no request

   SVG requirements: a viewBox (the logo is sized from it), monochrome artwork.
   Every fill / stroke is replaced with currentColor, so the wall controls the color.

   Public API:
     wall.ready                 Promise, resolves once all logos are loaded
     wall.start()               resume autoplay
     wall.stop()                pause autoplay
     wall.swap()                run one swap step now (per current mode)
     wall.setOptions(patch)     change any option on the fly
     wall.destroy()             remove listeners and markup

   Performance notes:
     - autoplay runs only while the block is on screen and the tab is visible
     - each logo is parsed once and cloned for every swap
     - will-change is applied only to layers that are mid-transition
     - the swap animates opacity / filter / transform only (compositor-friendly)

   Requires logo-wall.css.
   ========================================================================== */

(function (global) {
  'use strict';

  const DEFAULTS = {
    logos: [],
    rows: 2,
    columns: { desktop: 5, tablet: 4, mobile: 3, small: 2 },

    // scenario
    mode: 'wave',            // 'wave' | 'row' | 'single' | 'pair'
    waveOrder: 'diagonal',   // 'diagonal' | 'columns' | 'reading'
    interval: 3500,          // ms between swap steps
    stagger: 120,            // ms between slots inside one step
    pauseOnHover: true,
    autoplay: true,
    revealOnLoad: true,      // first logos blur in as a wave once loaded
    rootMargin: '0px',       // IntersectionObserver margin: start swapping a bit before the block scrolls in

    // swap transition
    duration: 900,
    easing: 'cubic-bezier(.65, 0, .35, 1)',
    blur: 12,                // px
    scale: 0.96,             // scale of the hidden state
    enter: { x: -12, y: 0 }, // where the incoming logo starts (px)
    exit: { x: 12, y: 0 },   // where the outgoing logo ends (px)
    overlap: 1,              // 1 = in and out together, 0 = out first, then in

    // breakpoint transition
    layoutDuration: 600,
    layoutEasing: 'cubic-bezier(.22, 1, .36, 1)',

    color: '#8a8a8a',
  };

  const CLS = {
    root: 'logo-wall',
    inner: 'logo-wall__inner',
    grid: 'logo-wall__grid',
    slot: 'logo-wall__slot',
    layer: 'logo-wall__layer',
  };

  class LogoWall {
    constructor(root, options = {}) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      if (!this.root) throw new Error('LogoWall: root element not found');

      this.options = mergeOptions(DEFAULTS, options);
      this.logos = [];                          // filled by loadLogos(): { name, width, height, viewBox, svg }
      this.queue = [];                          // queue[0..N-1] are visible, the rest is reserve
      this.templates = new Map();               // logo index -> parsed layer element, cloned per use
      this.slots = [];
      this.cols = 0;
      this.rowCursor = 0;
      this.timer = null;
      this.running = false;
      this.hovering = false;
      this.visible = true;
      this.layoutBusyUntil = 0;
      this.layoutToken = 0;
      this.layoutRaf = 0;
      this.reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.root.classList.add(CLS.root);
      this.root.innerHTML = `<div class="${CLS.inner}"><div class="${CLS.grid}"></div></div>`;
      this.inner = this.root.firstElementChild;
      this.grid = this.inner.firstElementChild;

      this.onEnter = () => { this.hovering = true; };
      this.onLeave = () => { this.hovering = false; };
      this.root.addEventListener('mouseenter', this.onEnter);
      this.root.addEventListener('mouseleave', this.onLeave);

      this.applyVars();
      this.build();

      this.ready = loadLogos(this.options.logos).then(logos => {
        if (!this.root.isConnected) return;   // destroyed while loading
        this.logos = logos;
        this.queue = logos.map((_, i) => i);
        this.build(this.options.revealOnLoad && !this.reducedMotion);
        if (this.options.autoplay && !this.reducedMotion) this.start();
      });

      this.resizeObserver = new ResizeObserver(() => this.requestLayoutCheck());
      this.resizeObserver.observe(this.root);

      // no work while the block is off screen or the tab is hidden
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.syncTimer();
      }, { rootMargin: this.options.rootMargin });
      this.intersectionObserver.observe(this.root);
      this.onVisibility = () => this.syncTimer();
      document.addEventListener('visibilitychange', this.onVisibility);
    }

    /* ---- public ------------------------------------------------------- */

    start() {
      this.running = true;
      this.syncTimer();
    }

    stop() {
      this.running = false;
      this.syncTimer();
    }

    swap() {
      this.tick();
    }

    setOptions(patch) {
      const prev = this.options;
      this.options = mergeOptions(prev, patch);
      this.applyVars();
      if (this.options.rows !== prev.rows) this.build();
      else this.requestLayoutCheck();
      this.syncTimer();
    }

    destroy() {
      this.stop();
      cancelAnimationFrame(this.layoutRaf);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.root.removeEventListener('mouseenter', this.onEnter);
      this.root.removeEventListener('mouseleave', this.onLeave);
      this.root.innerHTML = '';
      this.root.classList.remove(CLS.root);
    }

    /* ---- options -> CSS variables -------------------------------------- */

    applyVars() {
      const o = this.options;
      const set = (name, value) => this.root.style.setProperty(name, value);
      set('--lw-dur', o.duration + 'ms');
      set('--lw-ease', o.easing);
      set('--lw-blur', o.blur + 'px');
      set('--lw-scale', o.scale);
      set('--lw-x-in', o.enter.x + 'px');
      set('--lw-y-in', o.enter.y + 'px');
      set('--lw-x-out', o.exit.x + 'px');
      set('--lw-y-out', o.exit.y + 'px');
      set('--lw-layout-dur', o.layoutDuration + 'ms');
      set('--lw-layout-ease', o.layoutEasing);
      set('--lw-color', o.color);
      set('--lw-cols-desktop', o.columns.desktop);
      set('--lw-cols-tablet', o.columns.tablet);
      set('--lw-cols-mobile', o.columns.mobile);
      set('--lw-cols-small', o.columns.small);
      set('--lw-rows', o.rows); // reserves the block height before the logos arrive
    }

    /* ---- layout -------------------------------------------------------- */

    // Column count the CSS wants right now (resolved by the container query).
    targetCols() {
      const v = parseInt(getComputedStyle(this.inner).getPropertyValue('--lw-cols'), 10);
      return Number.isFinite(v) && v > 0 ? v : this.options.columns.desktop;
    }

    visibleCount(cols) {
      return Math.min(this.options.rows * cols, this.logos.length);
    }

    // Parse each logo once, clone afterwards.
    makeLayer(logoIndex) {
      let tpl = this.templates.get(logoIndex);
      if (!tpl) {
        const logo = this.logos[logoIndex];
        tpl = document.createElement('div');
        tpl.className = CLS.layer;
        tpl.style.setProperty('--lw-w', logo.width);
        tpl.innerHTML =
          `<svg viewBox="${logo.viewBox}" width="${logo.width}" height="${logo.height}" ` +
          `fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttr(logo.name)}">${logo.svg}</svg>`;
        this.templates.set(logoIndex, tpl);
      }
      return tpl.cloneNode(true);
    }

    makeSlot(logoIndex) {
      const el = document.createElement('div');
      el.className = CLS.slot;
      const layer = this.makeLayer(logoIndex);
      el.appendChild(layer);
      return { el, layer, busy: false };
    }

    // Hard reset: on init, once the logos are loaded, and when the row count changes.
    build(reveal = false) {
      this.cols = this.targetCols();
      this.grid.style.setProperty('--lw-cols-js', this.cols);
      this.grid.innerHTML = '';
      this.slots = [];
      const n = this.visibleCount(this.cols);
      for (let i = 0; i < n; i++) {
        const slot = this.makeSlot(this.queue[i]);
        if (reveal) slot.layer.classList.add('is-enter');
        this.grid.appendChild(slot.el);
        this.slots.push(slot);
      }
      if (reveal) {
        void this.grid.offsetWidth;
        this.slots.forEach((slot, i) => setTimeout(() => slot.layer.classList.remove('is-enter'), this.waveDelay(i)));
      }
    }

    requestLayoutCheck() {
      if (this.layoutRaf) return;
      this.layoutRaf = requestAnimationFrame(() => {
        this.layoutRaf = 0;
        if (this.targetCols() !== this.cols) this.relayout();
      });
    }

    // Smooth breakpoint change. Survivors slide to their new cell (FLIP),
    // slots that no longer fit dissolve in place, new slots blur in.
    // The queue is untouched: visible logos are always queue[0..N-1].
    relayout() {
      const newCols = this.targetCols();
      if (newCols === this.cols) return;

      const dur = this.reducedMotion ? 0 : this.options.layoutDuration;
      const oldCount = this.slots.length;
      const newCount = this.visibleCount(newCols);
      const gridRect = this.grid.getBoundingClientRect();
      const before = this.slots.map(s => s.el.getBoundingClientRect());
      const token = ++this.layoutToken;

      this.cols = newCols;
      this.layoutBusyUntil = performance.now() + dur + 100;

      // 1. leaving slots: pin to the old cell, then fade out
      const leaving = this.slots.slice(newCount);
      this.slots = this.slots.slice(0, newCount);
      leaving.forEach((s, k) => {
        const r = before[newCount + k];
        Object.assign(s.el.style, {
          left: (r.left - gridRect.left) + 'px',
          top: (r.top - gridRect.top) + 'px',
          width: r.width + 'px',
          height: r.height + 'px',
        });
      });
      void this.grid.offsetWidth;
      leaving.forEach(s => s.el.classList.add('is-leaving'));
      setTimeout(() => leaving.forEach(s => s.el.remove()), dur + 100);

      // 2. entering slots start hidden
      const entering = [];
      for (let i = oldCount; i < newCount; i++) {
        const slot = this.makeSlot(this.queue[i]);
        slot.layer.classList.add('is-enter');
        this.grid.appendChild(slot.el);
        this.slots.push(slot);
        entering.push(slot);
      }

      // 3. apply the new column count, offset survivors back to where they were
      this.grid.style.setProperty('--lw-cols-js', newCols);
      void this.grid.offsetWidth;
      const survivors = this.slots.slice(0, Math.min(oldCount, newCount));
      survivors.forEach((s, i) => {
        s.el.classList.remove('is-moving'); // a previous move may still be running
        const a = before[i];
        const b = s.el.getBoundingClientRect();
        const dx = (a.left + a.width / 2) - (b.left + b.width / 2);
        const dy = (a.top + a.height / 2) - (b.top + b.height / 2);
        s.el.style.transform = (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) ? `translate(${dx}px, ${dy}px)` : '';
      });
      void this.grid.offsetWidth;

      // 4. next frame: release, everything glides into place
      requestAnimationFrame(() => {
        survivors.forEach(s => { s.el.classList.add('is-moving'); s.el.style.transform = ''; });
        entering.forEach((s, k) => setTimeout(() => s.layer.classList.remove('is-enter'), dur * 0.3 + k * 60));
        setTimeout(() => {
          if (token === this.layoutToken) survivors.forEach(s => s.el.classList.remove('is-moving'));
        }, dur + 100);
      });
    }

    /* ---- swapping ------------------------------------------------------ */

    // The interval timer exists only while it can do useful work.
    syncTimer() {
      clearTimeout(this.timer);
      this.timer = null;
      const active = this.running && this.visible && !document.hidden;
      if (active) this.schedule();
    }

    schedule() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!(this.options.pauseOnHover && this.hovering)) this.tick();
        this.schedule();
      }, this.options.interval);
    }

    // One step of the current scenario.
    tick() {
      if (performance.now() < this.layoutBusyUntil) return;
      const o = this.options;
      const n = this.slots.length;
      const all = [...Array(n).keys()];

      if (o.mode === 'single') {
        this.swapSlots(this.pickFreeSlots(1));
      } else if (o.mode === 'pair') {
        const idx = this.pickFreeSlots(2).sort((a, b) => a - b);
        this.swapSlots(idx, idx.map((_, k) => k * o.stagger));
      } else if (o.mode === 'wave') {
        if (this.slots.some(s => s.busy)) return;
        this.swapSlots(all, all.map(i => this.waveDelay(i)));
      } else if (o.mode === 'row') {
        const r = this.rowCursor++ % o.rows;
        const idx = all.filter(i => Math.floor(i / this.cols) === r);
        this.swapSlots(idx, idx.map((_, k) => k * o.stagger));
      }
    }

    // Delay of a slot inside a left-to-right wave.
    waveDelay(i) {
      const { stagger, waveOrder } = this.options;
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;
      if (waveOrder === 'reading') return (row * this.cols + col) * stagger;
      if (waveOrder === 'columns') return col * stagger;
      return col * stagger + row * stagger * 0.5; // diagonal
    }

    pickFreeSlots(count) {
      const free = this.slots.map((s, i) => (s.busy ? -1 : i)).filter(i => i >= 0);
      for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
      }
      return free.slice(0, count);
    }

    swapSlots(slotIdxs, delays) {
      const idx = slotIdxs.filter(i => !this.slots[i].busy);
      if (!idx.length) return;
      const picked = this.reassign(idx);
      if (!picked) return;
      idx.forEach((i, j) => this.transitionSlot(i, picked[j], delays ? delays[j] : 0));
    }

    // Give the chosen slots new logos so that every one of them changes.
    // Reserve logos go first; the rest is covered by moving logos between the
    // chosen slots, as far apart as possible. Updates the queue.
    reassign(slotIdxs) {
      const n = this.slots.length;
      const old = slotIdxs.map(i => this.queue[i]);
      const reserve = this.queue.slice(n);
      const candidates = reserve.concat(old);
      const m = slotIdxs.length;
      if (candidates.length < 2) return null;

      const shift = (reserve.length >= m || m === 1) ? 0 : reserve.length + Math.floor(m / 2);
      const picked = slotIdxs.map((_, j) => candidates[(j + shift) % candidates.length]);
      const used = new Set(picked);
      const leftover = candidates.filter(x => !used.has(x));

      slotIdxs.forEach((i, j) => { this.queue[i] = picked[j]; });
      this.queue = this.queue.slice(0, n).concat(leftover);
      return picked;
    }

    // Cross-fade one slot to a new logo through blur.
    transitionSlot(i, logoIndex, delay = 0) {
      const slot = this.slots[i];
      const { duration, overlap } = this.options;
      const dur = this.reducedMotion ? 0 : duration;
      slot.busy = true;

      const next = this.makeLayer(logoIndex);
      next.classList.add('is-enter', 'is-animating');
      const prev = slot.layer;

      setTimeout(() => {
        slot.el.appendChild(next);
        void next.offsetWidth; // commit the hidden state before transitioning out of it
        if (prev) prev.classList.add('is-exit', 'is-animating');
        const wait = dur * (1 - overlap);
        setTimeout(() => next.classList.remove('is-enter'), wait);
        setTimeout(() => {
          if (prev) prev.remove();
          next.classList.remove('is-animating');
          slot.layer = next;
          slot.busy = false;
        }, wait + dur + 30);
      }, delay);
    }
  }

  /* ---- loading --------------------------------------------------------- */

  let uid = 0;

  // Accepts paths, { src, name } and { name, svg } entries. Resolves to parsed logos.
  function loadLogos(entries) {
    return Promise.all(entries.map(entry => {
      const e = typeof entry === 'string' ? { src: entry } : entry;
      const name = e.name || nameFromPath(e.src || '');
      if (e.svg) return parseSvg(e.svg, name);
      return fetch(e.src)
        .then(res => {
          if (!res.ok) throw new Error(`LogoWall: ${res.status} for ${e.src}`);
          return res.text();
        })
        .then(text => parseSvg(text, name));
    }));
  }

  // Full SVG markup -> { name, width, height, viewBox, svg }.
  // Sizes come from the viewBox; fills and strokes become currentColor;
  // ids are prefixed so several inlined logos never clash.
  function parseSvg(text, name) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg || !svg.getAttribute('viewBox')) throw new Error(`LogoWall: "${name}" needs an <svg> with a viewBox`);

    const viewBox = svg.getAttribute('viewBox').trim();
    const [, , w, h] = viewBox.split(/[\s,]+/).map(Number);
    const prefix = `lw${++uid}-`;

    svg.querySelectorAll('[fill], [stroke]').forEach(el => {
      for (const attr of ['fill', 'stroke']) {
        const v = el.getAttribute(attr);
        if (v && v !== 'none' && !v.startsWith('url(')) el.setAttribute(attr, 'currentColor');
      }
    });
    svg.querySelectorAll('[id]').forEach(el => el.setAttribute('id', prefix + el.getAttribute('id')));

    let inner = svg.innerHTML.replace(/url\(#/g, `url(#${prefix}`).replace(/href="#/g, `href="#${prefix}`);
    return { name, width: w, height: h, viewBox, svg: inner };
  }

  function nameFromPath(src) {
    const file = src.split('/').pop().replace(/\.svg$/i, '');
    return file.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ---- helpers --------------------------------------------------------- */

  function mergeOptions(base, patch) {
    const out = Object.assign({}, base, patch);
    for (const key of ['columns', 'enter', 'exit']) {
      out[key] = Object.assign({}, base[key], patch[key]);
    }
    return out;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  LogoWall.defaults = DEFAULTS;
  global.LogoWall = LogoWall;
})(window);
