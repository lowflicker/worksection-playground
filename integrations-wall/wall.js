/* =============================================================================
   Integrations wall — a staggered sheet of logo tiles that looks around after
   the pointer, drifts on its own and fades out towards the edges.
   Vanilla JS, no dependencies, no build step. Needs wall.css.

   The layout is markup-first: the tiles are yours, the script only places
   them on a grid bigger than the box, clones them to fill the cells and moves
   the whole sheet. Everything else (tile look, mask, hover) is CSS on the
   custom properties this file writes.

   Usage:
     <div class="iwall" id="wall">
       <div class="iwall__sheet">
         <figure class="iwall__tile"><img src="logos/slack.svg" alt="Slack"></figure>
         …
       </div>
     </div>
     const w = IntegrationsWall.create(document.getElementById('wall'), { columns: 7, rows: 9 });
     w.setOptions({ pan: 0.5 });
     w.pause(); w.resume(); w.destroy();

   Or drop `data-iwall` on the box and the script inits it on load with the
   defaults (and any `data-iwall-*` attributes as options).
   ============================================================================= */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  var DEFAULTS = {
    // grid
    columns: 7,             // cells across; the sheet is wider than the box, so keep it above what fits
    rows: 9,                // cells down
    tile: 64,               // px, the square tile
    gap: 24,                // px between tiles
    stagger: 0.5,           // odd rows shift right by this fraction of a step (0 = straight grid)
    radius: 12,             // tile corner, px
    logo: 28,               // logo size inside the tile, px

    // motion
    pan: 0.35,              // how far the sheet moves against the pointer: 1 = as far as the pointer went, negative = with it
    ease: 0.08,             // follow easing per frame at 60 fps, 0..1
    drift: 18,              // px of idle wander
    driftPeriod: 14,        // s for one lap of the wander
    hoverScale: 1.1,        // the tile under the pointer

    // mask: an ellipse the tiles are seen through, in % of the box
    mask: true,
    maskX: 50, maskY: 53,   // centre
    maskRx: 60, maskRy: 55, // radii
    maskSolid: 50,          // fully visible up to this % of the radius, then the fade

    respectReducedMotion: true,   // prefers-reduced-motion: no drift, no follow
    paused: false
  };

  var RM = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function Wall(el, opts) {
    this.el = el;
    this.o = assign({}, DEFAULTS, opts || {});
    this.sheet = el.querySelector('.iwall__sheet');
    if (!this.sheet) {
      this.sheet = document.createElement('div');
      this.sheet.className = 'iwall__sheet';
      while (el.firstChild) this.sheet.appendChild(el.firstChild);
      el.appendChild(this.sheet);
    }
    // the author's tiles; clones are made from these and thrown away on relayout
    this.source = toArray(this.sheet.querySelectorAll('.iwall__tile'));
    this.x = 0; this.y = 0;             // where the sheet is (offset from centre), px
    this.tx = 0; this.ty = 0;           // where it wants to be
    this.px = null; this.py = null;     // pointer, relative to the box centre
    this.t0 = now();
    this.raf = 0;
    this.last = 0;
    this.visible = true;
    this._bind();
    this.layout();
    this.applyVars();
    if (!this.o.paused) this.play();
  }

  Wall.prototype = {
    /* ---------- layout ---------- */
    layout: function () {
      var o = this.o, sheet = this.sheet, src = this.source;
      toArray(sheet.querySelectorAll('[data-iwall-clone]')).forEach(function (c) { c.parentNode.removeChild(c); });
      var cells = Math.max(1, o.columns | 0) * Math.max(1, o.rows | 0);
      var step = o.tile + o.gap;
      var shift = o.stagger * step;
      var n = src.length;
      this.n = n ? cells : 0;
      for (var i = 0; i < cells && n; i++) {
        var t = i < n ? src[i] : null;
        if (!t) {
          t = src[i % n].cloneNode(true);
          t.setAttribute('data-iwall-clone', '');
          t.setAttribute('aria-hidden', 'true');
          sheet.appendChild(t);
        }
        var r = Math.floor(i / o.columns), c = i % o.columns;
        t.hidden = false;
        t.style.setProperty('--x', (c * step + (r % 2 ? shift : 0)) + 'px');
        t.style.setProperty('--y', (r * step) + 'px');
      }
      // more tiles than cells: the extra authored ones stay out of the way
      for (var j = cells; j < n; j++) src[j].hidden = true;
      sheet.style.width = (o.columns * step - o.gap + (o.rows > 1 ? shift : 0)) + 'px';
      sheet.style.height = (o.rows * step - o.gap) + 'px';
    },

    applyVars: function () {
      var o = this.o, s = this.el.style;
      s.setProperty('--iw-tile', o.tile + 'px');
      s.setProperty('--iw-radius', o.radius + 'px');
      s.setProperty('--iw-logo', o.logo + 'px');
      s.setProperty('--iw-hover', String(o.hoverScale));
      s.setProperty('--iw-mx', o.maskX + '%');
      s.setProperty('--iw-my', o.maskY + '%');
      s.setProperty('--iw-rx', o.maskRx + '%');
      s.setProperty('--iw-ry', o.maskRy + '%');
      s.setProperty('--iw-solid', o.maskSolid + '%');
      this.el.classList.toggle('iwall--no-mask', !o.mask);
    },

    /* ---------- options ---------- */
    set: function (k, v) { var p = {}; p[k] = v; this.setOptions(p); },
    setOptions: function (patch) {
      var o = this.o, relayout = false;
      for (var k in patch) {
        if (!patch.hasOwnProperty(k)) continue;
        if (o[k] === patch[k]) continue;
        o[k] = patch[k];
        if (k === 'columns' || k === 'rows' || k === 'tile' || k === 'gap' || k === 'stagger') relayout = true;
      }
      if (relayout) this.layout();
      this.applyVars();
      if ('paused' in patch) patch.paused ? this.pause() : this.resume();
    },

    /* ---------- motion ---------- */
    still: function () { return this.o.respectReducedMotion && RM.matches; },
    play: function () { if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(this._tick); } },
    stop: function () { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } },
    pause: function () { this.o.paused = true; this.stop(); },
    resume: function () { this.o.paused = false; if (this.visible) this.play(); },

    step: function (dt) {
      var o = this.o, still = this.still();
      var t = (now() - this.t0) / 1000;
      // idle wander: two sines with unrelated periods, so the path never repeats visibly
      var w = still ? 0 : o.drift;
      var ph = TAU * t / Math.max(1, o.driftPeriod);
      var dx = w * Math.sin(ph), dy = w * Math.sin(ph * 0.61 + 1.3);
      if (this.px != null && !still) { dx -= this.px * o.pan; dy -= this.py * o.pan; }
      this.tx = dx; this.ty = dy;
      // ease is "per frame at 60 fps"; scale it so slow-motion and dropped frames do not change the feel
      var k = 1 - Math.pow(1 - o.ease, dt / 16.667);
      this.x += (this.tx - this.x) * k;
      this.y += (this.ty - this.y) * k;
      this.sheet.style.transform = 'translate3d(' + this.x.toFixed(2) + 'px,' + this.y.toFixed(2) + 'px,0)';
    },

    /* ---------- events ---------- */
    _bind: function () {
      var self = this, el = this.el;
      this._tick = function (ts) {
        self.raf = requestAnimationFrame(self._tick);
        var dt = self.last ? Math.min(100, ts - self.last) : 16.667;
        self.last = ts;
        self.step(dt);
      };
      this._move = function (e) {
        var r = el.getBoundingClientRect();
        self.px = e.clientX - (r.left + r.width / 2);
        self.py = e.clientY - (r.top + r.height / 2);
      };
      this._leave = function () { self.px = self.py = null; };
      el.addEventListener('pointermove', this._move);
      el.addEventListener('pointerleave', this._leave);
      // no work off screen
      if (global.IntersectionObserver) {
        this.io = new IntersectionObserver(function (es) {
          self.visible = es[0].isIntersecting;
          if (!self.visible) self.stop(); else if (!self.o.paused) self.play();
        });
        this.io.observe(el);
      }
    },

    destroy: function () {
      this.stop();
      this.el.removeEventListener('pointermove', this._move);
      this.el.removeEventListener('pointerleave', this._leave);
      if (this.io) this.io.disconnect();
      toArray(this.sheet.querySelectorAll('[data-iwall-clone]')).forEach(function (c) { c.parentNode.removeChild(c); });
      this.sheet.style.transform = '';
    }
  };

  /* ---------- helpers ---------- */
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; for (var k in s) if (s.hasOwnProperty(k)) t[k] = s[k]; } return t; }
  function toArray(l) { return Array.prototype.slice.call(l); }
  function now() { return global.performance && performance.now ? performance.now() : Date.now(); }
  // data-iwall-columns="9" → { columns: 9 }; numbers and booleans are parsed
  function dataOptions(el) {
    var o = {};
    toArray(el.attributes).forEach(function (a) {
      var m = /^data-iwall-(.+)$/.exec(a.name);
      if (!m) return;
      var k = m[1].replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      var v = a.value;
      o[k] = v === '' || v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
    });
    return o;
  }

  var IntegrationsWall = {
    defaults: DEFAULTS,
    create: function (el, opts) { return new Wall(el, opts); },
    attach: function (el, opts) { return new Wall(el, opts); },
    init: function (root) {
      return toArray((root || document).querySelectorAll('[data-iwall]')).map(function (el) { return new Wall(el, dataOptions(el)); });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { IntegrationsWall.init(); });
  else IntegrationsWall.init();

  global.IntegrationsWall = IntegrationsWall;
})(window);
