/* Playground definition for Hero (S : Hero).
   Not part of the module: a site needs only hero.css + hero.js, its own
   markup and screenshots.
   The stage is a window of its own, the first screen of the site: the site
   header on top (the component the S : Header tab provides through the
   shell; it follows that tab's settings) and the hero under it, scrolling
   as a page would.
   Everything else is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  const DIR = 'hero-section/';

  // the tab icons from the design, inlined so the block makes no extra requests
  const ICONS = {
    speed: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 7.8C12.331 7.8 12.6 7.531 12.6 7.2C12.6 6.868 12.331 6.6 12 6.6C11.668 6.6 11.4 6.868 11.4 7.2C11.4 7.531 11.668 7.8 12 7.8Z"/><path d="M6 13.8C6.331 13.8 6.6 13.531 6.6 13.2C6.6 12.868 6.331 12.6 6 12.6C5.668 12.6 5.4 12.868 5.4 13.2C5.4 13.531 5.668 13.8 6 13.8Z"/><path d="M18 13.8C18.331 13.8 18.6 13.531 18.6 13.2C18.6 12.868 18.331 12.6 18 12.6C17.668 12.6 17.4 12.868 17.4 13.2C17.4 13.531 17.668 13.8 18 13.8Z"/><path d="M8.181 9.381C7.947 9.615 7.567 9.615 7.333 9.381C7.098 9.147 7.098 8.767 7.333 8.533C7.567 8.298 7.947 8.298 8.181 8.533C8.415 8.767 8.415 9.147 8.181 9.381Z"/><path d="M16.016 8.375C16.360 8.605 16.453 9.071 16.224 9.415L13.143 14.036C13.180 14.151 13.2 14.273 13.2 14.4C13.2 15.062 12.662 15.6 12 15.6C11.337 15.6 10.8 15.062 10.8 14.4C10.8 13.772 11.281 13.257 11.895 13.204L14.976 8.583C15.205 8.239 15.671 8.146 16.016 8.375Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M20.159 18.260C19.775 18.878 19.070 19.2 18.342 19.2H5.657C4.929 19.2 4.224 18.878 3.840 18.260C2.927 16.791 2.4 15.057 2.4 13.2C2.4 7.898 6.698 3.6 12 3.6C17.301 3.6 21.6 7.898 21.6 13.2C21.6 15.057 21.072 16.791 20.159 18.260ZM18.885 17.468C19.655 16.23 20.1 14.769 20.1 13.2C20.1 8.726 16.473 5.1 12 5.1C7.526 5.1 3.9 8.726 3.9 13.2C3.9 14.769 4.344 16.23 5.114 17.468C5.174 17.565 5.344 17.7 5.657 17.7H18.342C18.656 17.7 18.825 17.565 18.885 17.468Z"/></svg>',
    checklist: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.05 17.4C13.05 16.985 13.385 16.65 13.8 16.65H21C21.414 16.65 21.75 16.985 21.75 17.4C21.75 17.814 21.414 18.15 21 18.15H13.8C13.385 18.15 13.05 17.814 13.05 17.4Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.05 6.6C13.05 6.185 13.385 5.85 13.8 5.85H21C21.414 5.85 21.75 6.185 21.75 6.6C21.75 7.014 21.414 7.35 21 7.35H13.8C13.385 7.35 13.05 7.014 13.05 6.6Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.6 20.1C8.091 20.1 9.3 18.891 9.3 17.4C9.3 15.908 8.091 14.7 6.6 14.7C5.108 14.7 3.9 15.908 3.9 17.4C3.9 18.891 5.108 20.1 6.6 20.1ZM6.6 21.6C8.919 21.6 10.8 19.719 10.8 17.4C10.8 15.080 8.919 13.2 6.6 13.2C4.280 13.2 2.4 15.080 2.4 17.4C2.4 19.719 4.280 21.6 6.6 21.6Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.6 10.8C8.919 10.8 10.8 8.919 10.8 6.6C10.8 4.280 8.919 2.4 6.6 2.4C4.280 2.4 2.4 4.280 2.4 6.6C2.4 8.919 4.280 10.8 6.6 10.8ZM9.023 5.215C9.253 4.871 9.160 4.405 8.815 4.175C8.471 3.946 8.005 4.039 7.775 4.383L5.999 7.047L5.423 6.183C5.194 5.839 4.728 5.746 4.383 5.975C4.039 6.205 3.946 6.671 4.175 7.015L5.375 8.815C5.515 9.024 5.749 9.149 5.999 9.149C6.250 9.149 6.484 9.024 6.623 8.815L9.023 5.215Z"/></svg>',
    gantt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.2 5.1H3.6C3.102 5.1 2.7 5.502 2.7 6V8.4C2.7 8.897 3.102 9.3 3.6 9.3H13.2C13.697 9.3 14.1 8.897 14.1 8.4V6C14.1 5.502 13.697 5.1 13.2 5.1ZM14.362 10.5C15.100 10.090 15.6 9.303 15.6 8.4V6C15.6 4.674 14.525 3.6 13.2 3.6H3.6C2.274 3.6 1.2 4.674 1.2 6V8.4C1.2 9.725 2.274 10.8 3.6 10.8H13.2C13.621 10.8 14.018 10.691 14.362 10.5ZM10.8 13.2C10.378 13.2 9.981 13.308 9.637 13.5C8.899 13.909 8.4 14.696 8.4 15.6V18C8.4 19.325 9.474 20.4 10.8 20.4H20.4C21.725 20.4 22.8 19.325 22.8 18V15.6C22.8 14.274 21.725 13.2 20.4 13.2H10.8ZM21.3 18V15.6C21.3 15.102 20.897 14.7 20.4 14.7H10.8C10.302 14.7 9.9 15.102 9.9 15.6V18C9.9 18.497 10.302 18.9 10.8 18.9H20.4C20.897 18.9 21.3 18.497 21.3 18Z"/></svg>',
    reaction: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.55 1.2C20.55 0.785 20.214 0.45 19.8 0.45C19.385 0.45 19.05 0.785 19.05 1.2V3.45H16.8C16.385 3.45 16.05 3.785 16.05 4.2C16.05 4.614 16.385 4.95 16.8 4.95H19.05V7.2C19.05 7.614 19.385 7.95 19.8 7.95C20.214 7.95 20.55 7.614 20.55 7.2V4.95H22.8C23.214 4.95 23.55 4.614 23.55 4.2C23.55 3.785 23.214 3.45 22.8 3.45H20.55V1.2Z"/><path d="M13.534 1.309C13.955 1.37 14.219 1.783 14.128 2.198C14.038 2.614 13.628 2.875 13.206 2.819C11.485 2.593 9.728 2.855 8.140 3.583C6.318 4.418 4.817 5.823 3.861 7.584C2.905 9.346 2.547 11.371 2.840 13.354C3.133 15.336 4.062 17.171 5.486 18.581C6.911 19.991 8.755 20.900 10.740 21.173C12.726 21.445 14.747 21.066 16.499 20.092C18.251 19.118 19.639 17.602 20.456 15.771C21.167 14.176 21.411 12.417 21.167 10.698C21.107 10.277 21.363 9.864 21.778 9.769C22.193 9.675 22.609 9.934 22.674 10.355C22.989 12.400 22.710 14.499 21.863 16.399C20.910 18.534 19.291 20.303 17.247 21.439C15.204 22.575 12.847 23.017 10.531 22.699C8.215 22.381 6.064 21.320 4.402 19.676C2.741 18.031 1.657 15.892 1.316 13.579C0.974 11.266 1.392 8.905 2.506 6.850C3.621 4.795 5.373 3.157 7.498 2.182C9.389 1.315 11.485 1.015 13.534 1.309Z"/><path d="M8.4 12C9.062 12 9.6 11.194 9.6 10.2C9.6 9.205 9.062 8.4 8.4 8.4C7.737 8.4 7.2 9.205 7.2 10.2C7.2 11.194 7.737 12 8.4 12Z"/><path d="M16.8 10.2C16.8 11.194 16.262 12 15.6 12C14.937 12 14.4 11.194 14.4 10.2C14.4 9.205 14.937 8.4 15.6 8.4C16.262 8.4 16.8 9.205 16.8 10.2Z"/><path d="M12 18C13.677 18 14.994 16.995 15.569 15.147C15.645 14.904 15.615 14.4 15.062 14.4H8.937C8.384 14.4 8.354 14.909 8.430 15.147C9.005 16.995 10.322 18 12 18Z"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.2 5.962C1.2 5.605 1.358 5.268 1.631 5.040L3.798 3.234C4.445 2.695 5.261 2.4 6.103 2.4L18 2.4C19.988 2.4 21.6 4.011 21.6 6V18C21.6 19.988 19.988 21.6 18 21.6L2.4 21.6C1.737 21.6 1.2 21.062 1.2 20.4L1.2 5.962ZM20.1 6V18C20.1 19.159 19.159 20.1 18 20.1H5.55L5.55 3.974C5.729 3.925 5.915 3.9 6.103 3.9L18 3.9C19.159 3.9 20.1 4.840 20.1 6ZM4.05 4.977L2.7 6.102L2.7 20.1H4.05L4.05 4.977Z"/><path d="M10.8 8.4C10.8 7.737 11.337 7.2 12 7.2C12.662 7.2 13.2 7.737 13.2 8.4V18H10.8V8.4Z"/><path d="M7.2 14.4V18H9.6V14.4C9.6 13.737 9.062 13.2 8.4 13.2C7.737 13.2 7.2 13.737 7.2 14.4Z"/><path d="M16.8 10.8C16.8 10.137 16.262 9.6 15.6 9.6C14.937 9.6 14.4 10.137 14.4 10.8V18H16.8V10.8Z"/></svg>',
    stopwatch: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.8 1.05C10.385 1.05 10.05 1.385 10.05 1.8C10.05 2.214 10.385 2.55 10.8 2.55H13.2C13.614 2.55 13.95 2.214 13.95 1.8C13.95 1.385 13.614 1.05 13.2 1.05H10.8Z"/><path d="M12.75 7.8C12.75 7.385 12.414 7.05 12 7.05C11.585 7.05 11.25 7.385 11.25 7.8V12.263C10.975 12.483 10.8 12.821 10.8 13.2C10.8 13.862 11.337 14.4 12 14.4C12.662 14.4 13.2 13.862 13.2 13.2C13.2 12.821 13.024 12.483 12.75 12.263V7.8Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M18.610 5.235C18.851 4.898 18.773 4.430 18.435 4.189C18.098 3.948 17.630 4.027 17.389 4.364L16.953 4.974C15.507 4.102 13.812 3.6 12 3.6C6.698 3.6 2.4 7.898 2.4 13.2C2.4 18.501 6.698 22.8 12 22.8C17.301 22.8 21.6 18.501 21.6 13.2C21.6 10.248 20.268 7.608 18.173 5.847L18.610 5.235ZM16.659 6.573C16.674 6.586 16.690 6.598 16.706 6.610C16.723 6.621 16.739 6.632 16.756 6.642C18.782 8.114 20.1 10.503 20.1 13.2C20.1 17.673 16.473 21.3 12 21.3C7.526 21.3 3.9 17.673 3.9 13.2C3.9 8.726 7.526 5.1 12 5.1C13.734 5.1 15.341 5.645 16.659 6.573Z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.648 13.478C7.618 13.567 7.548 13.636 7.460 13.666L2.603 15.324C2.332 15.417 2.332 15.801 2.603 15.894L7.460 17.552C7.548 17.582 7.618 17.651 7.648 17.74L9.306 22.596C9.399 22.867 9.783 22.867 9.876 22.596L11.535 17.74C11.565 17.651 11.634 17.582 11.722 17.552L16.579 15.894C16.851 15.801 16.851 15.417 16.579 15.324L11.722 13.666C11.634 13.636 11.565 13.567 11.535 13.478L9.876 8.622C9.783 8.351 9.399 8.351 9.306 8.622L7.648 13.478ZM9.591 12.442L9.071 13.965C8.891 14.493 8.475 14.909 7.946 15.089L6.424 15.609L7.946 16.129C8.475 16.309 8.891 16.725 9.071 17.253L9.591 18.776L10.111 17.253C10.292 16.725 10.707 16.309 11.236 16.129L12.758 15.609L11.236 15.089C10.707 14.909 10.292 14.493 10.111 13.965L9.591 12.442Z"/><path d="M17.730 2.606C17.823 2.335 18.207 2.335 18.299 2.606L19.345 5.669C19.375 5.757 19.445 5.826 19.533 5.856L22.596 6.902C22.867 6.995 22.867 7.379 22.596 7.472L19.533 8.517C19.445 8.548 19.375 8.617 19.345 8.705L18.299 11.768C18.207 12.039 17.823 12.039 17.730 11.768L16.684 8.705C16.654 8.617 16.585 8.548 16.496 8.517L13.433 7.472C13.162 7.379 13.162 6.995 13.433 6.902L16.496 5.856C16.585 5.826 16.654 5.757 16.684 5.669L17.730 2.606Z"/><path d="M6.867 1.403C6.775 1.132 6.391 1.132 6.298 1.403L5.712 3.120C5.681 3.209 5.612 3.278 5.524 3.308L3.806 3.894C3.535 3.987 3.535 4.371 3.806 4.464L5.524 5.050C5.612 5.080 5.681 5.149 5.712 5.238L6.298 6.955C6.391 7.226 6.775 7.226 6.867 6.955L7.454 5.238C7.484 5.149 7.553 5.080 7.641 5.050L9.359 4.464C9.631 4.371 9.631 3.987 9.359 3.894L7.641 3.308C7.553 3.278 7.484 3.209 7.454 3.120L6.867 1.403Z"/></svg>',
    bolt: '<svg viewBox="0 0 16 16.5" fill="none" aria-hidden="true"><path d="M10.084 0.653C10.718 0.223 11.614 0.767 11.463 1.571L10.54 6.498L12.462 8.422C12.820 8.780 12.813 9.363 12.445 9.711L6.039 15.781C5.405 16.380 4.375 15.819 4.536 14.961L5.458 10.033L3.537 8.110C3.179 7.751 3.187 7.169 3.554 6.821L9.960 0.751L10.084 0.653Z" fill="#899506" stroke="#5A6204" stroke-linecap="round"/></svg>',
    chevL: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.030 4.469C12.323 4.762 12.323 5.237 12.030 5.530L7.560 10L12.030 14.469C12.323 14.762 12.323 15.237 12.030 15.530C11.737 15.823 11.262 15.823 10.969 15.530L5.969 10.530C5.829 10.389 5.75 10.198 5.75 10C5.75 9.801 5.829 9.610 5.969 9.469L10.969 4.469C11.262 4.176 11.737 4.176 12.030 4.469Z"/></svg>',
    chevR: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.969 4.469C8.262 4.176 8.737 4.176 9.030 4.469L14.030 9.469C14.171 9.610 14.25 9.801 14.25 10C14.25 10.198 14.171 10.389 14.030 10.530L9.030 15.530C8.737 15.823 8.262 15.823 7.969 15.530C7.676 15.237 7.676 14.762 7.969 14.469L12.439 10L7.969 5.530C7.676 5.237 7.676 4.762 7.969 4.469Z"/></svg>',
  };

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'speed' },
    { id: 'tasks', label: 'Tasks', icon: 'checklist' },
    { id: 'gantt', label: 'Gantt chart', icon: 'gantt' },
    { id: 'communication', label: 'Communication', icon: 'reaction' },
    { id: 'reports', label: 'Reports', icon: 'report' },
    { id: 'time-tracking', label: 'Time tracking', icon: 'stopwatch' },
    { id: 'task-details', label: 'Task details', icon: 'sparkle' },
  ];

  // state key -> custom property on .hero, with its unit (the narrow composition)
  const VARS = {
    stageH: ['--hero-stage-h', 'cqw'],
    deskW: ['--hero-desk-w', 'cqw'], deskX: ['--hero-desk-x', 'cqw'],
    deskS: ['--hero-desk-s', ''], deskTx: ['--hero-desk-tx', 'cqw'], deskTy: ['--hero-desk-ty', 'cqw'],
    phoneW: ['--hero-phone-w', 'cqw'], phoneX: ['--hero-phone-x', 'cqw'],
    phoneS: ['--hero-phone-s', ''], phoneTx: ['--hero-phone-tx', 'cqw'], phoneTy: ['--hero-phone-ty', 'cqw'],
  };

  // the phone is always on top, so every composition keeps the desktop thumb mostly out from under it
  // phone thumb bigger and lower than in Figma, so almost half of it sits on the section background;
  // with the phone main, the desktop keeps its size and slides behind it, centred on the phone
  const FIGMA = { stageH: 124, deskW: 139, deskX: 5, deskS: 1, deskTx: 5, deskTy: 14, phoneW: 52, phoneX: 43, phoneS: 0.77, phoneTx: 55, phoneTy: 36 };
  const MOTION = { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)', overshoot: 0.2, tilt: 3, lift: true };
  // one preset: the composition and motion as agreed; everything else is the sliders
  const PRESETS = {
    figma: { label: 'Figma', patch: Object.assign({}, FIGMA, MOTION) },
  };

  const defaults = Object.assign({}, Hero.defaults, { content: 'lead', badge: true }, FIGMA);

  const EASINGS = [
    ['cubic-bezier(.22, 1, .36, 1)', 'out-quint'], ['cubic-bezier(.16, 1, .3, 1)', 'out-expo'], ['cubic-bezier(.65, 0, .35, 1)', 'in-out-cubic'],
    ['cubic-bezier(.34, 1.4, .64, 1)', 'back-out'], ['cubic-bezier(.4, 0, .2, 1)', 'standard'], ['ease-in-out', 'ease-in-out'],
  ];

  let hero = null, root = null;

  /* the block's markup; every view has its own pair of screenshots from Figma */
  // every picture is AVIF with a WebP fallback; the desktop one also has a 1280 px
  // candidate for phones, where it renders at ~560 CSS px
  const SIZES = '(max-width: 639px) 140vw, 1280px';
  const srcset = (base, d, ext) => `${base}img/${d}-1280.${ext} 1280w, ${base}img/${d}.${ext} 2496w`;
  const tab = (v, i, base) => {
    const d = v.id;
    return `<button type="button" class="hero__tab" role="tab" aria-selected="${i === 0}"
                  data-desktop="${base}img/${d}.webp" data-desktop-srcset="${srcset(base, d, 'webp')}" data-desktop-avif="${srcset(base, d, 'avif')}"
                  data-phone="${base}img/${d}-phone.webp" data-phone-avif="${base}img/${d}-phone.avif">${ICONS[v.icon]}<span>${v.label}</span></button>`;
  };
  const pictures = base => `<button type="button" class="hero__screen hero__screen--desktop" data-screen="desktop" aria-label="Show the desktop version">
          <picture>
            <source type="image/avif" srcset="${srcset(base, 'dashboard', 'avif')}" sizes="${SIZES}">
            <img src="${base}img/dashboard.webp" srcset="${srcset(base, 'dashboard', 'webp')}" sizes="${SIZES}" width="2496" height="1528" alt="Worksection dashboard on desktop" fetchpriority="high" decoding="async">
          </picture>
        </button>
        <button type="button" class="hero__screen hero__screen--phone" data-screen="phone" aria-label="Show the mobile version">
          <picture>
            <source type="image/avif" srcset="${base}img/dashboard-phone.avif">
            <img src="${base}img/dashboard-phone.webp" width="804" height="1748" alt="Worksection dashboard on a phone" loading="lazy" decoding="async">
          </picture>
        </button>`;
  const markup = (s, base, demo) => `<section class="hero" id="hero">
  <div class="hero__inner">
    <div class="hero__head">
      ${demo || s.badge ? `<a class="hero__badge" href="#"${demo && !s.badge ? ' hidden' : ''}>${ICONS.bolt}<span>Worksection 2.0 доступний кожному! <u>Дізнатися більше</u></span></a>` : ''}
      <h1 class="hero__title">Project management built <br>for teams, not just tasks</h1>
      ${demo || s.content === 'lead' ? `<p class="hero__lead"${demo && s.content !== 'lead' ? ' hidden' : ''}>We believe in teamocracy: people first, success follows. Worksection empowers teams and simplifies project management for all.</p>` : ''}
      ${demo || s.content === 'list' ? `<ul class="hero__list"${demo && s.content !== 'list' ? ' hidden' : ''}><li>Заощаджуйте кошти</li><li>Заощаджуйте час</li><li>Створюйте простір продуктивності</li></ul>` : ''}
      <div class="hero__cta">
        <a class="hero__btn hero__btn--primary" href="#">Get started</a>
        <a class="hero__btn" href="#">Contact sales</a>
      </div>
      <p class="hero__note">14 day trial, no credit card required</p>
    </div>
    <div class="hero__view">
      <div class="hero__tabs">
        <button type="button" class="hero__arrow hero__arrow--prev" aria-label="Previous view">${ICONS.chevL}</button>
        <div class="hero__tablist" role="tablist" aria-label="Product views">
          ${VIEWS.map((v, i) => tab(v, i, base)).join('\n          ')}
        </div>
        <button type="button" class="hero__arrow hero__arrow--next" aria-label="Next view">${ICONS.chevR}</button>
      </div>
      <div class="hero__screens" data-main="${s.main}">
        ${pictures(base)}
      </div>
    </div>
  </div>
</section>`;

  const snippet = s => `<!-- у <head>: LCP-картинка стартує до того, як парсер дійде до <img>,
     повз шрифти, скрипти й шапку. Той самий srcset/sizes, що й у <source> -->
<link rel="preload" as="image" type="image/avif" fetchpriority="high"
      imagesrcset="${srcset('', 'dashboard', 'avif')}" imagesizes="${SIZES}">
<link rel="stylesheet" href="hero.css">

<!-- кожна вкладка несе свою пару скріншотів у data-desktop / data-phone;
     без hero.js блок теж рендериться: перша вкладка і композиція з data-main -->
${markup(s, '', false)}

<script src="hero.js"><\/script>
<script>
  new Hero('#hero', {
    view: ${s.view},
    main: '${s.main}',
    swap: ${s.swap},
    hint: ${s.hint},
    duration: ${s.duration},
    easing: '${s.easing}',
    overshoot: ${s.overshoot},
    tilt: ${s.tilt},
    lift: ${s.lift},
    entrance: ${s.entrance},
    tiltIn: ${s.tiltIn},
    fadeFrom: ${s.fadeFrom},
    tiltRest: ${s.tiltRest},
    perspective: ${s.perspective},
    fly: ${s.fly},
    fade: ${s.fade},
    switch: '${s.switch}',
    strength: ${s.strength},
    stagger: ${s.stagger},
  });
<\/script>

<!-- композиція для вузьких екранів (< 640 px): CSS-змінні на .hero,
     у cqw = 1 % ширини блоку. *-w/x/y: скрін як головний, *-s/tx/ty: він же як мініатюра -->
<style>
  .hero {
    --hero-stage-h: ${s.stageH}cqw;
    --hero-desk-w: ${s.deskW}cqw;   --hero-desk-x: ${s.deskX}cqw;
    --hero-desk-s: ${s.deskS};       --hero-desk-tx: ${s.deskTx}cqw;   --hero-desk-ty: ${s.deskTy}cqw;
    --hero-phone-w: ${s.phoneW}cqw;  --hero-phone-x: ${s.phoneX}cqw;
    --hero-phone-s: ${s.phoneS};     --hero-phone-tx: ${s.phoneTx}cqw; --hero-phone-ty: ${s.phoneTy}cqw;
  }
</style>`;

  const narrow = () => root && root.clientWidth < 640;
  const pct = v => Math.round(v * 100) + ' %';

  Playground.css(`
    /* the first screen of the site: the bar sticks to this scroller, not to the stage, exactly as it will to the window */
    .hero-browser { position: relative; width: 100%; flex: 1 1 auto; min-height: 320px; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 0 0 1px #e4e4e4, 0 16px 40px -16px rgba(0,0,0,.18); }
    .hero-browser__scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; }
    .hero-browser__below { height: 40cqw; min-height: 240px; margin: 24px; border-radius: 16px; background: rgba(22,34,34,.05); }
    .hero-browser__page { container-type: inline-size; }
  `);


  Playground.register({
    id: 'hero',
    title: 'Hero: адаптивні скріншоти',
    tab: 'S : Hero',
    summary: 'Блок «S : Hero»: заголовок, CTA, вкладки і два скріншоти. На телефоні тап міняє головний скрін.',
    dir: 'hero-section',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'hero.css', file: 'hero-section/hero.css' },
      { id: 'js', label: 'hero.js', file: 'hero-section/hero.js' },
    ],
    defaults,
    presets: Object.values(PRESETS),
    stage: { className: 'stage--fill' },
    controls: [
      { title: 'Скріншоти', items: [
        { type: 'seg', key: 'main', label: 'Головний скрін', options: [['desktop', 'Десктоп'], ['phone', 'Телефон']] },
        { type: 'check', key: 'swap', label: 'Тап по мініатюрі робить її головною' },
        { type: 'check', key: 'hint', label: 'Бейдж-підказка на мініатюрі', when: s => s.swap },
        { type: 'range', key: 'duration', label: 'Тривалість свапу', min: 200, max: 1500, step: 50, unit: 'ms' },
        { type: 'select', key: 'easing', label: 'Easing (той, що зменшується)', options: EASINGS },
        { type: 'range', key: 'overshoot', label: 'Перельот того, що росте', min: 0, max: 0.5, step: 0.05, fmt: v => v === 0 ? 'нема' : v.toFixed(2) },
        { type: 'range', key: 'tilt', label: 'Нахил у польоті', min: 0, max: 8, step: 0.5, unit: '°' },
        { type: 'check', key: 'lift', label: 'Тінь-підйом під телефоном' },
        { type: 'buttons', items: [{ label: 'Свапнути', primary: true, run: () => hero.toggle() }] },
        { type: 'note', text: 'Свап живе лише у вузькій композиції (< 640 px). Постав ширину фрейму 390 або 320. Телефон завжди зверху, десктоп-мініатюра визирає з-під нього.' },
      ] },
      { title: 'Поява при скролі', items: [
        { type: 'check', key: 'entrance', label: 'Вкладки, сцена з нахилу, телефон вилітає' },
        { type: 'buttons', items: [{ label: 'Програти появу', primary: true, run: () => {
          // drop only the WAAPI entrance animations; the CSS ones (scroll-driven rest lean, swap) stay
          for (const el of root.querySelectorAll('.hero__screens, .hero__screen--phone, .hero__tab, .hero__arrow')) el.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation) && !(a instanceof CSSTransition)) a.cancel(); });
          hero.enter();
        } }], when: s => s.entrance },
        { type: 'range', key: 'tiltIn', label: 'Початковий нахил', min: 0, max: 30, step: 1, unit: '°', when: s => s.entrance },
        { type: 'range', key: 'fadeFrom', label: 'Сцена стартує з прозорості', min: 0.1, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + ' %', when: s => s.entrance },
        { type: 'range', key: 'perspective', label: 'Перспектива (менше = сильніше)', min: 300, max: 2000, step: 50, unit: 'px', when: s => s.entrance },
        { type: 'range', key: 'tiltRest', label: 'Залишковий нахил, сходить при скролі', min: 0, max: 6, step: 0.5, unit: '°', when: s => s.entrance },
        { type: 'range', key: 'fly', label: 'Телефон стартує правіше на', min: 0, max: 200, step: 10, unit: 'px', when: s => s.entrance },
        { type: 'note', text: 'Як на sketch.com: один раз, коли блок з’являється у в’юпорті, лише в широкій композиції (≥ 640 px); на телефонах появи немає взагалі. Сцена стартує не з нуля прозорості, бо десктопний скріншот це LCP-елемент, а невидимий елемент Chrome не рахує намальованим. Усе на opacity і transform, CLS нуль. Залишковий нахил керується скролом (animation-timeline: view()).' },
      ] },
      { title: 'Вкладки', items: [
        { type: 'select', key: 'view', label: 'Активна вкладка', options: VIEWS.map((v, i) => [i, v.label]) },
        { type: 'select', key: 'switch', label: 'Ефект зміни скріншота', options: [['blur', 'Blur: крізь розмиття'], ['wipe', 'Wipe: діагональна шторка'], ['circle', 'Circle: розкриття колом'], ['slide', 'Slide: зсув'], ['zoom', 'Zoom: з масштабу'], ['fade', 'Fade: чистий кросфейд']] },
        { type: 'range', key: 'fade', label: 'Тривалість зміни', min: 0, max: 1500, step: 50, unit: 'ms' },
        { type: 'range', key: 'strength', label: 'Сила ефекту', min: 0.2, max: 1.5, step: 0.05, fmt: v => Math.round(v * 100) + ' %', when: s => s.switch !== 'fade' && s.switch !== 'wipe' && s.switch !== 'circle' },
        { type: 'range', key: 'stagger', label: 'Телефон запізнюється на', min: 0, max: 300, step: 10, unit: 'ms' },
        { type: 'buttons', items: [{ label: '← Попередня', run: () => hero.prev() }, { label: 'Наступна →', primary: true, run: () => hero.next() }] },
        { type: 'note', text: 'Кожна вкладка несе свою пару скріншотів у data-desktop / data-phone (AVIF + WebP). На телефоні вкладки гортаються і свайпом по скріншотах.' },
      ] },
      { title: 'Композиція (< 640 px)', items: [
        { type: 'range', key: 'stageH', label: 'Висота сцени', min: 70, max: 150, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'deskW', label: 'Десктоп: ширина', min: 90, max: 170, step: 1, unit: 'cqw' },
        { type: 'range', key: 'deskX', label: 'Десктоп: зсув X', min: -40, max: 40, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'deskS', label: 'Десктоп: масштаб під телефоном', min: 0.25, max: 1, step: 0.005, fmt: pct },
        { type: 'range', key: 'deskTx', label: 'Десктоп-мініатюра: X', min: -20, max: 70, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'deskTy', label: 'Десктоп-мініатюра: Y', min: 0, max: 120, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'phoneW', label: 'Телефон: ширина', min: 30, max: 80, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'phoneX', label: 'Телефон: зсув X', min: 0, max: 70, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'phoneS', label: 'Телефон: масштаб мініатюри', min: 0.3, max: 1, step: 0.005, fmt: pct },
        { type: 'range', key: 'phoneTx', label: 'Телефон-мініатюра: X', min: 0, max: 80, step: 0.5, unit: 'cqw' },
        { type: 'range', key: 'phoneTy', label: 'Телефон-мініатюра: Y', min: 0, max: 100, step: 0.5, unit: 'cqw' },
        { type: 'status', render: () => {
          const w = root.clientWidth, cq = w / 100;
          return `Ширина блоку: <b>${w}px</b> · 1 cqw = <b>${cq.toFixed(2)}px</b> · композиція: <b>${narrow() ? 'вузька' : w < 1024 ? 'планшет' : 'широка'}</b>`;
        } },
      ] },
      { title: 'Контент', items: [
        { type: 'seg', key: 'content', label: 'Під заголовком', options: [['lead', 'Підзаголовок'], ['list', 'Чек-лист']] },
        { type: 'check', key: 'badge', label: 'Бейдж над заголовком' },
      ] },
    ],

    mount(ctx) {
      ctx.frame.insertAdjacentHTML('beforeend', `<div class="hero-browser"><div class="hero-browser__scroll"><div class="hero-browser__page">
        ${markup(defaults, DIR, true)}
        <div class="hero-browser__below"></div>
      </div></div></div>`);
      root = ctx.frame.querySelector('.hero');
      hero = new Hero(root);
      // the site header above the hero: the S : Header tab is the master, this copy follows its settings
      Playground.consume('site-header', ctx.frame.querySelector('.hero-browser__page'));
      ctx.instance = hero;
      // taps in the demo flow back into the panel
      root.addEventListener('hero:main', e => { if (ctx.state.main !== e.detail.main) ctx.set({ main: e.detail.main }); });
      root.addEventListener('hero:view', e => { if (ctx.state.view !== e.detail.index) ctx.set({ view: e.detail.index }); });
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(root);
    },
    apply(ctx, patch) {
      const s = ctx.state;
      const opt = {};
      for (const k of Object.keys(Hero.defaults)) if (k in patch) opt[k] = s[k];
      if (Object.keys(opt).length) hero.setOptions(opt);
      for (const [k, [prop, unit]] of Object.entries(VARS)) root.style.setProperty(prop, s[k] + unit);
      root.querySelector('.hero__lead').hidden = s.content !== 'lead';
      root.querySelector('.hero__list').hidden = s.content !== 'list';
      root.querySelector('.hero__badge').hidden = !s.badge;
    },
    hint(ctx) {
      const s = ctx.state;
      if (!narrow()) return `Широка композиція (${root.clientWidth} px). Звузь фрейм до 390 px, щоб побачити мобільну зі свапом`;
      if (!s.swap) return 'Свап вимкнено: скріншоти статичні';
      return s.main === 'desktop' ? 'Тапни по телефону, щоб зробити його головним' : 'Тапни по десктопному скріншоту, щоб повернути його';
    },
  });
})();
