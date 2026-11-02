/* Progressive enhancements for the single-page website. Contact links remain native. */
(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu');
  const bar = document.querySelector('.fixed-cta');
  const heroConsult = document.querySelector('.hero-consult');
  const desktopNavigation = matchMedia('(min-width: 1280px)');
  const desktopContact = matchMedia('(min-width: 1024px)');
  const phoneSelector = 'a[data-contact="phone"][href^="tel:"]:not([aria-disabled="true"])';
  const barPhone = bar?.querySelector(phoneSelector);
  const barHome = bar ? document.createComment('Phone action position') : null;
  const groups = [...document.querySelectorAll('[data-cta-group]')];
  let scheduled = false;
  let hashScheduled = false;
  let active = false;
  let reservedHeight = 72;

  if (bar && barHome) bar.before(barHome);

  function restoreBar() {
    if (bar && barHome?.parentNode && bar.previousSibling !== barHome) {
      barHome.after(bar);
    }
  }

  function focusElement(element) {
    if (!element) return;
    if (!element.matches('a[href],button,input,select,textarea,summary,[tabindex]')) {
      element.setAttribute('tabindex', '-1');
      element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
    }
    element.focus({ preventScroll: true });
  }

  function syncHeaderOffset() {
    const height = header ? header.getBoundingClientRect().height : 0;
    root.style.setProperty('--header-offset', `${height + 16}px`);
  }

  function updateHeader() {
    header?.classList.toggle('scrolled', window.scrollY >= 80);
    if (menu?.open && desktopNavigation.matches) {
      const focused = document.activeElement;
      const hash = focused?.getAttribute('href');
      const matchingLink = hash
        ? [...(header?.querySelectorAll('.desktop-nav a') || [])].find(link => link.getAttribute('href') === hash)
        : null;
      menu.open = false;
      if (menu.contains(focused)) {
        focusElement(matchingLink || header?.querySelector('.desktop-nav a'));
      }
    }
    if (!menu?.open) syncHeaderOffset();
  }

  function hasVisiblePhoneAction() {
    const top = (header?.getBoundingClientRect().bottom || 0) + 8;
    const bottom = window.innerHeight - reservedHeight - 8;
    return groups.some(group => {
      const contacts = [...group.querySelectorAll('[data-contact]')];
      if (contacts.length !== 1 || !contacts[0].matches(phoneSelector)) return false;
      const rect = contacts[0].getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= top &&
        rect.bottom <= bottom && rect.left >= 0 && rect.right <= window.innerWidth;
    });
  }

  function updateBar() {
    if (!bar) return;
    if (!barPhone) {
      bar.hidden = true;
      root.style.setProperty('--cta-height', '0px');
      return;
    }

    if (desktopContact.matches) {
      if (bar.contains(document.activeElement)) {
        const replacement = header?.querySelector(phoneSelector) ||
          [...document.querySelectorAll(phoneSelector)].find(link => !bar.contains(link)) ||
          document.getElementById('contact') || document.body;
        focusElement(replacement);
      }
      bar.hidden = true;
      bar.classList.remove('flow-mode');
      restoreBar();
      root.style.setProperty('--cta-height', '0px');
      return;
    }

    // Measure the same full-width fixed bar even while it is temporarily in the hero.
    bar.hidden = false;
    bar.classList.remove('flow-mode');
    reservedHeight = bar.getBoundingClientRect().height || reservedHeight;

    if (reservedHeight > window.innerHeight * 0.25 && heroConsult) {
      bar.classList.add('flow-mode');
      if (bar.nextSibling !== heroConsult) heroConsult.before(bar);
      root.style.setProperty('--cta-height', '0px');
      bar.hidden = Boolean(menu?.open);
      return;
    }

    restoreBar();
    root.style.setProperty('--cta-height', `${reservedHeight}px`);
    const focused = bar.contains(document.activeElement);
    const canSuppress = 'IntersectionObserver' in window;
    bar.hidden = Boolean(menu?.open || (!focused && canSuppress && hasVisiblePhoneAction()));
  }

  function fallback() {
    active = false;
    root.classList.remove('js');
    root.style.removeProperty('--header-offset');
    root.style.removeProperty('--cta-height');
    header?.classList.remove('scrolled');
    if (bar) {
      bar.classList.remove('flow-mode');
      restoreBar();
      bar.hidden = !barPhone;
    }
  }

  function update() {
    updateHeader();
    updateBar();
  }

  function schedule() {
    if (!active || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!active) return;
      try { update(); } catch { fallback(); }
    });
  }

  function targetForHash(hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }

  function navigateTo(target, focus) {
    if (menu) menu.open = false;
    let parent = target.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    syncHeaderOffset();
    if (focus) focusElement(target);
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    schedule();
  }

  function scheduleHash() {
    if (!active || hashScheduled) return;
    hashScheduled = true;
    requestAnimationFrame(() => {
      hashScheduled = false;
      const target = targetForHash(location.hash);
      if (!active || !target) return;
      try { navigateTo(target, false); } catch { fallback(); }
    });
  }

  document.addEventListener('click', event => {
    if (!active || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        !(event.target instanceof Element)) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const hash = link.getAttribute('href');
    const target = targetForHash(hash);
    if (!target) return;
    try {
      navigateTo(target, true);
      if (location.hash !== hash) history.pushState(history.state, '', hash);
      event.preventDefault();
    } catch { fallback(); }
  });

  menu?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    focusElement(menu.querySelector('summary'));
    schedule();
  });
  menu?.addEventListener('toggle', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', scheduleHash);
  window.addEventListener('popstate', scheduleHash);
  bar?.addEventListener('focusin', schedule);
  bar?.addEventListener('focusout', schedule);

  try {
    update();
    root.classList.add('js');
    active = true;
    update();
    if (location.hash) scheduleHash();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(schedule);
      if (header) observer.observe(header);
      if (bar && barPhone) observer.observe(bar);
    }
    document.fonts?.ready.then(schedule).catch(() => {});
  } catch { fallback(); }
})();

/* One-time motion. Default content stays visible without any enhancement. */
(() => {
  'use strict';

  let observer;
  let stopped = false;
  const animations = new Map();

  function cancelAnimation(node) {
    const animation = animations.get(node);
    if (!animation) return;
    animations.delete(node);
    try { animation.cancel(); } catch { /* Natural CSS remains visible. */ }
  }

  function stopMotion() {
    stopped = true;
    try { observer?.disconnect(); } catch { /* Nothing needs hiding or restoring. */ }
    [...animations.keys()].forEach(cancelAnimation);
  }

  try {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const Observer = window.IntersectionObserver;
    if (!media || media.matches || typeof Observer !== 'function' ||
        typeof Element.prototype.animate !== 'function') return;

    const selector = [
      '.hero-copy', '.hero-lead', '.section-heading', '.section > .container > h2',
      '.mechanism-visual', '.cause-flow li', '.work-main', '.work-detail',
      '.process article', '.drain-layout figure', '.area-grid article',
      '.flow-steps li', '.faq-list details', '.about-layout figure',
      '.call-preparation li', '.energy-chart'
    ].join(',');
    const candidates = [...document.querySelectorAll(selector)].filter(node =>
      !node.matches('[data-contact="phone"], a[href^="tel:"]') &&
      !node.querySelector('[data-contact="phone"], a[href^="tel:"]')
    );
    // Animate a structure or its children, never both at the same time.
    const targets = candidates.filter(node =>
      !candidates.some(parent => parent !== node && parent.contains(node))
    );
    const targetSet = new Set(targets);
    const seen = new WeakSet();

    function settle(target) {
      seen.add(target);
      observer?.unobserve(target);
      [...animations.keys()].forEach(node => {
        if (node === target || target.contains(node)) cancelAnimation(node);
      });
    }

    function settleAround(node) {
      if (!(node instanceof Element)) return;
      targets.forEach(target => {
        if (target === node || target.contains(node) || node.contains(target)) settle(target);
      });
    }

    function settleHash(hash) {
      if (!hash || hash === '#') return;
      let target;
      try { target = document.getElementById(decodeURIComponent(hash.slice(1))); }
      catch { return; }
      if (target) settleAround(target.closest('section') || target);
    }

    function animateNode(node, keyframes, options, startTime) {
      const animation = node.animate(keyframes, options);
      animations.set(node, animation);
      if (typeof startTime === 'number') animation.startTime = startTime;
      animation.addEventListener('finish', () => cancelAnimation(node), { once: true });
      animation.addEventListener('cancel', () => {
        if (animations.get(node) === animation) animations.delete(node);
      }, { once: true });
    }

    function play(target) {
      if (stopped || seen.has(target)) return;
      settle(target);
      const timing = { duration: 680, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' };
      if (target.matches('.energy-chart')) {
        // Both bars share a timeline so their relative lengths stay accurate.
        const startTime = document.timeline?.currentTime;
        target.querySelectorAll('.energy-bar').forEach(bar => animateNode(bar, [
          { transform: 'scaleX(0)', transformOrigin: 'left center' },
          { transform: 'scaleX(1)', transformOrigin: 'left center' }
        ], timing, startTime));
        return;
      }
      const siblings = [...(target.parentElement?.children || [])].filter(node => targetSet.has(node));
      const delay = Math.min(180, Math.max(0, siblings.indexOf(target)) * 60);
      animateNode(target, [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'none' }
      ], { ...timing, duration: 620, delay, fill: 'backwards' });
    }

    observer = new Observer(entries => {
      try {
        if (stopped || media.matches) { stopMotion(); return; }
        entries.forEach(entry => {
          if (entry.isIntersecting) play(entry.target);
        });
      } catch { stopMotion(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    const onPreference = event => { if (event.matches) stopMotion(); };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onPreference);
    else if (typeof media.addListener === 'function') media.addListener(onPreference);

    document.addEventListener('focusin', event => {
      try { settleAround(event.target); } catch { stopMotion(); }
    });
    document.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          !(event.target instanceof Element)) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      // The existing navigation may already preventDefault and use pushState.
      try { settleHash(link.getAttribute('href')); } catch { stopMotion(); }
    });
    const onLocation = () => {
      try { settleHash(location.hash); } catch { stopMotion(); }
    };
    window.addEventListener('hashchange', onLocation);
    window.addEventListener('popstate', onLocation);
    window.addEventListener('pagehide', stopMotion, { once: true });
    window.addEventListener('beforeprint', stopMotion, { once: true });

    // Deep links and an existing keyboard focus must never wait for an entrance.
    settleHash(location.hash);
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused !== document.documentElement) settleAround(focused);
    targets.forEach(target => { if (!seen.has(target)) observer.observe(target); });
  } catch { stopMotion(); }
})();
