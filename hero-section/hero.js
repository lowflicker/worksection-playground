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
   pictures of its view in data-desktop / data-phone; a tab without them
   keeps the pictures that are already shown.

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
    easing: 'cubic-bezier(.22, 1, .36, 1)',
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
      // one delegated listener each: tabs, arrows and screenshots all live under the root
      this._onClick = e => this._click(e);
      this._onKey = e => this._key(e);
      this.root.addEventListener('click', this._onClick);
      this.root.addEventListener('keydown', this._onKey);
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
      this._swapImage('desktop', d.desktop);
      this._swapImage('phone', d.phone);
      this.root.dispatchEvent(new CustomEvent('hero:view', { detail: { index: i } }));
    }
    prev() { this.select(this.index - 1); }
    next() { this.select(this.index + 1); }

    _swapImage(which, src) {
      const img = this.img[which];
      if (!img || !src || img.getAttribute('src') === src) return;
      // decode off screen first, so the crossfade never shows a half-loaded picture
      const pre = new Image();
      pre.src = src;
      this._pending[which] = pre;
      const ready = pre.decode ? pre.decode().catch(() => {}) : Promise.resolve();
      ready.then(() => {
        if (this._pending[which] !== pre) return; // a newer tab won
        img.src = src;
        if (this.options.fade > 0) img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.options.fade, easing: 'ease-out' });
      });
    }

    /* ---------- main / thumb ---------- */
    show(main) {
      main = main === 'phone' ? 'phone' : 'desktop';
      this.options.main = main;
      if (this.screens.dataset.main === main) return;
      this.screens.dataset.main = main;
      this.root.dispatchEvent(new CustomEvent('hero:main', { detail: { main } }));
    }
    toggle() { this.show(this.screens.dataset.main === 'phone' ? 'desktop' : 'phone'); }

    /* ---------- options ---------- */
    setOptions(patch) {
      const o = Object.assign(this.options, patch);
      const s = this.root.style;
      s.setProperty('--hero-swap', o.duration + 'ms');
      s.setProperty('--hero-ease', o.easing);
      s.setProperty('--hero-fade', o.fade + 'ms');
      this.root.classList.toggle('hero--no-swap', !o.swap);
      this.root.classList.toggle('hero--no-hint', !o.hint);
      if ('view' in patch || this.index < 0) this.select(o.view);
      if ('main' in patch) this.show(o.main);
    }

    destroy() {
      this.root.removeEventListener('click', this._onClick);
      this.root.removeEventListener('keydown', this._onKey);
    }

    /* ---------- events ---------- */
    _click(e) {
      const t = e.target.closest('.hero__tab, .hero__arrow, .hero__screen');
      if (!t || !this.root.contains(t)) return;
      if (t.classList.contains('hero__tab')) this.select(this.tabs.indexOf(t));
      else if (t.classList.contains('hero__arrow')) this[t.classList.contains('hero__arrow--prev') ? 'prev' : 'next']();
      else if (this.options.swap && t.dataset.screen !== this.screens.dataset.main && this._swappable()) this.show(t.dataset.screen);
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
