/* =============================================================================
   Border Beam — controller. Vanilla JS, no dependencies, no build step.

   All it does is toggle three attributes on the host element:
     data-active   the beam is running (fades in)
     data-fading   the beam is running but fading out
     data-paused   animations are frozen

   Everything visual lives in beam.css.

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

  function Beam(el, options) {
    var opts = options || {};

    this.el = el;
    this.trigger = opts.trigger || el.dataset.trigger || 'always';
    this.fadeOutMs = opts.fadeOutMs != null ? opts.fadeOutMs : readMs(el, '--beam-fade-out', 500);
    this._timer = null;

    // the bloom layer is pure decoration — create it so the markup stays clean
    if (!el.querySelector(':scope > .beam__bloom')) {
      var bloom = document.createElement('div');
      bloom.className = 'beam__bloom';
      bloom.setAttribute('aria-hidden', 'true');
      el.insertBefore(bloom, el.firstChild);
    }

    // let the stylesheet honour prefers-reduced-motion for this host
    if (opts.respectReducedMotion !== false) el.setAttribute('data-reduce-motion', '');

    this._bind();
    if (this.trigger === 'always') this.show();

    INSTANCES.set(el, this);
  }

  Beam.prototype._bind = function () {
    var self = this;
    var el = this.el;

    this._handlers = {
      pointerenter: function () { if (self.trigger === 'hover') self.show(); },
      pointerleave: function () { if (self.trigger === 'hover') self.hide(); },
      focusin:      function () { if (self.trigger === 'focus') self.show(); },
      focusout:     function () {
        if (self.trigger === 'focus' && !el.contains(document.activeElement)) self.hide();
      }
    };

    Object.keys(this._handlers).forEach(function (type) {
      el.addEventListener(type, self._handlers[type]);
    });
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
    this._timer = setTimeout(function () {
      self.el.removeAttribute('data-fading');
    }, this.fadeOutMs);
    return this;
  };

  Beam.prototype.pause = function () { this.el.setAttribute('data-paused', ''); return this; };
  Beam.prototype.play  = function () { this.el.removeAttribute('data-paused'); return this; };
  Beam.prototype.toggle = function (on) { return on ? this.show() : this.hide(); };

  Beam.prototype.setTrigger = function (trigger) {
    this.trigger = trigger;
    this.el.dataset.trigger = trigger;
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
    Object.keys(this._handlers).forEach(function (type) {
      self.el.removeEventListener(type, self._handlers[type]);
    });
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
