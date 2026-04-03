// ==UserScript==
// @name         osu-web Fully Animated
// @namespace    https://github.com/xydesu
// @version      1.0.0
// @description  Smooth page transitions, global fade-ins, animated UI elements, and subtle parallax on osu-web.
// @author       you
// @match        https://osu.ppy.sh/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const STYLE_ID = 'xydesu-osu-web-fully-animated-style';
  const ROOT_CLASS = 'xydesu-animated-ready';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const css = `
      :root {
        --xydesu-ease: cubic-bezier(.22,.61,.36,1);
        --xydesu-fast: 180ms;
        --xydesu-med: 320ms;
        --xydesu-slow: 520ms;
        --xydesu-fade-y: 14px;
        --xydesu-hover-y: -3px;
        --xydesu-hover-scale: 1.015;
        --xydesu-shadow:
          0 6px 18px rgba(0,0,0,.20),
          0 2px 6px rgba(0,0,0,.18);
      }

      html, body {
        scroll-behavior: smooth;
      }

      body {
        opacity: 0;
        transform: translateY(6px);
        transition:
          opacity var(--xydesu-slow) var(--xydesu-ease),
          transform var(--xydesu-slow) var(--xydesu-ease),
          background-position 900ms linear;
        will-change: opacity, transform;
      }

      html.${ROOT_CLASS} body {
        opacity: 1;
        transform: translateY(0);
      }

      main, [role="main"], .js-react--profile-page, .osu-layout {
        animation: xydesu-fade-slide-in var(--xydesu-med) var(--xydesu-ease);
      }

      @keyframes xydesu-fade-slide-in {
        from { opacity: 0; transform: translateY(var(--xydesu-fade-y)); }
        to   { opacity: 1; transform: translateY(0); }
      }

      *, *::before, *::after {
        transition-property:
          color, background-color, border-color, box-shadow, opacity, transform, filter, text-shadow;
        transition-duration: var(--xydesu-fast);
        transition-timing-function: var(--xydesu-ease);
      }

      a, button, [role="button"], .btn, .button, .nav2__col, .menu__item {
        transform: translateZ(0);
        backface-visibility: hidden;
      }

      a:hover, button:hover, [role="button"]:hover, .btn:hover, .button:hover,
      .nav2__col:hover, .menu__item:hover {
        transform: translateY(var(--xydesu-hover-y)) scale(var(--xydesu-hover-scale));
        filter: saturate(1.05);
      }

      a:active, button:active, [role="button"]:active, .btn:active, .button:active {
        transform: translateY(0) scale(0.99);
      }

      .beatmapset-panel, .news-post-preview, .forum-topic-entry, .user-card,
      .profile-page__component, .value-display, .osu-page--generic > .content-with-header {
        transform: translateZ(0);
      }

      .beatmapset-panel:hover, .news-post-preview:hover, .forum-topic-entry:hover, .user-card:hover,
      .profile-page__component:hover, .value-display:hover, .osu-page--generic > .content-with-header:hover {
        box-shadow: var(--xydesu-shadow);
        transform: translateY(-4px);
      }

      .xydesu-reveal {
        opacity: 0;
        transform: translateY(12px);
        animation: xydesu-reveal .45s var(--xydesu-ease) forwards;
        animation-delay: calc(var(--xydesu-i, 0) * 35ms);
      }

      @keyframes xydesu-reveal {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .btn-osu-big, .button--primary, .beatmapset-toolbar__button--main {
        animation: xydesu-pulse 2.8s var(--xydesu-ease) infinite;
      }

      @keyframes xydesu-pulse {
        0%, 100% { box-shadow: 0 0 0 rgba(255,255,255,0); }
        50% { box-shadow: 0 0 0 6px rgba(255,255,255,.06); }
      }

      #xydesu-parallax-bg {
        position: fixed;
        inset: -6%;
        pointer-events: none;
        z-index: 0;
        background:
          radial-gradient(700px 420px at 20% 20%, rgba(255,255,255,.05), transparent 60%),
          radial-gradient(580px 360px at 80% 70%, rgba(255,120,200,.07), transparent 65%),
          radial-gradient(640px 380px at 50% 90%, rgba(120,180,255,.06), transparent 60%);
        transform: translate3d(var(--xydesu-px, 0px), var(--xydesu-py, 0px), 0);
        transition: transform 200ms var(--xydesu-ease);
        will-change: transform;
      }

      body > * {
        position: relative;
        z-index: 1;
      }

      :focus-visible {
        outline: 2px solid rgba(255,255,255,.55);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        html, body { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        body {
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function markReady() {
    requestAnimationFrame(() => {
      document.documentElement.classList.add(ROOT_CLASS);
    });
  }

  function addParallaxLayer() {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    if (document.getElementById('xydesu-parallax-bg')) return;

    const layer = document.createElement('div');
    layer.id = 'xydesu-parallax-bg';
    document.body.appendChild(layer);

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;

    const update = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      layer.style.setProperty('--xydesu-px', `${currentX}px`);
      layer.style.setProperty('--xydesu-py', `${currentY}px`);

      if (Math.abs(targetX - currentX) < 0.05 && Math.abs(targetY - currentY) < 0.05) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(update);
    };

    const onMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      targetX = dx * -10;
      targetY = dy * -8;
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave, { passive: true });
  }

  function revealElements(root = document) {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    const selectors = [
      '.beatmapset-panel',
      '.news-post-preview',
      '.forum-topic-entry',
      '.user-card',
      '.event',
      '.activity-entry',
      '.profile-page__component',
      '.value-display',
      '.comment',
      '.post'
    ];

    const nodes = root.querySelectorAll(selectors.join(','));
    nodes.forEach((el, i) => {
      if (el.classList.contains('xydesu-reveal')) return;
      el.style.setProperty('--xydesu-i', String(i % 12));
      el.classList.add('xydesu-reveal');
    });
  }

  function setupMutationObserver() {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          revealElements(n);
        }
      }
    });

    obs.observe(document.documentElement, {
      subtree: true,
      childList: true
    });
  }

  function setupSpaNavigationHook() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    function triggerRouteTransition() {
      if (!document.body) return;
      document.body.style.opacity = '0.92';
      document.body.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.style.opacity = '';
          document.body.style.transform = '';
          revealElements(document);
        });
      });
    }

    history.pushState = function (...args) {
      const ret = originalPushState.apply(this, args);
      triggerRouteTransition();
      return ret;
    };

    history.replaceState = function (...args) {
      const ret = originalReplaceState.apply(this, args);
      triggerRouteTransition();
      return ret;
    };

    window.addEventListener('popstate', triggerRouteTransition, { passive: true });
  }

  function init() {
    injectStyle();

    const start = () => {
      markReady();
      revealElements(document);
      addParallaxLayer();
      setupMutationObserver();
      setupSpaNavigationHook();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  init();
})();
