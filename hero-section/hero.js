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
   pictures of its view in data-desktop / data-phone (plus optional
   data-desktop-srcset / data-phone-srcset; the <img> keeps its own
   `sizes`); a tab without them keeps the pictures that are already shown.
   On touch screens a horizontal swipe over the screenshots steps through
   the views; the neighbouring views' pictures are prefetched when idle.

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
    nudge: true,         // once, when the screenshots scroll into view: the phone bobs and the badge pulses
    duration: 600,       // ms, the swap
    easing: 'cubic-bezier(.22, 1, .36, 1)',   // the picture that shrinks
    overshoot: 0.2,      // the picture that grows: 0 = same curve as easing, 0.4 = a clear bounce
    tilt: 3,             // deg, how much the pictures lean at mid-flight; 0 = none
    lift: true,          // extra shadow under the phone while it moves
    fade: 300,           // ms, screenshot crossfade on a tab change
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
      this._warm = new Set();
      // one delegated listener each: tabs, arrows and screenshots all live under the root
      this._onClick = e => this._click(e);
      this._onKey = e => this._key(e);
      this._onDown = e => this._down(e);
      this._onUp = e => this._up(e);
      this.root.addEventListener('click', this._onClick);
      this.root.addEventListener('keydown', this._onKey);
      this.screens.addEventListener('pointerdown', this._onDown);
      this.screens.addEventListener('pointerup', this._onUp);
      this.screens.addEventListener('pointercancel', this._onUp);
      this.setOptions(Object.assign({}, DEFAULTS, options));
    }

    /* ---------- views ---------- */
    select(i) {
      const n = this.tabs.length;
      if (!n) return;
      i = ((i % n) + n) % n;
      if (i === this.index) return;
      this.index = i;
      this.tabs.forEach((tab, k) => {
        tab.setAttribute('aria-selected', k === i);
        tab.tabIndex = k === i ? 0 : -1;
      });
      const d = this.tabs[i].dataset;
      this._swapImage('desktop', d.desktop, d.desktopSrcset);
      this._swapImage('phone', d.phone, d.phoneSrcset);
      this.root.dispatchEvent(new CustomEvent('hero:view', { detail: { index: i } }));
      // warm the neighbours while nothing else is going on, so the next step is instant
      const idle = window.requestIdleCallback || (fn => setTimeout(fn, 300));
      idle(() => { if (this.index === i) { this._prefetch(i - 1); this._prefetch(i + 1); } });
    }
    prev() { this.select(this.index - 1); }
    next() { this.select(this.index + 1); }

    // a detached <img> with the same sizes picks the same srcset candidate the real one will
    _load(which, src, srcset) {
      const pre = new Image();
      if (this.img[which] && this.img[which].sizes) pre.sizes = this.img[which].sizes;
      if (srcset) pre.srcset = srcset;
      pre.src = src;
      this._warm.add(src);
      return pre;
    }
    _swapImage(which, src, srcset) {
      const img = this.img[which];
      srcset = srcset || '';
      if (!img || !src || (img.getAttribute('src') === src && (img.getAttribute('srcset') || '') === srcset)) return;
      // decode off screen first, so the crossfade never shows a half-loaded picture
      const pre = this._load(which, src, srcset);
      this._pending[which] = pre;
      const ready = pre.decode ? pre.decode().catch(() => {}) : Promise.resolve();
      ready.then(() => {
        if (this._pending[which] !== pre) return; // a newer tab won
        if (srcset) img.srcset = srcset; else img.removeAttribute('srcset');
        img.src = src;
        if (this.options.fade > 0) img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.options.fade, easing: 'ease-out' });
      });
    }
    _prefetch(i) {
      const n = this.tabs.length;
      const d = this.tabs[((i % n) + n) % n].dataset;
      for (const which of ['desktop', 'phone']) {
        const src = d[which];
        if (!src || this._warm.has(src)) continue;
        this._warm.add(src);
        this._load(which, src, d[which + 'Srcset']);
      }
    }

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
      s.setProperty('--hero-fade', o.fade + 'ms');
      this.root.classList.toggle('hero--no-swap', !o.swap);
      this.root.classList.toggle('hero--no-hint', !o.hint);
      this.root.classList.toggle('hero--no-lift', !o.lift);
      this._watchNudge(o.nudge && o.swap);
      if ('view' in patch || this.index < 0) this.select(o.view);
      if ('main' in patch) this.show(o.main);
    }

    // the nudge fires once, the first time most of the stage is on screen; hero.css does the motion
    _watchNudge(on) {
      if (!on) {
        if (this._io) { this._io.disconnect(); this._io = null; }
        delete this.screens.dataset.nudge;
        return;
      }
      if (this._io || 'nudge' in this.screens.dataset || !('IntersectionObserver' in window)) return;
      this._io = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        this._io.disconnect();
        this._io = null;
        if (this.options.nudge) this.screens.dataset.nudge = '';
      }, { threshold: 0.6 });
      this._io.observe(this.screens);
    }

    destroy() {
      if (this._io) this._io.disconnect();
      this.root.removeEventListener('click', this._onClick);
      this.root.removeEventListener('keydown', this._onKey);
      this.screens.removeEventListener('pointerdown', this._onDown);
      this.screens.removeEventListener('pointerup', this._onUp);
      this.screens.removeEventListener('pointercancel', this._onUp);
    }

    /* ---------- events ---------- */
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
