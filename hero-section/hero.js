/* ==========================================================================
   Hero
   The controller for the hero block: view tabs that swap the two product
   screenshots, and the tap that makes the small screenshot the main one on
   narrow screens. All motion lives in hero.css; this file only flips
   attributes and crossfades a picture when a tab changes. No dependencies,
   about 2 KB gzipped with comments, about 1 KB minified.

   Usage:
     new Hero('#hero', { view: 0, main: 'desktop' });

   Markup: see the header of hero.css or demo.html. Each tab carries the
   pictures of its view in data-desktop / data-phone, plus optional
   data-<which>-srcset (WebP candidates) and data-<which>-avif (AVIF
   candidates for the <source>); the <img> keeps its own `sizes`. A tab
   without them keeps the pictures that are already shown.
   Loading: only the first view loads with the page. The others are fetched
   on intent (hover or focus on a tab, a touch on the pictures, a switch)
   and always decoded off screen before the crossfade, so nothing flashes.
   On touch screens a horizontal swipe over the screenshots steps through
   the views.

   Public API:
     hero.select(i)          show view i: the tab and both screenshots
     hero.prev() / next()    step through the views, wraps around
     hero.show('phone')      make the phone (or 'desktop') the main screenshot
     hero.toggle()           swap main and thumb
     hero.setOptions(patch)  change any option on the fly
     hero.destroy()          remove the listeners
     Hero.defaults           the option set

   Events on the root element:
     'hero:view' { index }   a tab was selected
     'hero:main' { main }    the main screenshot changed

   Requires hero.css.
   ========================================================================== */

(function (global) {
  'use strict';

  const DEFAULTS = {
    view: 0,             // index of the tab shown first
    main: 'desktop',     // 'desktop' | 'phone': the big screenshot on narrow screens
    swap: true,          // a tap on the small screenshot makes it the main one
    hint: true,          // badge on the small screenshot
    duration: 600,       // ms, the swap
    easing: 'cubic-bezier(.22, 1, .36, 1)',   // the picture that shrinks
    overshoot: 0.2,      // the picture that grows: 0 = same curve as easing, 0.4 = a clear bounce
    tilt: 3,             // deg, how much the pictures lean at mid-flight; 0 = none
    lift: true,          // extra shadow under the phone while it moves
    entrance: true,      // on scroll: the screens straighten from a lean, the phone flies in from the right
    tiltIn: 14,          // deg, the lean the screens start from
    fly: 80,             // px, how far right the phone starts
    fade: 650,           // ms, screenshot change on a tab change
    strength: 0.6,       // how much blur / travel / scale the change uses (1 = full)
    switch: 'blur',      // 'fade' | 'slide' | 'zoom' | 'wipe' | 'circle' | 'blur': how the pictures change on a tab change
    stagger: 90,         // ms, the phone follows the desktop by this much on a tab change (depth)
  };

  // how the incoming picture appears over the old one on a view change: [layer keyframes, old picture
  // keyframes or null]; dir is +1 forward, -1 back, k scales the amounts (option `strength`). The old
  // picture's animation is fill: none, so it is back to normal under the fully opaque layer before
  // the sources swap
  const SWITCH = {
    fade: () => [[{ opacity: 0 }, { opacity: 1 }]],
    slide: (dir, k) => [[{ opacity: 0, translate: `${6 * dir * k}% 0`, scale: 1 - .015 * k }, { opacity: 1, translate: '0 0', scale: '1' }]],
    zoom: (dir, k) => [[{ opacity: 0, scale: 1 - .03 * k }, { opacity: 1, scale: '1' }]],
    // a diagonal edge sweeps across from the side the views move to
    wipe: dir => [dir > 0
      ? [{ clipPath: 'polygon(120% 0, 200% 0, 200% 100%, 100% 100%)', translate: '2% 0' }, { clipPath: 'polygon(0 0, 200% 0, 200% 100%, -20% 100%)', translate: '0 0' }]
      : [{ clipPath: 'polygon(-100% 0, -20% 0, 0 100%, -100% 100%)', translate: '-2% 0' }, { clipPath: 'polygon(-100% 0, 100% 0, 120% 100%, -100% 100%)', translate: '0 0' }]],
    circle: dir => [[{ clipPath: `circle(0% at ${dir > 0 ? 85 : 15}% 50%)` }, { clipPath: `circle(125% at ${dir > 0 ? 85 : 15}% 50%)` }]],
    // only the incoming screen is soft, and only at first: the old one stays sharp underneath,
    // otherwise the two blurred pictures in the middle of the change turn to mud
    blur: (dir, k) => [[{ opacity: 0, filter: `blur(${5 * k}px)` }, { filter: 'blur(0)', offset: .7 }, { opacity: 1, filter: 'blur(0)' }]],
  };

  class Hero {
    constructor(root, options = {}) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      if (!this.root) throw new Error('Hero: root element not found');
      this.options = Object.assign({}, DEFAULTS);
      this.tabs = Array.from(this.root.querySelectorAll('.hero__tab'));
      this.screens = this.root.querySelector('.hero__screens');
      this.img = {
        desktop: this.root.querySelector('.hero__screen--desktop img'),
        phone: this.root.querySelector('.hero__screen--phone img'),
      };
      this.index = -1;
      this._pending = {};
      this._ghost = {};
      this._warmed = new Set();
      // one delegated listener each: tabs, arrows and screenshots all live under the root
      this._onClick = e => this._click(e);
      this._onKey = e => this._key(e);
      this._onDown = e => this._down(e);
      this._onUp = e => this._up(e);
      this._onIntent = e => this._intent(e);
      this.root.addEventListener('click', this._onClick);
      this.root.addEventListener('keydown', this._onKey);
      this.screens.addEventListener('pointerdown', this._onDown);
      this.screens.addEventListener('pointerup', this._onUp);
      this.screens.addEventListener('pointercancel', this._onUp);
      // a hover, a touch or keyboard focus on the controls or the pictures: fetch what is likely next
      for (const t of ['pointerenter', 'pointerdown', 'focusin']) this.root.addEventListener(t, this._onIntent, true);
      this.setOptions(Object.assign({}, DEFAULTS, options));
    }

    /* ---------- views ---------- */
    // dir: +1 forward, -1 back; the pictures and the tab label slide that way
    select(i, dir) {
      const n = this.tabs.length;
      if (!n) return;
      i = ((i % n) + n) % n;
      if (i === this.index) return;
      const first = this.index < 0;
      dir = dir || (first ? 1 : Math.sign(i - this.index));
      this.root.style.setProperty('--hero-dir', dir);
      this.index = i;
      this.tabs.forEach((tab, k) => {
        tab.setAttribute('aria-selected', k === i);
        tab.tabIndex = k === i ? 0 : -1;
      });
      const d = this.tabs[i].dataset;
      this._swapImage('desktop', d, dir, 0);
      this._swapImage('phone', d, dir, this.options.stagger);
      this.root.dispatchEvent(new CustomEvent('hero:view', { detail: { index: i } }));
      // someone who just switched will likely switch again: warm the next step, but not on page load
      if (!first) this._warmAround(i);
    }
    prev() { this.select(this.index - 1, -1); }
    next() { this.select(this.index + 1, 1); }

    /* ---------- pictures ----------
       Each screen is <picture><source type="image/avif" srcset><img src srcset sizes></picture>
       (or a bare <img>). A tab carries the same set in data-<which>, data-<which>-srcset,
       data-<which>-avif. Nothing beyond the first view loads on page load; the rest is
       fetched on intent (hover, touch, a switch) and always decoded before it is shown. */
    _pic(which) { const p = this.img[which].parentElement; return p && p.tagName === 'PICTURE' ? p : null; }
    _srcOf(which, d) { return [d[which] || '', d[which + 'Srcset'] || '', d[which + 'Avif'] || '']; }
    // a detached <picture> with the same sources and sizes, so the browser fetches exactly the
    // candidate the real one will use, and it is warm in the cache when it is shown
    _load(which, d, priority) {
      const [src, srcset, avif] = this._srcOf(which, d);
      const img = this.img[which];
      const pic = document.createElement('picture');
      if (avif) { const s = document.createElement('source'); s.type = 'image/avif'; s.srcset = avif; if (img.sizes) s.sizes = img.sizes; pic.append(s); }
      const pre = new Image();
      // into the picture before any source is set, or the img would start on the WebP
      // fallback and the AVIF on top of it
      pic.append(pre);
      if (img.sizes) pre.sizes = img.sizes;
      if (srcset) pre.srcset = srcset;
      if ('fetchPriority' in pre) pre.fetchPriority = priority || 'low';
      pre.src = src;
      this._warmed.add(src);
      return pre;
    }
    _swapImage(which, d, dir, delay) {
      const img = this.img[which];
      const [src, srcset, avif] = this._srcOf(which, d);
      if (!img || !src) return;
      const pic = this._pic(which), source = pic && pic.querySelector('source[type="image/avif"]');
      if (img.getAttribute('src') === src && (img.getAttribute('srcset') || '') === srcset && (!source || (source.getAttribute('srcset') || '') === avif)) return;
      // decode off screen first, so the crossfade never shows a half-loaded picture
      const pre = this._load(which, d, 'high');
      this._pending[which] = pre;
      const decoded = el => (el.decode ? el.decode() : Promise.resolve()).catch(() => {});
      const commit = () => {
        if (source) source.srcset = avif;
        if (srcset) img.srcset = srcset; else img.removeAttribute('srcset');
        img.src = src;
      };
      decoded(pre).then(() => {
        if (this._pending[which] !== pre) return; // a newer tab won
        const ms = this.options.fade;
        if (!(ms > 0)) { commit(); return; }
        // the visible picture is never touched while anything moves: the new one, already
        // decoded, is laid on top and shown; only once it is fully opaque does the real
        // picture take the new sources underneath, and the layer goes away after that has
        // decoded too. So there is no frame with a blank or half-ready picture
        const layer = pre.parentElement;
        layer.className = 'hero__ghost';
        (pic || img).after(layer);
        const layers = this._ghost[which] = (this._ghost[which] || []).concat(layer);
        const [into, out] = (SWITCH[this.options.switch] || SWITCH.fade)(dir, this.options.strength);
        const ease = 'cubic-bezier(.45, 0, .2, 1)'; // even in and out: a change, not a snap
        if (out) img.animate(out, { duration: ms, easing: ease, delay: delay || 0 }); // the img only: the picture keeps the frame sharp and clips the blur
        layer.animate(into, { duration: ms, easing: ease, delay: delay || 0, fill: 'both' }).finished.then(async () => {
          if (this._pending[which] !== pre) return; // superseded; the newer layer will clean up
          commit();
          await decoded(img);
          for (const l of layers) l.remove();
          this._ghost[which] = null;
        }, () => {});
      });
    }
    _warm(i) {
      const n = this.tabs.length;
      const d = this.tabs[((i % n) + n) % n].dataset;
      for (const which of ['desktop', 'phone']) if (d[which] && !this._warmed.has(d[which])) this._load(which, d);
    }
    _warmAround(i) { this._warm(i - 1); this._warm(i + 1); }

    /* ---------- main / thumb ---------- */
    show(main) {
      main = main === 'phone' ? 'phone' : 'desktop';
      this.options.main = main;
      if (this.screens.dataset.main === main) return;
      this.screens.dataset.main = main;
      this.screens.dataset.swapped = ''; // unlocks the in-flight keyframes; absent on page load
      this.root.dispatchEvent(new CustomEvent('hero:main', { detail: { main } }));
    }
    toggle() { this.show(this.screens.dataset.main === 'phone' ? 'desktop' : 'phone'); }

    /* ---------- options ---------- */
    setOptions(patch) {
      const o = Object.assign(this.options, patch);
      const s = this.root.style;
      s.setProperty('--hero-swap', o.duration + 'ms');
      s.setProperty('--hero-ease', o.easing);
      // overshoot 0 falls back to the plain curve; otherwise a back-out whose bounce grows with the value
      s.setProperty('--hero-ease-grow', o.overshoot > 0 ? `cubic-bezier(.3, ${1 + o.overshoot}, .4, 1)` : o.easing);
      s.setProperty('--hero-tilt', o.tilt + 'deg');
      s.setProperty('--hero-tilt-in', o.tiltIn + 'deg');
      s.setProperty('--hero-fly', o.fly + 'px');
      this.root.classList.toggle('hero--no-entrance', !o.entrance);
      s.setProperty('--hero-fade', o.fade + 'ms');
      this.root.classList.toggle('hero--no-swap', !o.swap);
      this.root.classList.toggle('hero--no-hint', !o.hint);
      this.root.classList.toggle('hero--no-lift', !o.lift);
      if ('view' in patch || this.index < 0) this.select(o.view);
      if ('main' in patch) this.show(o.main);
    }

    destroy() {
      for (const t of ['pointerenter', 'pointerdown', 'focusin']) this.root.removeEventListener(t, this._onIntent, true);
      this.root.removeEventListener('click', this._onClick);
      this.root.removeEventListener('keydown', this._onKey);
      this.screens.removeEventListener('pointerdown', this._onDown);
      this.screens.removeEventListener('pointerup', this._onUp);
      this.screens.removeEventListener('pointercancel', this._onUp);
    }

    /* ---------- events ---------- */
    // pointerenter does not bubble, so this listens in the capture phase on the root
    _intent(e) {
      const t = e.target.closest && e.target.closest('.hero__tab, .hero__arrow, .hero__screens');
      // hovering the pictures is not intent (the cursor often just rests there on load); a touch on them is
      if (!t || (e.type === 'pointerenter' && t.classList.contains('hero__screens'))) return;
      if (t.classList.contains('hero__tab')) this._warm(this.tabs.indexOf(t));
      else this._warmAround(this.index);
    }
    _click(e) {
      const t = e.target.closest('.hero__tab, .hero__arrow, .hero__screen');
      if (!t || !this.root.contains(t)) return;
      if (t.classList.contains('hero__tab')) this.select(this.tabs.indexOf(t));
      else if (t.classList.contains('hero__arrow')) this[t.classList.contains('hero__arrow--prev') ? 'prev' : 'next']();
      else if (this._swiped) this._swiped = false; // the tap that ends a swipe is not a tap
      else if (this.options.swap && t.dataset.screen !== this.screens.dataset.main && this._swappable()) {
        this.show(t.dataset.screen);
        // the picture grows towards the bottom; keep the whole stage on screen
        this.screens.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    // horizontal swipe over the screenshots steps through the views (touch and pen only; hero.css sets touch-action: pan-y)
    _down(e) {
      this._swipe = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
    }
    _up(e) {
      const s = this._swipe;
      this._swipe = null;
      if (!s || e.type === 'pointercancel') return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      // browsers usually drop the click after a moved touch, but not always; swallow one if it comes right away
      this._swiped = true;
      setTimeout(() => { this._swiped = false; }, 300);
      this[dx < 0 ? 'next' : 'prev']();
    }
    // hero.css sets --hero-swappable: 1 in the narrow composition; wide, the screenshots are decorative
    _swappable() { return getComputedStyle(this.screens).getPropertyValue('--hero-swappable').trim() === '1'; }
    _key(e) {
      if (!e.target.closest('.hero__tablist') || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      this[e.key === 'ArrowRight' ? 'next' : 'prev']();
      this.tabs[this.index].focus();
    }
  }

  Hero.defaults = DEFAULTS;
  global.Hero = Hero;
})(window);
