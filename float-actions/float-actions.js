/* ==========================================================================
   FloatActions
   Support and callback buttons floating over the site. No dependencies.
   The buttons only behave on the page; a click hands over to a third-party
   widget (chat, callback) that you load on demand.

   new FloatActions(document.body, options)

   Options (every key has a default, see FloatActions.defaults):
     actions          [{ id, icon: 'chat' | 'phone' | '<svg…>', label }]
                      top to bottom; the bottom one is the anchor the others tuck behind
     t                translation: a function key => string, or a dictionary { key: string }.
                      Every text option (label, nudgeMessage, strings.*) is a key passed through it;
                      without `t` the key is shown as is. Change language with setOptions({ t })
     strings          { dismiss } keys for the module's own texts
     onAction         (id, fa) => {}   click on a button. Load your widget here:
                        fa.loading(id)  spinner while the script loads
                        fa.active(id)   widget is open: cross icon, other buttons step aside
                        fa.idle(id)     widget closed
     onClose          (id, fa) => {}   click on the cross or Escape while active. Close your widget, then fa.idle(id)
     whenActive       'others' | 'all' | 'none'
                      what the other buttons do while a widget is open: step aside, all hide
                      (the widget has its own close), or stay
     whenActiveCompact  same under `compactBelow`; default 'all', mobile widgets are full screen
                      with their own close and sit above our buttons

     size             px, button diameter
     gap              px between buttons
     offset           { right, bottom } px from the corner
     color            button colour
     hoverScale       1.05 in the design

     showAfter        px scrolled before the buttons appear (0 = right away)
     enterDelay       ms before the first appearance
     labels           show the tooltip label on hover
     labelDelay       ms the pointer has to rest before the label shows

     fold             tuck the upper buttons behind the anchor while scrolling down;
                      they come back on scrolling up, near the top of the page, or on hover.
                      On touch the first tap on a folded stack only unfolds it.
                      Direction only, no timers, so slow step-by-step scrolling never flickers
     foldAfter        px in one direction before the state flips (hysteresis)
     unfoldDelay      ms of no scrolling before they come back on their own; 0 = never (default)
     peek             px of the tucked button showing above the anchor

     nudge            after a quiet period, ring the first button and show a message
     nudgeAfter       ms without interaction
     nudgeMessage     text in the bubble
     bubbleFor        ms the bubble stays (hovering it pauses the clock)

     avoid            selector of elements the buttons must not cover (footer)
     avoidMode        'lift' | 'hide' | 'none'

     easing           CSS easing for enter and unfold
     compactBelow     px, container width under which the buttons shrink to 48
     fixed            false when mounted inside a scrolling frame instead of the window
     scroller         element that scrolls (default: window)

   Methods: loading(id), active(id), idle(id), nudge(), show(), hide(), fold(), unfold(),
            setOptions(patch), reset(), destroy()
   Events on the layer element: 'fa:show', 'fa:action' ({ id }), 'fa:close' ({ id }), 'fa:nudge'
   ========================================================================== */

(function (global) {
  'use strict';

  const ICONS = {
    chat: '<svg class="fa__icon fa__icon--main fa__icon--chat" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 23.549C21.18 23.549 27 18.502 27 12.275 27 6.048 21.18 1 14 1S1 6.048 1 12.275c0 1.83.965 4.109 1.857 5.637 1.37 2.348 1.44 5.392.58 7.124-.812 1.657.855 2.443 1.625 1.657 1.625-1.657 5.47-3.144 8.938-3.144Z" fill="currentColor"/></svg>',
    phone: '<svg class="fa__icon fa__icon--main fa__icon--phone" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.65 2.531a1.4 1.4 0 0 0-1.98 0l-.907.907a7.7 7.7 0 0 0-1.659 2.471c-.657 1.568-.923 3.291-.317 4.879.778 2.039 2.42 5.138 5.853 8.572 3.434 3.434 6.533 5.075 8.572 5.853 1.588.606 3.311.34 4.879-.317a7.7 7.7 0 0 0 2.47-1.658l.908-.908a1.4 1.4 0 0 0 0-1.98L21 16c-1.602-1.602-2.786.739-3.55 1.638-.475.561-2.313-.227-4.611-2.526-2.299-2.298-3.087-4.136-2.527-4.612C11.212 9.737 13.602 8.602 12 7L7.65 2.531Z" fill="currentColor"/></svg>',
    close: '<svg class="fa__icon fa__icon--close" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7l14 14M21 7L7 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  const defaults = {
    actions: [
      { id: 'support', icon: 'chat', label: 'fa.support.label' },
      { id: 'ringostat', icon: 'phone', label: 'fa.ringostat.label' },
    ],
    t: {
      'fa.support.label': 'Chat with us',
      'fa.ringostat.label': 'Request a call',
      'fa.nudge.message': 'Hi! Need help choosing a plan?',
      'fa.dismiss': 'Dismiss',
    },
    strings: { dismiss: 'fa.dismiss' },
    onAction: null,
    onClose: null,
    whenActive: 'others',
    whenActiveCompact: 'all',

    size: 56,
    gap: 8,
    offset: { right: 24, bottom: 24 },
    color: '#4a83f4',
    hoverScale: 1.05,

    showAfter: 0,
    enterDelay: 600,
    labels: true,
    labelDelay: 80,

    fold: true,
    foldAfter: 32,
    unfoldDelay: 0,
    peek: 6,

    nudge: true,
    nudgeAfter: 8000,
    nudgeMessage: 'fa.nudge.message',
    bubbleFor: 7000,

    avoid: '[data-fa-avoid]',
    avoidMode: 'lift',

    easing: 'cubic-bezier(.22, 1, .36, 1)',
    compactBelow: 640,
    fixed: true,
    scroller: null,
  };

  const reduced = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = () => global.matchMedia && global.matchMedia('(hover: none)').matches;
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const merge = (base, patch) => {
    const out = Object.assign({}, base);
    for (const k in patch) {
      const v = patch[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Node) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])
        ? Object.assign({}, base[k], v) : v;
    }
    return out;
  };
  const hexToRgb = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255].join(', ');
  };

  class FloatActions {
    constructor(root, options = {}) {
      this.root = typeof root === 'string' ? document.querySelector(root) : (root || document.body);
      this.options = merge(defaults, options);
      this.activeId = null;
      this.shown = false;
      this.folded = false;
      this.nudged = false;
      this.lastY = 0;
      this._down = 0;        // scroll accumulated in the current direction
      this._up = 0;
      this._shownAt = 0;
      this._timers = {};

      this._build();
      this._applyTokens();
      this._bind();
      this._measure();
      this.lastY = this._scrollTop();
      this._avoid();
      this._scheduleShow();
    }

    /** key -> text through options.t (function or dictionary); the key itself as a fallback */
    _t(key) {
      const t = this.options.t;
      if (!key) return '';
      const out = typeof t === 'function' ? t(key) : t && typeof t === 'object' ? t[key] : undefined;
      return out == null ? key : out;
    }

    /** (re)apply every visible text, e.g. after a language change */
    _texts() {
      this.items.forEach(it => {
        const label = this._t(it.a.label);
        it.btn.setAttribute('aria-label', label);
        it.label.textContent = label;
        it.bubbleX.setAttribute('aria-label', this._t(this.options.strings.dismiss));
        if (it.item.classList.contains('has-bubble')) it.bubbleText.textContent = this._t(this.options.nudgeMessage);
      });
    }

    /* ---- build ---------------------------------------------------------- */

    _build() {
      const o = this.options;
      this.layer = el('div', 'fa is-hidden');
      this.layer.classList.toggle('fa--absolute', !o.fixed);
      this.stack = el('div', 'fa__stack');

      this.items = o.actions.map(a => {
        const item = el('div', 'fa__item');
        item.dataset.id = a.id;

        const btn = el('button', 'fa__btn');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `${ICONS[a.icon] || a.icon || ''}${ICONS.close}<span class="fa__spin" aria-hidden="true"></span>`;
        btn.addEventListener('animationend', e => {
          if (e.animationName === 'fa-pop') btn.classList.remove('is-nudging');
          if (e.animationName === 'fa-ripple') btn.classList.remove('is-ringing');
        });

        const label = el('span', 'fa__label');
        label.setAttribute('aria-hidden', 'true');
        const bubble = el('div', 'fa__bubble');
        bubble.setAttribute('role', 'status');
        const bubbleText = el('span');
        const bubbleX = el('button', 'fa__bubble-x', ICONS.x);
        bubbleX.type = 'button';
        bubble.append(bubbleText, bubbleX);

        item.append(bubble, label, btn);
        return { a, item, btn, label, bubble, bubbleText, bubbleX };
      });

      this.stack.append(...this.items.map(i => i.item));
      this.layer.append(this.stack);
      this.root.append(this.layer);
      this._texts();
    }

    _applyTokens() {
      const o = this.options, s = this.layer.style;
      s.setProperty('--fa-size', o.size + 'px');
      s.setProperty('--fa-gap', o.gap + 'px');
      s.setProperty('--fa-right', o.offset.right + 'px');
      s.setProperty('--fa-bottom', o.offset.bottom + 'px');
      s.setProperty('--fa-color', o.color);
      s.setProperty('--fa-color-rgb', hexToRgb(o.color) || '74, 131, 244');
      s.setProperty('--fa-hover-scale', o.hoverScale);
      s.setProperty('--fa-peek', o.peek + 'px');
      s.setProperty('--fa-label-delay', o.labelDelay + 'ms');
      s.setProperty('--fa-ease', o.easing);
      this.layer.classList.toggle('no-labels', !o.labels);
      this.layer.classList.toggle('hide-others', o.whenActive === 'others');
      this.layer.classList.toggle('hide-all', o.whenActive === 'all');
      this.layer.classList.toggle('hide-others-compact', o.whenActiveCompact === 'others');
      this.layer.classList.toggle('hide-all-compact', o.whenActiveCompact === 'all');
    }

    /* ---- wiring --------------------------------------------------------- */

    get scroller() { return this.options.scroller || global; }
    _scrollTop() {
      const s = this.scroller;
      // clamp: iOS rubber-banding reports positions past the ends
      const max = s === global ? document.documentElement.scrollHeight - global.innerHeight : s.scrollHeight - s.clientHeight;
      return Math.min(Math.max(0, s === global ? global.scrollY : s.scrollTop), Math.max(0, max));
    }
    _viewport() {
      const s = this.scroller;
      if (s === global) return { top: 0, bottom: global.innerHeight, width: global.innerWidth };
      const r = s.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, width: s.clientWidth };
    }

    _bind() {
      this._onScrollBound = () => this._onScroll();
      this.scroller.addEventListener('scroll', this._onScrollBound, { passive: true });

      this._ro = new ResizeObserver(() => this._measure());
      this._ro.observe(this.options.fixed ? document.documentElement : this.root);

      this.items.forEach(it => {
        it.btn.addEventListener('click', () => this._click(it));
        it.bubble.addEventListener('click', () => { this._bubble(it, false); this._click(it); });
        it.bubbleX.addEventListener('click', e => { e.stopPropagation(); this._touch(); this._bubble(it, false); });
        // hovering the message pauses its clock
        it.bubble.addEventListener('pointerenter', () => clearTimeout(this._timers.bubble));
        it.bubble.addEventListener('pointerleave', () => this._bubbleClock(it, 2500));
        it.item.addEventListener('pointerenter', e => {
          this._touch();
          if (!this.folded) return;
          this.unfold();
          // touch: the tap that unfolds the stack must not also fire the action
          if (e.pointerType === 'touch' || noHover()) this._unfoldedAt = performance.now();
        });
      });

      this._onKey = e => { if (e.key === 'Escape' && this.activeId) this._requestClose(this.activeId); };
      document.addEventListener('keydown', this._onKey);
    }

    _click(it) {
      this._touch();
      const id = it.a.id;
      if (it.btn.classList.contains('is-loading')) return;
      if (performance.now() - (this._unfoldedAt || 0) < 600) return;
      if (this.activeId === id) return this._requestClose(id);
      this.layer.dispatchEvent(new CustomEvent('fa:action', { detail: { id } }));
      if (this.options.onAction) this.options.onAction(id, this);
    }

    _requestClose(id) {
      this.layer.dispatchEvent(new CustomEvent('fa:close', { detail: { id } }));
      if (this.options.onClose) this.options.onClose(id, this);
      else this.idle(id);
    }

    _measure() {
      const o = this.options;
      const w = o.fixed ? global.innerWidth : this.root.clientWidth;
      this.layer.classList.toggle('is-compact', w < o.compactBelow);
      this._avoid();
    }

    _onScroll() {
      const o = this.options;
      const y = this._scrollTop();
      const dy = y - this.lastY;
      this.lastY = y;

      if (!this.shown && o.showAfter > 0 && y >= o.showAfter) this.show();

      // direction with hysteresis: fold after `foldAfter` px down, unfold after the same up.
      // No idle timer by default, so scrolling in small steps keeps one state.
      if (o.fold && this.shown && !this.activeId && performance.now() - this._shownAt > 800) {
        if (dy > 0) { this._up = 0; this._down += dy; }
        else if (dy < 0) { this._down = 0; this._up -= dy; }
        if (y < o.size) this.unfold();
        else if (this._down > o.foldAfter) this.fold();
        else if (this._up > o.foldAfter) this.unfold();
        if (this.folded && o.unfoldDelay > 0) {
          clearTimeout(this._timers.unfold);
          this._timers.unfold = setTimeout(() => this.unfold(), o.unfoldDelay);
        }
      }
      this._avoid();
    }

    _avoid() {
      const o = this.options;
      const lift = () => {
        if (o.avoidMode === 'none' || !o.avoid) return 0;
        const scope = o.scroller || document;
        const v = this._viewport();
        let max = 0;
        scope.querySelectorAll(o.avoid).forEach(n => {
          const r = n.getBoundingClientRect();
          const overlap = v.bottom - r.top;
          if (overlap > 0 && r.bottom > v.top) max = Math.max(max, overlap);
        });
        return Math.min(max, v.bottom - v.top - o.size - o.offset.bottom);
      };
      const px = lift();
      if (o.avoidMode === 'hide') {
        this.layer.style.setProperty('--fa-lift', '0px');
        this.layer.classList.toggle('is-away', px > 0);
      } else {
        this.layer.classList.remove('is-away');
        this.layer.style.setProperty('--fa-lift', (o.avoidMode === 'lift' ? Math.round(px) : 0) + 'px');
      }
    }

    /* ---- show / fold ---------------------------------------------------- */

    _scheduleShow() {
      const o = this.options;
      clearTimeout(this._timers.show);
      if (o.showAfter > 0 && this._scrollTop() < o.showAfter) return;
      this._timers.show = setTimeout(() => this.show(), o.enterDelay);
    }

    /** Pop the buttons in, anchor first, with a little overshoot. */
    show() {
      if (this.shown) return;
      this.shown = true;
      this._shownAt = performance.now();
      this._down = 0;
      this._up = 0;
      const o = this.options;
      const n = this.items.length;
      this.layer.classList.add('is-entering');
      this.layer.classList.remove('is-hidden');
      const anims = this.items.map((it, i) => {
        const delay = (n - 1 - i) * 90;
        if (reduced()) return it.item.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay, fill: 'backwards' }).finished;
        return it.item.animate([
          { opacity: 0, transform: 'translateY(24px) scale(.5)' },
          { opacity: 1, transform: 'translateY(-4px) scale(1.06)', offset: .62 },
          { opacity: 1, transform: 'translateY(1px) scale(.99)', offset: .84 },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ], { duration: 560, delay, easing: o.easing, fill: 'backwards' }).finished;
      });
      Promise.all(anims).then(() => this.layer.classList.remove('is-entering')).catch(() => {});
      this.layer.dispatchEvent(new CustomEvent('fa:show'));
      this._armNudge();
    }

    hide() {
      this.shown = false;
      this.layer.classList.add('is-hidden');
      clearTimeout(this._timers.nudge);
    }

    fold() {
      if (this.folded || this.items.length < 2) return;
      this.folded = true;
      this.layer.classList.add('is-folded');
      this.items.forEach((it, i) => it.item.classList.toggle('is-tucked', i < this.items.length - 1));
    }

    unfold() {
      clearTimeout(this._timers.unfold);
      this._down = 0;
      this._up = 0;
      if (!this.folded) return;
      this.folded = false;
      this.layer.classList.remove('is-folded');
    }

    /* ---- widget states -------------------------------------------------- */

    _item(id) { return this.items.find(i => i.a.id === id); }

    /** The widget script is loading: spinner on the button. */
    loading(id) {
      const it = this._item(id);
      if (!it) return;
      this.unfold();
      it.btn.classList.add('is-loading');
      it.btn.setAttribute('aria-busy', 'true');
    }

    /** The widget is open: cross icon, other buttons step aside. */
    active(id) {
      const it = this._item(id);
      if (!it) return;
      this.unfold();
      this._touch();
      this.items.forEach(i => {
        i.btn.classList.remove('is-loading');
        i.btn.removeAttribute('aria-busy');
        i.item.classList.toggle('is-active', i === it);
        i.btn.setAttribute('aria-pressed', String(i === it));
        this._bubble(i, false);
      });
      this.layer.classList.add('is-open');
      this.activeId = id;
    }

    /** The widget is closed: everything back. */
    idle(id) {
      const it = id ? this._item(id) : null;
      if (it) { it.btn.classList.remove('is-loading'); it.btn.removeAttribute('aria-busy'); }
      if (id && this.activeId !== id) return;
      this.activeId = null;
      this.layer.classList.remove('is-open');
      this.items.forEach(i => { i.item.classList.remove('is-active'); i.btn.setAttribute('aria-pressed', 'false'); });
    }

    /* ---- nudge ---------------------------------------------------------- */

    _armNudge() {
      const o = this.options;
      clearTimeout(this._timers.nudge);
      if (!o.nudge || this.nudged) return;
      this._timers.nudge = setTimeout(() => this.nudge(), o.nudgeAfter);
    }

    /** any interaction: no nudge needed any more */
    _touch() {
      this.nudged = true;
      clearTimeout(this._timers.nudge);
    }

    /** Ring the first button once and show the message. */
    nudge() {
      const o = this.options;
      const it = this.items[0];
      if (!it || !this.shown || this.activeId) return;
      this.nudged = true;
      this.unfold();
      if (!reduced()) {
        it.btn.classList.remove('is-ringing', 'is-nudging');
        void it.btn.offsetWidth;
        it.btn.classList.add('is-ringing', 'is-nudging');
      }
      if (o.nudgeMessage) {
        it.bubbleText.textContent = this._t(o.nudgeMessage);
        // the bubble follows the bounce
        setTimeout(() => { this._bubble(it, true); this._bubbleClock(it, o.bubbleFor); }, reduced() ? 0 : 260);
      }
      this.layer.dispatchEvent(new CustomEvent('fa:nudge'));
    }

    _bubble(it, on) { it.item.classList.toggle('has-bubble', on); if (!on) clearTimeout(this._timers.bubble); }
    _bubbleClock(it, ms) {
      clearTimeout(this._timers.bubble);
      if (it.item.classList.contains('has-bubble')) this._timers.bubble = setTimeout(() => this._bubble(it, false), ms);
    }

    /* ---- public --------------------------------------------------------- */

    setOptions(patch) {
      this.options = merge(this.options, patch);
      const rebuild = ['actions', 'fixed', 'scroller'].some(k => k in patch);
      if (rebuild) {
        const shown = this.shown;
        this.destroy(true);
        this._build();
        this._bind();
        if (shown) { this.shown = false; this.show(); }
      }
      this._applyTokens();
      this._measure();
      if ('t' in patch || 'strings' in patch || 'nudgeMessage' in patch) this._texts();
      if ('nudge' in patch || 'nudgeAfter' in patch) { this.nudged = false; if (this.shown) this._armNudge(); }
      if ('showAfter' in patch && !this.shown) this._scheduleShow();
      if (!this.options.fold) this.unfold();
    }

    /** Back to the state before the first appearance (playground helper). */
    reset() {
      this.idle();
      this.unfold();
      this.hide();
      this.nudged = false;
      this.items.forEach(it => { this._bubble(it, false); it.btn.classList.remove('is-loading', 'is-ringing', 'is-nudging'); });
      this._scheduleShow();
    }

    destroy(keepOptions) {
      Object.values(this._timers).forEach(clearTimeout);
      this.scroller.removeEventListener('scroll', this._onScrollBound);
      this._ro.disconnect();
      document.removeEventListener('keydown', this._onKey);
      this.layer.remove();
      this.activeId = null; this.folded = false; this.shown = false;
      if (!keepOptions) this.items = [];
    }
  }

  FloatActions.defaults = defaults;
  FloatActions.icons = ICONS;
  global.FloatActions = FloatActions;
})(window);
