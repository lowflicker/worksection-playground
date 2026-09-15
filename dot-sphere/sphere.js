/* =============================================================================
   Dot Sphere — a 3D sphere drawn as points on a 2D canvas.
   Vanilla JS, no dependencies, no WebGL, no build step.

   Six point layouts, slow auto-rotation, pointer parallax and drag-to-spin
   with inertia.

   Usage:
     const s = DotSphere.create(canvasEl, { style: 'stipple', count: 5200 });
     s.set('style', 'orbits');
     s.setOptions({ speed: 0.2, color: '#111' });
     s.pause(); s.play(); s.destroy();

   The maths is deliberately plain: points live on a unit sphere, get spun by
   three rotations, then projected with a single perspective divide. Depth
   drives both the size and the opacity of each dot, which is what sells the
   volume without any real 3D.
   ============================================================================= */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  var DEPTH_BUCKETS = 20;   // dots are binned by depth so each bin is one fill()
  var MAX_SIDE = 2048;      // upper bound on one side of the canvas, in CSS px
  var MAX_PIXELS = 4.2e6;   // and on the backing store as a whole (~2048²)

  var DEFAULTS = {
    style: 'stipple',       // stipple | orbits | grid | spiral | cloud | mesh
    count: 5200,            // total dots (capped at 20000)
    seed: 7,                // re-rolls the random layouts (orbits, cloud)

    radius: 0.78,           // fraction of the half-size of the shorter side
    dotSize: 1.15,          // px, at the front of the sphere
    perspective: 4.5,       // camera distance in radii — higher is flatter
    depthFade: 0.55,        // how much the back of the sphere fades out
    depthScale: 0.45,       // how much the back of the sphere shrinks

    color: '#141414',
    background: '#f4f4f2',  // or 'transparent'
    lineWidth: 0.6,         // mesh style only

    speed: 0.13,            // auto-rotation, radians per second
    direction: 1,           // 1 | -1
    tilt: -0.28,            // static tilt of the spin axis, radians

    pointer: 0.55,          // how far the cursor pulls the sphere, radians
    damping: 0.055,         // easing toward the cursor target, 0..1 per frame
    drag: true,             // drag to spin, with inertia
    friction: 0.94,         // inertia decay per frame

    rings: 12,              // orbits
    gridLat: 14,            // grid — parallels
    gridLon: 18,            // grid — meridians
    turns: 26,              // spiral
    thickness: 0.28,        // cloud — depth of the shell
    linkDist: 0.42,         // mesh — max 3D distance for a link
    jitter: 0,              // radial noise on every layout

    paused: false,
    respectReducedMotion: true
  };

  var STYLES = ['stipple', 'orbits', 'grid', 'spiral', 'cloud', 'mesh'];

  /* --- deterministic RNG so a given seed always rebuilds the same layout ----- */
  function rng(seed) {
    var a = (seed * 1831565813 + 0x6D2B79F5) >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* =========================================================================
     Point layouts. Each returns a flat [x,y,z, x,y,z, …] on the unit sphere.
     ========================================================================= */

  /** Fibonacci sphere — the most even way to scatter n points on a sphere. */
  function layoutStipple(n) {
    var p = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var y = 1 - (i + 0.5) * 2 / n;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = i * GOLDEN_ANGLE;
      p[i * 3] = Math.cos(th) * r;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = Math.sin(th) * r;
    }
    return p;
  }

  /** Great circles at random orientations — the tangled-orbits look. */
  function layoutOrbits(n, rings, seed) {
    var rnd = rng(seed);
    var per = Math.max(8, Math.floor(n / rings));
    var p = new Float32Array(rings * per * 3);
    var k = 0;

    for (var r = 0; r < rings; r++) {
      // a uniformly random axis, then any two unit vectors perpendicular to it
      var z = rnd() * 2 - 1;
      var a = rnd() * TAU;
      var s = Math.sqrt(Math.max(0, 1 - z * z));
      var ax = Math.cos(a) * s, ay = Math.sin(a) * s, az = z;

      var hx = Math.abs(ax) < 0.9 ? 1 : 0, hy = Math.abs(ax) < 0.9 ? 0 : 1;
      var ux = ay * 0 - az * hy, uy = az * hx - ax * 0, uz = ax * hy - ay * hx;
      var ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul; uy /= ul; uz /= ul;

      var vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;

      var phase = rnd() * TAU;
      for (var j = 0; j < per; j++) {
        var t = phase + j / per * TAU;
        var c = Math.cos(t), sn = Math.sin(t);
        // a touch of noise keeps the rings from looking machine-perfect
        var w = 1 + (rnd() - 0.5) * 0.012;
        p[k++] = (ux * c + vx * sn) * w;
        p[k++] = (uy * c + vy * sn) * w;
        p[k++] = (uz * c + vz * sn) * w;
      }
    }
    return p;
  }

  /** Latitude rings + meridians — a dotted globe wireframe. */
  function layoutGrid(n, lat, lon) {
    var pts = [];
    var half = n / 2;

    // parallels: point count follows the ring circumference so density is even
    var weight = 0;
    for (var i = 1; i <= lat; i++) weight += Math.sin(i / (lat + 1) * Math.PI);
    for (var a = 1; a <= lat; a++) {
      var th = a / (lat + 1) * Math.PI;
      var ry = Math.cos(th), rr = Math.sin(th);
      var m = Math.max(6, Math.round(half * rr / weight));
      for (var j = 0; j < m; j++) {
        var t = j / m * TAU;
        pts.push(Math.cos(t) * rr, ry, Math.sin(t) * rr);
      }
    }

    // meridians: half-circles from pole to pole
    var mm = Math.max(8, Math.round(half / lon));
    for (var b = 0; b < lon; b++) {
      var phi = b / lon * TAU;
      var cp = Math.cos(phi), sp = Math.sin(phi);
      for (var q = 0; q <= mm; q++) {
        var u = q / mm * Math.PI;
        var y = Math.cos(u), r2 = Math.sin(u);
        pts.push(cp * r2, y, sp * r2);
      }
    }
    return Float32Array.from(pts);
  }

  /** One continuous spiral from pole to pole — a ball of wound thread. */
  function layoutSpiral(n, turns) {
    var p = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var y = 1 - 2 * t;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var a = t * TAU * turns;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    return p;
  }

  /** A shell with depth — points sit inside the surface, not on it. */
  function layoutCloud(n, thickness, seed) {
    var rnd = rng(seed);
    var p = layoutStipple(n);
    for (var i = 0; i < n; i++) {
      // biased toward the surface, so the silhouette stays crisp
      var k = 1 - thickness * Math.pow(rnd(), 0.55);
      p[i * 3] *= k; p[i * 3 + 1] *= k; p[i * 3 + 2] *= k;
    }
    return p;
  }

  /**
   * Sparse points plus the pairs that are close enough to link.
   * Rotation is rigid, so 3D distances never change — the pairs are found once.
   */
  function layoutMesh(n, linkDist) {
    var p = layoutStipple(n);
    var links = [];
    var d2 = linkDist * linkDist;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var dx = p[i * 3] - p[j * 3];
        var dy = p[i * 3 + 1] - p[j * 3 + 1];
        var dz = p[i * 3 + 2] - p[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < d2) links.push(i, j);
      }
      if (links.length > 24000) break;   // safety valve on dense settings
    }
    return { pts: p, links: Uint32Array.from(links) };
  }

  /* =========================================================================
     Instance
     ========================================================================= */
  function DotSphere(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = {};
    for (var k in DEFAULTS) this.o[k] = DEFAULTS[k];
    if (options) for (var j in options) if (j in this.o) this.o[j] = options[j];

    // rotation state
    this.spin = 0;          // auto-rotation + drag inertia
    this.pitch = 0;         // accumulated from dragging
    this.velY = 0;          // drag inertia
    this.velX = 0;
    this.ptrYaw = 0;        // eased pointer parallax
    this.ptrPitch = 0;
    this.tgtYaw = 0;
    this.tgtPitch = 0;

    this.dragging = false;
    this.lastT = 0;
    this.raf = 0;

    this._buildBuffers();
    this.rebuild();
    this._bind();
    this.resize();
    this.play();
  }

  DotSphere.prototype._buildBuffers = function () {
    // one reusable coordinate array per depth bucket, plus a fill counter
    this.bx = [];
    this.bn = new Int32Array(DEPTH_BUCKETS);
    for (var i = 0; i < DEPTH_BUCKETS; i++) this.bx.push(new Float32Array(0));
  };

  DotSphere.prototype._ensureBuffers = function (n) {
    for (var i = 0; i < DEPTH_BUCKETS; i++) {
      if (this.bx[i].length < n * 2) this.bx[i] = new Float32Array(n * 2);
    }
    // mesh needs projected coordinates for every point, not just bucketed ones
    if (!this.proj || this.proj.length < n * 3) this.proj = new Float32Array(n * 3);
  };

  /** Regenerate the point cloud. Called whenever a layout option changes. */
  DotSphere.prototype.rebuild = function () {
    var o = this.o;
    var n = Math.max(24, Math.min(20000, Math.round(o.count)));
    var out;

    if (o.style === 'orbits')      out = layoutOrbits(n, Math.round(o.rings), o.seed);
    else if (o.style === 'grid')   out = layoutGrid(n, Math.round(o.gridLat), Math.round(o.gridLon));
    else if (o.style === 'spiral') out = layoutSpiral(n, o.turns);
    else if (o.style === 'cloud')  out = layoutCloud(n, o.thickness, o.seed);
    else if (o.style === 'mesh') {
      var m = layoutMesh(Math.max(24, Math.min(700, Math.round(n / 12))), o.linkDist);
      out = m.pts;
      this.links = m.links;
    } else out = layoutStipple(n);

    if (o.style !== 'mesh') this.links = null;

    if (o.jitter > 0) {
      var rnd = rng(o.seed + 991);
      for (var i = 0; i < out.length; i += 3) {
        var k = 1 + (rnd() - 0.5) * o.jitter;
        out[i] *= k; out[i + 1] *= k; out[i + 2] *= k;
      }
    }

    this.pts = out;
    this.n = out.length / 3;
    this._ensureBuffers(this.n);
    if (this.o.paused) this.draw(0);
    return this;
  };

  /* --- sizing --------------------------------------------------------------- */
  DotSphere.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    // A canvas with height:100% inside an auto-height parent feeds its own size
    // back into the layout and runs away, so the measurement is clamped. Keep
    // the CSS out of flow too (see .stage__canvas--fill) — this is the backstop.
    var w = clamp(Math.round(r.width) || 1, 1, MAX_SIDE);
    var h = clamp(Math.round(r.height) || 1, 1, MAX_SIDE);

    // and never allocate more backing pixels than the budget, whatever the DPR
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.o.paused) this.draw(0);
    return this;
  };

  /* --- input ---------------------------------------------------------------- */
  DotSphere.prototype._bind = function () {
    var self = this;
    var c = this.canvas;

    this._on = {
      pointermove: function (e) {
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width * 2 - 1;
        var py = (e.clientY - r.top) / r.height * 2 - 1;

        if (self.dragging) {
          var dx = e.clientX - self.lastX;
          var dy = e.clientY - self.lastY;
          self.lastX = e.clientX; self.lastY = e.clientY;
          self.velY = dx * 0.006;
          self.velX = dy * 0.006;
          self.spin += self.velY;
          self.pitch = clamp(self.pitch + self.velX, -1.3, 1.3);
          return;
        }
        self.tgtYaw = px * self.o.pointer;
        self.tgtPitch = -py * self.o.pointer;
      },
      pointerleave: function () { self.tgtYaw = 0; self.tgtPitch = 0; },
      pointerdown: function (e) {
        if (!self.o.drag) return;
        self.dragging = true;
        self.lastX = e.clientX; self.lastY = e.clientY;
        self.velY = self.velX = 0;
        c.setPointerCapture(e.pointerId);
        c.style.cursor = 'grabbing';
      },
      pointerup: function (e) {
        if (!self.dragging) return;
        self.dragging = false;
        try { c.releasePointerCapture(e.pointerId); } catch (err) {}
        c.style.cursor = self.o.drag ? 'grab' : '';
      }
    };

    for (var type in this._on) c.addEventListener(type, this._on[type]);
    c.addEventListener('pointercancel', this._on.pointerup);
    c.style.cursor = this.o.drag ? 'grab' : '';

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(c);
    } else {
      this._onResize = function () { self.resize(); };
      window.addEventListener('resize', this._onResize);
    }
  };

  /* --- loop ----------------------------------------------------------------- */
  DotSphere.prototype.play = function () {
    if (this.raf) return this;
    var self = this;
    this.lastT = 0;
    var tick = function (t) {
      self.raf = requestAnimationFrame(tick);
      var dt = self.lastT ? Math.min(0.05, (t - self.lastT) / 1000) : 0;
      self.lastT = t;
      self.step(dt);
      self.draw(dt);
    };
    this.raf = requestAnimationFrame(tick);
    return this;
  };

  DotSphere.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    return this;
  };

  DotSphere.prototype.pause = function () { this.o.paused = true; return this; };
  DotSphere.prototype.resume = function () { this.o.paused = false; return this; };

  DotSphere.prototype.step = function (dt) {
    var o = this.o;
    var still = o.paused || (o.respectReducedMotion && prefersReducedMotion());

    if (!still && !this.dragging) {
      this.spin += o.speed * o.direction * dt;

      // inertia left over from a drag
      if (Math.abs(this.velY) > 1e-5 || Math.abs(this.velX) > 1e-5) {
        var decay = Math.pow(o.friction, dt * 60);
        this.spin += this.velY * dt * 60;
        this.pitch = clamp(this.pitch + this.velX * dt * 60, -1.3, 1.3);
        this.velY *= decay;
        this.velX *= decay;
      }
    }

    // pointer parallax always eases, even when the spin is paused
    var e = dt ? 1 - Math.pow(1 - o.damping, dt * 60) : o.damping;
    this.ptrYaw += (this.tgtYaw - this.ptrYaw) * e;
    this.ptrPitch += (this.tgtPitch - this.ptrPitch) * e;
  };

  DotSphere.prototype.draw = function () {
    var o = this.o, ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;

    if (o.background && o.background !== 'transparent') {
      ctx.fillStyle = o.background;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 * o.radius;

    // yaw → pitch → static tilt
    var ya = this.spin + this.ptrYaw;
    var pa = this.pitch + this.ptrPitch;
    var cy1 = Math.cos(ya), sy1 = Math.sin(ya);
    var cx1 = Math.cos(pa), sx1 = Math.sin(pa);
    var cz1 = Math.cos(o.tilt), sz1 = Math.sin(o.tilt);

    var d = Math.max(1.05, o.perspective);
    var pts = this.pts, n = this.n;
    var bn = this.bn, bx = this.bx;
    for (var b = 0; b < DEPTH_BUCKETS; b++) bn[b] = 0;

    var needProj = !!this.links;

    for (var i = 0; i < n; i++) {
      var x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];

      var x1 = x * cy1 + z * sy1;          // rotate Y
      var z1 = -x * sy1 + z * cy1;
      var y2 = y * cx1 - z1 * sx1;         // rotate X
      var z2 = y * sx1 + z1 * cx1;
      var x3 = x1 * cz1 - y2 * sz1;        // rotate Z (axis tilt)
      var y3 = x1 * sz1 + y2 * cz1;

      var s = d / (d - z2);
      var sx = cx + x3 * R * s;
      var sy = cy - y3 * R * s;

      if (needProj) {
        this.proj[i * 3] = sx; this.proj[i * 3 + 1] = sy; this.proj[i * 3 + 2] = z2;
      }

      var f = (z2 + 1) * 0.5;              // 0 at the back, 1 at the front
      var bi = f * DEPTH_BUCKETS | 0;
      if (bi < 0) bi = 0; else if (bi >= DEPTH_BUCKETS) bi = DEPTH_BUCKETS - 1;
      var at = bn[bi] * 2;
      bx[bi][at] = sx;
      bx[bi][at + 1] = sy;
      bn[bi]++;
    }

    if (this.links) this._drawLinks();

    ctx.fillStyle = o.color;
    for (var k = 0; k < DEPTH_BUCKETS; k++) {
      var cnt = bn[k];
      if (!cnt) continue;

      var fm = (k + 0.5) / DEPTH_BUCKETS;                 // bucket midpoint depth
      var sm = d / (d - (fm * 2 - 1));
      var r = o.dotSize * (1 - o.depthScale * (1 - fm)) * sm * 0.5;
      if (r < 0.12) continue;

      ctx.globalAlpha = 1 - o.depthFade * (1 - fm);
      ctx.beginPath();
      var arr = bx[k];
      if (r < 1) {
        var side = r * 2;
        for (var q = 0; q < cnt; q++) ctx.rect(arr[q * 2] - r, arr[q * 2 + 1] - r, side, side);
      } else {
        for (var p = 0; p < cnt; p++) {
          ctx.moveTo(arr[p * 2] + r, arr[p * 2 + 1]);
          ctx.arc(arr[p * 2], arr[p * 2 + 1], r, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  DotSphere.prototype._drawLinks = function () {
    var ctx = this.ctx, o = this.o, L = this.links, P = this.proj;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.lineWidth;

    // links are stroked in depth bands too, so the far side reads as far
    for (var band = 0; band < 5; band++) {
      var lo = band / 5 * 2 - 1, hi = (band + 1) / 5 * 2 - 1;
      ctx.globalAlpha = (0.12 + 0.5 * ((band + 0.5) / 5)) * (1 - o.depthFade * 0.5);
      ctx.beginPath();
      var drew = false;
      for (var i = 0; i < L.length; i += 2) {
        var a = L[i], b = L[i + 1];
        var zm = (P[a * 3 + 2] + P[b * 3 + 2]) * 0.5;
        if (zm < lo || zm >= hi) continue;
        ctx.moveTo(P[a * 3], P[a * 3 + 1]);
        ctx.lineTo(P[b * 3], P[b * 3 + 1]);
        drew = true;
      }
      if (drew) ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /* --- options -------------------------------------------------------------- */
  var LAYOUT_KEYS = ['style', 'count', 'seed', 'rings', 'gridLat', 'gridLon',
                     'turns', 'thickness', 'linkDist', 'jitter'];

  DotSphere.prototype.set = function (key, value) {
    if (!(key in this.o)) return this;
    this.o[key] = value;
    if (LAYOUT_KEYS.indexOf(key) !== -1) this.rebuild();
    else if (key === 'drag') this.canvas.style.cursor = value ? 'grab' : '';
    if (this.o.paused) this.draw(0);
    return this;
  };

  DotSphere.prototype.setOptions = function (obj) {
    var relayout = false;
    for (var k in obj) {
      if (!(k in this.o)) continue;
      if (this.o[k] !== obj[k] && LAYOUT_KEYS.indexOf(k) !== -1) relayout = true;
      this.o[k] = obj[k];
    }
    if (relayout) this.rebuild(); else if (this.o.paused) this.draw(0);
    return this;
  };

  DotSphere.prototype.destroy = function () {
    this.stop();
    for (var type in this._on) this.canvas.removeEventListener(type, this._on[type]);
    this.canvas.removeEventListener('pointercancel', this._on.pointerup);
    if (this._ro) this._ro.disconnect();
    if (this._onResize) window.removeEventListener('resize', this._onResize);
  };

  /* --- helpers -------------------------------------------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  global.DotSphere = {
    create: function (canvas, options) { return new DotSphere(canvas, options); },
    styles: STYLES,
    defaults: DEFAULTS
  };
})(window);
