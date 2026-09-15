/* ==========================================================================
   ShortAnswer
   Verdict box + option cards joined by live connectors. No dependencies.

   new ShortAnswer('#answer', options)

   Options (every key has a default, see ShortAnswer.defaults):
     verdict          { title, text }
     options          [{ name, text, logo: 'trello' | 'worksection' | '<svg…>', tone: 'neutral' | 'accent', cta: { label, href } }]
                      the connector to an 'accent' card carries the full pulse, a 'neutral' one fades out on the way

     strokeWidth      px, resting connector line
     tension          0..1.2, bezier handle length as a share of the gap (1 = the Figma S-curve)
     stackBelow       px, container width under which the cards stack below the verdict

     reveal           draw the block on first enter: verdict, then lines, then cards
     revealDuration   ms
     revealStagger    ms between lines
     revealEasing     CSS easing

     pulse            run pulses along the connectors while on screen
     pulseInterval    ms between pulses
     pulseDuration    ms for a pulse to travel the line
     pulseLength      px, bright head
     pulseWidth       px
     pulseGlow        px, drop shadow under the head
     pulseEasing      CSS easing
     sideReach        0..1, how far a pulse gets on a neutral branch before it fades
     charge           ms the target card stays lit after a pulse lands

     hover            hovering a card lights its connector and sends a pulse down it
     beam             rotating light on the CTA border

     accent           connector / card colour
     accentSoft       card background
     accentInk        card text
     neutral          neutral connector colour
     neutralOpacity   0..1

   Methods: setOptions(patch), pulse(index?), replay(), start(), stop(), destroy()
   Events on the root element: 'sa:pulse' ({ index }), 'sa:reveal'
   ========================================================================== */

(function (global) {
  'use strict';

  const ICONS = {
    next: '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.442 9.558 10.442 6.558a.625.625 0 0 0-.884.884L12.116 10l-2.558 2.558a.625.625 0 0 0 .884.884l3-3a.625.625 0 0 0 0-.884Z" fill="currentColor"/><path d="M7.442 7.558a.625.625 0 0 0-.884.884L8.116 10l-1.558 1.558a.625.625 0 0 0 .884.884l2-2a.625.625 0 0 0 0-.884l-2-2Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-7.75 9a7.75 7.75 0 1 1 15.5 0 7.75 7.75 0 0 1-15.5 0Z" fill="currentColor"/></svg>',
    trello: '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.1 0H1.9C.853 0 .001.85 0 1.9v12.19c-.002.506.197.992.554 1.35.357.36.842.56 1.348.56H14.1c.505 0 .99-.202 1.346-.56.357-.36.556-.845.554-1.35V1.9C15.999.852 15.149.001 14.101 0ZM6.9 11.524a.63.63 0 0 1-.64.634H3.594a.633.633 0 0 1-.631-.634V3.586c0-.35.282-.633.63-.634H6.26c.35.001.632.284.633.634l.008 7.938Zm6.152-3.645a.63.63 0 0 1-.641.634H9.746a.633.633 0 0 1-.634-.634V3.586c.002-.35.284-.633.634-.634h2.665c.35.001.631.284.631.634l.01 4.293Z" fill="url(#sa-trello)"/><defs><linearGradient id="sa-trello" x1="8" y1="16" x2="8" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#0052CC"/><stop offset="1" stop-color="#2684FF"/></linearGradient></defs></svg>',
    worksection: '<svg viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.777 5.706a3.812 3.812 0 0 0 1.674-3.134v-.817a.816.816 0 0 0-.837-.818h-.28c-2.157 0-3.906 1.708-3.906 3.815v5.991a1.11 1.11 0 0 1-2.232 0V8.564a1.11 1.11 0 0 0-2.232 0v2.18a1.11 1.11 0 0 1-2.232 0V6.387a1.11 1.11 0 0 0-2.232 0v4.36c0 2.185 1.499 3.27 3.348 3.27.859 0 1.64-.32 2.232-.838.593.52 1.373.837 2.232.837 1.85 0 3.348-1.463 3.348-3.27V7.75c0-.849.446-1.603 1.117-2.044Z" fill="#fff" fill-opacity=".95"/></svg>',
  };

  const defaults = {
    verdict: {
      title: 'Short answer',
      text: 'Trello can be a convenient place to start with boards. Worksection is worth a look when a team of 10+ wants to manage tasks, deadlines, time, clients and reports in one space.',
    },
    options: [
      { name: 'Trello, If all you need is a simple board', text: 'Trello may be enough for a small team or a straightforward task list.', logo: 'trello', tone: 'neutral' },
      { name: 'Worksection, If you need the full process', text: 'Worksection adds Gantt charts, time tracking, reports, chats, roles, client access, AI and live support in Ukrainian.', logo: 'worksection', tone: 'accent', cta: { label: 'Get started Free', href: '#' } },
    ],

    strokeWidth: 1.5,
    tension: 1,
    stackBelow: 640,

    reveal: true,
    revealDuration: 900,
    revealStagger: 220,
    revealEasing: 'cubic-bezier(.22, 1, .36, 1)',

    pulse: true,
    pulseInterval: 3200,
    pulseDuration: 1400,
    pulseLength: 48,
    pulseWidth: 2.5,
    pulseGlow: 6,
    pulseEasing: 'cubic-bezier(.45, 0, .2, 1)',
    sideReach: 0.45,
    charge: 700,

    hover: true,
    beam: true,

    accent: '#429bd3',
    accentSoft: '#f0fdff',
    accentInk: '#1b3e52',
    neutral: '#1a1a1a',
    neutralOpacity: 0.1,
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduced = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const svgEl = (tag, cls) => { const n = document.createElementNS(SVG_NS, tag); if (cls) n.setAttribute('class', cls); return n; };
  const merge = (base, patch) => {
    const out = Object.assign({}, base);
    for (const k in patch) {
      const v = patch[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])
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

  class ShortAnswer {
    constructor(root, options = {}) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      this.options = merge(defaults, options);
      this.links = [];
      this.running = false;
      this.visible = false;
      this.revealed = false;
      this.stacked = false;
      this._timer = 0;
      this._anims = [];

      this._build();
      this._applyTokens();
      this._measure();

      this._ro = new ResizeObserver(() => this._measure());
      this._ro.observe(this.root);
      this.cards.forEach(c => this._ro.observe(c));
      this._ro.observe(this.verdict);

      this._io = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible) this._enter(); else this._tick(false);
      }, { threshold: 0.35 });
      this._io.observe(this.root);

      this._onVis = () => this._tick(!document.hidden && this.visible);
      document.addEventListener('visibilitychange', this._onVis);

      this.start();
    }

    /* ---- build ---------------------------------------------------------- */

    _build() {
      const o = this.options;
      this.root.classList.add('sa');
      this.root.classList.toggle('is-pending', !!o.reveal && !reduced());
      this.root.innerHTML = '';

      const inner = el('div', 'sa__inner');
      this.verdict = el('div', 'sa__verdict');
      this.verdict.append(el('h3', 'sa__title', o.verdict.title), el('p', 'sa__text', o.verdict.text));

      const list = el('div', 'sa__options');
      this.cards = o.options.map((opt, i) => {
        const card = el('article', `sa__card sa__card--${opt.tone === 'accent' ? 'accent' : 'neutral'}`);
        card.dataset.index = i;
        const logo = ICONS[opt.logo] || opt.logo || '';
        const body = el('div', 'sa__body');
        body.append(el('div', 'sa__name', `<span>${opt.name}</span>${logo ? `<span class="sa__logo sa__logo--${opt.logo in ICONS ? opt.logo : 'custom'}">${logo}</span>` : ''}`));
        body.append(el('p', 'sa__desc', opt.text));
        if (opt.cta) {
          const a = el('a', 'sa__btn', opt.cta.label);
          a.href = opt.cta.href || '#';
          body.append(a);
        }
        card.append(el('span', 'sa__ico', ICONS.next), body);
        if (o.hover) {
          card.addEventListener('pointerenter', () => this._hover(i, true));
          card.addEventListener('pointerleave', () => this._hover(i, false));
        }
        return card;
      });
      list.append(...this.cards);

      this.svg = svgEl('svg', 'sa__links');
      this.svg.setAttribute('aria-hidden', 'true');
      this.links = o.options.map((opt, i) => {
        const tone = opt.tone === 'accent' ? 'accent' : 'neutral';
        const line = svgEl('path', `sa__link sa__link--${tone}`);
        const tail = svgEl('path', `sa__tail sa__tail--${tone}`);
        const head = svgEl('path', `sa__head sa__head--${tone}`);
        this.svg.append(line, tail, head);
        return { line, tail, head, tone, length: 0, card: this.cards[i] };
      });

      inner.append(this.verdict, list, this.svg);
      this.root.append(inner);
      this.inner = inner;
    }

    _applyTokens() {
      const o = this.options, s = this.root.style;
      s.setProperty('--sa-accent', o.accent);
      s.setProperty('--sa-accent-soft', o.accentSoft);
      s.setProperty('--sa-accent-ink', o.accentInk);
      s.setProperty('--sa-glow', hexToRgb(o.accent) || '81, 181, 244');
      s.setProperty('--sa-neutral', o.neutral);
      s.setProperty('--sa-neutral-alpha', o.neutralOpacity);
      s.setProperty('--sa-stroke', o.strokeWidth);
      s.setProperty('--sa-pulse-width', o.pulseWidth);
      s.setProperty('--sa-pulse-glow', o.pulseGlow + 'px');
      s.setProperty('--sa-ease', o.revealEasing);
      s.setProperty('--sa-reveal-dur', o.revealDuration + 'ms');
      this.root.classList.toggle('sa--beam', !!o.beam);
    }

    /* ---- geometry ------------------------------------------------------- */

    _measure() {
      const o = this.options;
      const stacked = this.root.clientWidth < o.stackBelow;
      if (stacked !== this.stacked) {
        this.stacked = stacked;
        this.root.classList.toggle('is-stacked', stacked);
      }
      const box = this.inner.getBoundingClientRect();
      const v = this.verdict.getBoundingClientRect();
      const rel = r => ({ left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top, cy: (r.top + r.bottom) / 2 - box.top });
      const V = rel(v);

      this.links.forEach(l => {
        const C = rel(l.card.getBoundingClientRect());
        let d;
        if (stacked) {
          // thread down the left gutter, rounded elbow into each card
          const sx = V.left + 24, r = Math.min(12, C.left - sx);
          d = `M${sx} ${V.bottom} V${C.cy - r} Q${sx} ${C.cy} ${sx + r} ${C.cy} H${C.left}`;
        } else {
          // S-curve from the verdict's right edge to the card's left edge
          const x1 = V.right, x2 = C.left, h = (x2 - x1) * o.tension;
          d = `M${x1} ${V.cy} C${x1 + h} ${V.cy} ${x2 - h} ${C.cy} ${x2} ${C.cy}`;
        }
        [l.line, l.tail, l.head].forEach(p => p.setAttribute('d', d));
        l.length = l.line.getTotalLength();
        if (!this.revealed && this.root.classList.contains('is-pending')) {
          l.line.style.strokeDasharray = l.length;
          l.line.style.strokeDashoffset = l.length;
        } else {
          l.line.style.strokeDasharray = '';
          l.line.style.strokeDashoffset = '';
        }
      });
    }

    /* ---- reveal --------------------------------------------------------- */

    _enter() {
      if (!this.revealed) this._reveal();
      this._tick(this.running && !document.hidden);
    }

    _reveal() {
      const o = this.options;
      this.revealed = true;
      if (!this.root.classList.contains('is-pending')) return;

      const dur = o.revealDuration, ease = o.revealEasing;
      const done = [];
      this.root.classList.remove('is-pending');
      // animations are cancelled once finished: the stylesheet already holds the end state
      const track = (a, after) => {
        this._anims.push(a);
        done.push(a.finished.then(() => { after && after(); a.cancel(); }));
      };

      track(this.verdict.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: dur, easing: ease, fill: 'both' }));

      this.links.forEach((l, i) => {
        const delay = dur * 0.35 + i * o.revealStagger;
        l.line.style.strokeDasharray = l.length;
        l.line.style.strokeDashoffset = l.length;
        l.line.style.opacity = 1;
        track(l.line.animate([{ strokeDashoffset: l.length }, { strokeDashoffset: 0 }],
          { duration: dur, delay, easing: ease, fill: 'both' }),
          () => { l.line.style.strokeDasharray = ''; l.line.style.strokeDashoffset = ''; });

        const dx = this.stacked ? 'translateY(10px)' : 'translateX(12px)';
        track(l.card.animate(
          [{ opacity: 0, transform: dx }, { opacity: 1, transform: 'translate(0, 0)' }],
          { duration: dur, delay: delay + dur * 0.55, easing: ease, fill: 'both' }));
      });

      Promise.all(done).then(() => {
        this.root.dispatchEvent(new CustomEvent('sa:reveal'));
        this._tick(this.running && this.visible && !document.hidden, 400);
      }).catch(() => {});
    }

    /** Play the enter sequence again (playground helper). */
    replay() {
      this._stopAnims();
      this.revealed = false;
      this.root.classList.add('is-pending');
      this._measure();
      // let the pending styles paint before animating out of them
      requestAnimationFrame(() => requestAnimationFrame(() => this._reveal()));
    }

    /* ---- pulses --------------------------------------------------------- */

    _tick(on, delay) {
      clearTimeout(this._timer);
      this._timer = 0;
      if (!on || !this.options.pulse || reduced()) return;
      this._timer = setTimeout(() => { this.pulse(); this._tick(true); }, delay ?? this.options.pulseInterval);
    }

    /** Send a pulse from the verdict down every connector, or down one (index). */
    pulse(index) {
      const o = this.options;
      if (index == null) this._flash(this.verdict, 'is-sending', 500);
      this.links.forEach((l, i) => {
        if (index != null && i !== index) return;
        const full = index != null || l.tone === 'accent';
        this._runPulse(l, full);
        if (full) this.root.dispatchEvent(new CustomEvent('sa:pulse', { detail: { index: i } }));
      });
    }

    _runPulse(l, full) {
      const o = this.options;
      const L = Math.min(o.pulseLength, l.length * 0.6), total = l.length;
      const dur = o.pulseDuration, ease = o.pulseEasing;
      const run = (path, dash, peak) => {
        path.style.strokeDasharray = `${dash} ${total + dash}`;
        path.style.opacity = '';
        const move = path.animate([{ strokeDashoffset: dash }, { strokeDashoffset: -total }], { duration: dur, easing: ease, fill: 'both' });
        const fade = full
          ? path.animate([{ opacity: 0 }, { opacity: peak, offset: 0.12 }, { opacity: peak, offset: 0.85 }, { opacity: 0 }], { duration: dur, fill: 'both' })
          : path.animate([{ opacity: 0 }, { opacity: peak * 0.8, offset: 0.1 }, { opacity: 0, offset: o.sideReach }, { opacity: 0 }], { duration: dur, fill: 'both' });
        this._anims.push(move, fade);
        return move.finished.then(() => { move.cancel(); fade.cancel(); path.style.opacity = 0; }).catch(() => {});
      };
      run(l.tail, L * 1.8, 1);
      run(l.head, L, 1).then(() => { if (full) this._flash(l.card, 'is-charged', o.charge); });
    }

    _flash(node, cls, ms) {
      node.classList.add(cls);
      clearTimeout(node._saFlash);
      node._saFlash = setTimeout(() => node.classList.remove(cls), ms);
    }

    _hover(i, on) {
      const l = this.links[i];
      l.line.classList.toggle('is-hot', on);
      if (on && !reduced()) this.pulse(i);
    }

    _stopAnims() {
      this._anims.forEach(a => { try { a.cancel(); } catch (e) {} });
      this._anims = [];
      this.links.forEach(l => { l.tail.style.opacity = 0; l.head.style.opacity = 0; });
    }

    /* ---- public --------------------------------------------------------- */

    start() { this.running = true; this._tick(this.visible && !document.hidden); }
    stop() { this.running = false; this._tick(false); }

    setOptions(patch) {
      const prev = this.options;
      this.options = merge(prev, patch);
      const rebuild = ['verdict', 'options', 'hover', 'reveal'].some(k => k in patch);
      if (rebuild) {
        this._stopAnims();
        this.revealed = false;
        this._build();
        this.cards.forEach(c => this._ro.observe(c));
        this._ro.observe(this.verdict);
        if (!this.options.reveal || reduced()) this.revealed = true;
      }
      this._applyTokens();
      this._measure();
      if (rebuild && this.visible && !this.revealed) this._reveal();
      this._tick(this.running && this.visible && !document.hidden);
    }

    destroy() {
      this.stop();
      this._stopAnims();
      this._ro.disconnect();
      this._io.disconnect();
      document.removeEventListener('visibilitychange', this._onVis);
      this.root.innerHTML = '';
      this.root.classList.remove('sa', 'is-pending', 'is-stacked', 'sa--beam');
    }
  }

  ShortAnswer.defaults = defaults;
  ShortAnswer.icons = ICONS;
  global.ShortAnswer = ShortAnswer;
})(window);
