/* =============================================================================
   Border Beam — controller. Vanilla JS, no dependencies, no build step.

   All it does is toggle three attributes on the host element:
     data-active   the beam is running (fades in)
     data-fading   the beam is running but fading out
     data-paused   animations are frozen

   Everything visual lives in beam.css.

   Cost control: the beam repaints three masked gradient layers every frame, so
   a beam nobody can see is pure waste. One shared IntersectionObserver freezes
   every beam that is off screen and thaws it just before it scrolls back in —
   an off-screen beam is NOT free otherwise, the browser keeps ticking it.
   Opt out with { pauseOffscreen: false }.

   Usage:
     <div class="beam" data-beam data-trigger="always">…</div>
     <script src="beam.js"></script>          // auto-inits on DOMContentLoaded

   or manually:
     const beam = BorderBeam.attach(el, { trigger: 'hover' });
     beam.show(); beam.hide(); beam.pause(); beam.play();
   ============================================================================= */
(function (global) {
  'use strict';

  var INSTANCES = new WeakMap();

  /* one observer for every beam on the page, created on first use.
     It holds only weak references to the hosts, so a removed element is
     collected whether or not destroy() was called. */
  var offscreen = null;
  function watcher() {
    if (!offscreen && global.IntersectionObserver) {
      offscreen = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var beam = INSTANCES.get(entries[i].target);
          if (!beam) continue;
          beam._onScreen = entries[i].isIntersecting;
          beam._sync();
        }
      }, { rootMargin: '128px' });     // thaw a little before it comes into view
    }
    return offscreen;
  }

  /* only the events the trigger actually needs get a listener: an "always"
     beam binds nothing at all */
  var TRIGGERS = { hover: ['pointerenter', 'pointerleave'], focus: ['focusin', 'focusout'] };

  function Beam(el, options) {
    var opts = options || {};

    this.el = el;
    this.trigger = opts.trigger || el.dataset.trigger || 'always';
    this.fadeOutMs = opts.fadeOutMs != null ? opts.fadeOutMs : null;  // read on first hide
    this._timer = null;
    this._paused = false;       // pause() asked for it
    this._onScreen = true;      // optimistic: the observer corrects it next frame

    // the bloom layer is pure decoration — create it so the markup stays clean
    if (!el.querySelector(':scope > .beam__bloom')) {
      var bloom = document.createElement('div');
      bloom.className = 'beam__bloom';
      bloom.setAttribute('aria-hidden', 'true');
      el.insertBefore(bloom, el.firstChild);
      this._ownBloom = bloom;
    }

    // let the stylesheet honour prefers-reduced-motion for this host
    if (opts.respectReducedMotion !== false) el.setAttribute('data-reduce-motion', '');

    INSTANCES.set(el, this);
    this._bind();
    if (this.trigger === 'always') this.show();

    if (opts.pauseOffscreen !== false) {
      var w = watcher();
      if (w) { this._watcher = w; w.observe(el); }
    }
  }

  Beam.prototype._bind = function () {
    var self = this;
    var el = this.el;
    var events = TRIGGERS[this.trigger];
    this._handlers = null;
    if (!events) return;

    this._handlers = this.trigger === 'hover' ? {
      pointerenter: function () { if (self.trigger === 'hover') self.show(); },
      pointerleave: function () { if (self.trigger === 'hover') self.hide(); }
    } : {
      focusin:  function () { if (self.trigger === 'focus') self.show(); },
      focusout: function () {
        if (self.trigger === 'focus' && !el.contains(document.activeElement)) self.hide();
      }
    };

    for (var i = 0; i < events.length; i++) {
      el.addEventListener(events[i], this._handlers[events[i]]);
    }
  };

  Beam.prototype._unbind = function () {
    if (!this._handlers) return;
    for (var type in this._handlers) {
      if (Object.prototype.hasOwnProperty.call(this._handlers, type)) {
        this.el.removeEventListener(type, this._handlers[type]);
      }
    }
    this._handlers = null;
  };

  /** data-paused is the CSS switch: on when the page asked for a pause, or
      when the beam is off screen. Written only when it actually changes. */
  Beam.prototype._sync = function () {
    var frozen = this._paused || !this._onScreen;
    if (frozen === this.el.hasAttribute('data-paused')) return;
    if (frozen) this.el.setAttribute('data-paused', '');
    else this.el.removeAttribute('data-paused');
  };

  /** Restart the beam from angle 0 — used when the trigger fires again. */
  Beam.prototype.show = function () {
    clearTimeout(this._timer);
    this.el.removeAttribute('data-fading');
    if (!this.el.hasAttribute('data-active')) {
      // force a reflow so the fade-in keyframe replays after a hide()
      void this.el.offsetWidth;
      this.el.setAttribute('data-active', '');
    }
    return this;
  };

  Beam.prototype.hide = function () {
    var self = this;
    if (!this.el.hasAttribute('data-active')) return this;
    clearTimeout(this._timer);
    this.el.removeAttribute('data-active');
    this.el.setAttribute('data-fading', '');
    if (this.fadeOutMs == null) this.fadeOutMs = readMs(this.el, '--beam-fade-out', 500);
    this._timer = setTimeout(function () {
      self._timer = null;
      self.el.removeAttribute('data-fading');
    }, this.fadeOutMs);
    return this;
  };

  Beam.prototype.pause = function () { this._paused = true;  this._sync(); return this; };
  Beam.prototype.play  = function () { this._paused = false; this._sync(); return this; };
  Beam.prototype.toggle = function (on) { return on ? this.show() : this.hide(); };

  Beam.prototype.setTrigger = function (trigger) {
    if (trigger !== this.trigger) {
      this._unbind();
      this.trigger = trigger;
      this.el.dataset.trigger = trigger;
      this._bind();
    }
    if (trigger === 'always') this.show();
    else this.hide();
    return this;
  };

  /** Set any of the --beam-* custom properties. */
  Beam.prototype.set = function (name, value) {
    this.el.style.setProperty(name.indexOf('--') === 0 ? name : '--beam-' + name, value);
    return this;
  };

  Beam.prototype.destroy = function () {
    var self = this;
    clearTimeout(this._timer);
    this._timer = null;
    this._unbind();
    if (this._watcher) { this._watcher.unobserve(this.el); this._watcher = null; }
    if (this._ownBloom) { this._ownBloom.remove(); this._ownBloom = null; }
    ['data-active', 'data-fading', 'data-paused', 'data-reduce-motion']
      .forEach(function (a) { self.el.removeAttribute(a); });
    INSTANCES.delete(this.el);
  };

  /* --- helpers ------------------------------------------------------------- */
  function readMs(el, prop, fallback) {
    var raw = getComputedStyle(el).getPropertyValue(prop).trim();
    if (!raw) return fallback;
    if (raw.slice(-2) === 'ms') return parseFloat(raw);
    if (raw.slice(-1) === 's') return parseFloat(raw) * 1000;
    return fallback;
  }

  var BorderBeam = {
    attach: function (el, options) {
      return INSTANCES.get(el) || new Beam(el, options);
    },
    get: function (el) { return INSTANCES.get(el); },
    enhance: function (root) {
      var scope = root || document;
      return Array.prototype.map.call(
        scope.querySelectorAll('[data-beam]'),
        function (el) { return BorderBeam.attach(el); }
      );
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { BorderBeam.enhance(); });
  } else {
    BorderBeam.enhance();
  }

  global.BorderBeam = BorderBeam;
})(window);
