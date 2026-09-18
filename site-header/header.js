/* ============================================================
   Site header — behaviour for the worksection.com top bar
   ============================================================
   Enhances the markup described in header.css. Three jobs, nothing else:

   1. Compact on scroll. A 1 px sentinel goes in front of the header and an
      IntersectionObserver watches it: once it is scrolled out, the header gets
      .site-header--compact and the pill narrows. No scroll listener, and it
      works whether the page scrolls the window or an inner element.
   2. Dropdown panels. Hover (with a small delay, pointer devices only), focus
      and click open a .site-header__group; Escape, a click outside or leaving
      the group close it.
   3. The mobile sheet. Built once from the nav and the actions, so the menu is
      written a single time in the markup. The burger toggles it, the scroll
      container is locked while it is open (its scrollbar width is handed back
      as padding, or the page would jump sideways), Escape closes it, and it
      closes itself if the bar grows back into the wide layout.
      Opening is a transition, not a swap: the state is a class and an
      aria-expanded, everything visible is hidden by visibility rather than by
      display or [hidden], and CSS eases the pill into the flat bar over
      --sh-speed. JS sets no styles for it beyond --sh-sheet-h.

   API:
     const bar = new SiteHeader('#header', { compactAfter: 24 })
     bar.open() / bar.close() / bar.toggle()   the mobile sheet
     bar.setOptions(patch)                     any option on the fly
     bar.destroy()

   Events on the root: 'header:compact' { compact }, 'header:open', 'header:close'.
   No dependencies. */
(function () {
  'use strict';

  const DEFAULTS = {
    sticky: true,        // false: the bar scrolls away with the page
    compact: true,       // narrow the pill once the page has scrolled
    compactAfter: 24,    // px of scroll before it compacts
    trigger: 'hover',    // 'hover' | 'click': how the dropdowns open on pointer devices (touch and keyboard always click / focus)
    hoverDelay: 60,      // ms before a hovered panel opens
    closeDelay: 160,     // ms of grace when the pointer leaves a group
  };

  const CHEVRON_R = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.9 10.21 8.42 13.94c-.17.14-.42.02-.42-.21V6.27c0-.23.25-.35.42-.21l4.48 3.73c.13.11.13.31 0 .42Z"/></svg>';

  class SiteHeader {
    constructor(el, options) {
      this.root = typeof el === 'string' ? document.querySelector(el) : el;
      this.options = Object.assign({}, DEFAULTS, options);
      this.bar = this.root.querySelector('.site-header__bar');
      this.burger = this.root.querySelector('.site-header__burger');
      this.groups = Array.from(this.root.querySelectorAll('.site-header__group'));
      this._timers = new Map();
      this._open = null;

      this.sentinel = document.createElement('span');
      this.sentinel.className = 'site-header__sentinel';
      this.sentinel.setAttribute('aria-hidden', 'true');
      this.sentinel.style.cssText = 'display:block;position:relative;height:1px;margin-bottom:-1px;pointer-events:none;visibility:hidden';
      this.root.before(this.sentinel);

      this.sheet = this.root.querySelector('.site-header__sheet') || this._buildSheet();

      this._onOver = this._over.bind(this);
      this._onOut = this._out.bind(this);
      this._onClick = this._click.bind(this);
      this._onFocus = this._focus.bind(this);
      this._onKey = this._key.bind(this);
      this._onOutside = this._outside.bind(this);
      this.root.addEventListener('pointerover', this._onOver);
      this.root.addEventListener('pointerout', this._onOut);
      this.root.addEventListener('click', this._onClick);
      this.root.addEventListener('focusin', this._onFocus);
      this.root.addEventListener('focusout', this._onFocus);
      this.root.addEventListener('keydown', this._onKey);
      // the wide layout has no sheet: if the bar grows back into it, close
      this._ro = new ResizeObserver(() => { if (this.isOpen && this.root.clientWidth >= 1240) this.close(); });
      this._ro.observe(this.root);

      this.setOptions(this.options);
    }

    /* ---------- options ---------- */
    setOptions(patch) {
      Object.assign(this.options, patch);
      const o = this.options;
      this.root.classList.toggle('site-header--static', !o.sticky);
      this.sentinel.style.top = o.compactAfter + 'px';
      if (this._io) { this._io.disconnect(); this._io = null; }
      if (o.compact && o.sticky && 'IntersectionObserver' in window) {
        this._io = new IntersectionObserver(([e]) => this._compact(!e.isIntersecting), { threshold: 0 });
        this._io.observe(this.sentinel);
      } else this._compact(false);
    }
    _compact(on) {
      if (this.root.classList.contains('site-header--compact') === on) return;
      this.root.classList.toggle('site-header--compact', on);
      this.root.dispatchEvent(new CustomEvent('header:compact', { detail: { compact: on } }));
    }

    /* ---------- dropdowns ---------- */
    _groupOf(t) { return t.closest && t.closest('.site-header__group'); }
    _hoverable() { return this.options.trigger === 'hover' && matchMedia('(hover: hover) and (pointer: fine)').matches; }
    _over(e) {
      const g = this._groupOf(e.target);
      if (!g || !this._hoverable()) return;
      clearTimeout(this._timers.get(g));
      if (!g.hasAttribute('data-open')) this._timers.set(g, setTimeout(() => this._show(g), this.options.hoverDelay));
    }
    _out(e) {
      const g = this._groupOf(e.target);
      if (!g || !this._hoverable() || (e.relatedTarget && g.contains(e.relatedTarget))) return;
      clearTimeout(this._timers.get(g));
      if (g.hasAttribute('data-open')) this._timers.set(g, setTimeout(() => this._hide(g), this.options.closeDelay));
    }
    _focus(e) {
      const g = this._groupOf(e.target);
      if (e.type === 'focusin') { if (g) this._show(g); else this._hideAll(); return; }
      // focusout: closed only when focus really leaves the group
      if (g && !(e.relatedTarget && g.contains(e.relatedTarget))) this._hide(g);
    }
    _show(g) {
      clearTimeout(this._timers.get(g));
      if (this._open && this._open !== g) this._hide(this._open);
      g.setAttribute('data-open', '');
      g.querySelector('.site-header__item').setAttribute('aria-expanded', 'true');
      this._open = g;
      document.addEventListener('pointerdown', this._onOutside, true);
    }
    _hide(g) {
      clearTimeout(this._timers.get(g));
      g.removeAttribute('data-open');
      g.querySelector('.site-header__item').setAttribute('aria-expanded', 'false');
      if (this._open === g) { this._open = null; document.removeEventListener('pointerdown', this._onOutside, true); }
    }
    _hideAll() { if (this._open) this._hide(this._open); }
    _outside(e) { if (this._open && !this._open.contains(e.target)) this._hideAll(); }

    /* ---------- events ---------- */
    _click(e) {
      const t = e.target.closest('.site-header__item[aria-expanded], .site-header__burger, .site-header__sheet-item[aria-expanded]');
      if (!t) return;
      if (t.classList.contains('site-header__burger')) { this.toggle(); return; }
      if (t.classList.contains('site-header__sheet-item')) {
        // the group's own aria-expanded drives the reveal, so CSS can ease it
        t.setAttribute('aria-expanded', t.getAttribute('aria-expanded') !== 'true');
        return;
      }
      e.preventDefault();
      const g = this._groupOf(t);
      g.hasAttribute('data-open') ? this._hide(g) : this._show(g);
    }
    _key(e) {
      if (e.key !== 'Escape') return;
      if (this.isOpen) { this.close(); this.burger.focus(); return; }
      if (this._open) { const g = this._open; this._hide(g); g.querySelector('.site-header__item').focus(); }
    }

    /* ---------- mobile sheet ---------- */
    get isOpen() { return this.root.classList.contains('site-header--open'); }
    open() {
      if (this.isOpen) return;
      this._hideAll();
      const sc = this._scroller();
      // locking the scroller takes its scrollbar away, which would shift the page
      // sideways under the sheet: give the width back as padding
      const bar = sc === document.documentElement
        ? innerWidth - document.documentElement.clientWidth
        : sc.offsetWidth - sc.clientWidth;
      this._lock = { el: sc, overflow: sc.style.overflow, pad: sc.style.paddingRight };
      sc.style.overflow = 'hidden';
      if (bar > 0) sc.style.paddingRight = (parseFloat(getComputedStyle(sc).paddingRight) || 0) + bar + 'px';
      if (sc !== document.documentElement) this.root.style.setProperty('--sh-sheet-h', sc.clientHeight + 'px');
      this.root.classList.add('site-header--open');
      this.burger.setAttribute('aria-expanded', 'true');
      this.root.dispatchEvent(new CustomEvent('header:open'));
    }
    close() {
      if (!this.isOpen) return;
      this.root.classList.remove('site-header--open');
      this.burger.setAttribute('aria-expanded', 'false');
      if (this._lock) {
        this._lock.el.style.overflow = this._lock.overflow;
        this._lock.el.style.paddingRight = this._lock.pad;
        this._lock = null;
      }
      // the sheet keeps its height until the fade is over, or it would collapse mid-way
      const done = () => this.root.style.removeProperty('--sh-sheet-h');
      if (this._fade) clearTimeout(this._fade);
      this._fade = setTimeout(done, this._speed());
      this.root.dispatchEvent(new CustomEvent('header:close'));
    }
    // the sheet's own fade length, so JS never hardcodes what CSS owns
    _speed() {
      const raw = getComputedStyle(this.root).getPropertyValue('--sh-speed').trim();
      const ms = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : 300;
      return ms > 0 ? ms : 300;
    }
    toggle() { this.isOpen ? this.close() : this.open(); }
    // the nearest ancestor that actually scrolls, else the document
    _scroller() {
      for (let el = this.root.parentElement; el && el !== document.body; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      }
      return document.documentElement;
    }
    _buildSheet() {
      const sheet = document.createElement('div');
      sheet.className = 'site-header__sheet';
      const nav = document.createElement('nav');
      nav.className = 'site-header__sheet-nav';
      nav.setAttribute('aria-label', (this.root.querySelector('.site-header__menu') || {}).getAttribute?.('aria-label') || 'Menu');
      for (const item of this.root.querySelectorAll('.site-header__menu .site-header__item')) {
        const wrap = document.createElement('div');
        wrap.className = 'site-header__sheet-group';
        const g = this._groupOf(item);
        const links = g ? g.querySelectorAll('.site-header__link') : [];
        const head = document.createElement(links.length ? 'button' : 'a');
        head.className = 'site-header__sheet-item';
        head.textContent = item.querySelector('span').textContent;
        if (links.length) {
          head.type = 'button';
          head.setAttribute('aria-expanded', 'false');
          head.insertAdjacentHTML('beforeend', CHEVRON_R);
          // two elements, not one: the outer row is what animates from 0fr to 1fr,
          // the inner one keeps the links at their natural height to be clipped to
          const sub = document.createElement('div');
          sub.className = 'site-header__sheet-sub';
          const list = document.createElement('div');
          list.className = 'site-header__sheet-list';
          for (const l of links) {
            const a = document.createElement('a');
            a.className = 'site-header__sheet-link';
            a.href = l.getAttribute('href');
            a.textContent = l.firstChild.textContent.trim();
            list.append(a);
          }
          sub.append(list);
          wrap.append(head, sub);
        } else {
          head.href = item.getAttribute('href');
          wrap.append(head);
        }
        nav.append(wrap);
      }
      const foot = document.createElement('div');
      foot.className = 'site-header__sheet-foot';
      for (const b of this.root.querySelectorAll('.site-header__actions > :not(.btn-primary):not(.site-header__burger)')) foot.append(b.cloneNode(true));
      sheet.append(nav, foot);
      this.root.append(sheet);
      return sheet;
    }

    destroy() {
      this.close();
      this._hideAll();
      if (this._io) this._io.disconnect();
      this._ro.disconnect();
      for (const t of this._timers.values()) clearTimeout(t);
      if (this._fade) { clearTimeout(this._fade); this._fade = null; this.root.style.removeProperty('--sh-sheet-h'); }
      this.sentinel.remove();
      this.root.removeEventListener('pointerover', this._onOver);
      this.root.removeEventListener('pointerout', this._onOut);
      this.root.removeEventListener('click', this._onClick);
      this.root.removeEventListener('focusin', this._onFocus);
      this.root.removeEventListener('focusout', this._onFocus);
      this.root.removeEventListener('keydown', this._onKey);
    }
  }

  SiteHeader.defaults = DEFAULTS;
  window.SiteHeader = SiteHeader;
})();
