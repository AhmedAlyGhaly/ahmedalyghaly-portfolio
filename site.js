/* Shared site motion: theme toggle + nav shrink/hide on scroll + scroll-reveal. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme: dark / light toggle ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    /* the accessible name stays fixed ("Light theme"); aria-pressed carries the state */
    const sync = () => themeBtn.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'light'));
    sync();
    themeBtn.addEventListener('click', () => {
      const goingLight = root.getAttribute('data-theme') !== 'light';
      if (goingLight) root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      try { localStorage.setItem('ag-theme', goingLight ? 'light' : 'dark'); } catch {}
      sync();
    });
  }

  /* ---------- nav: shrink + hide on scroll ---------- */
  const nav = document.querySelector('.top');
  const bottomNav = document.querySelector('.bottom-nav');
  if (nav || bottomNav) {
    let lastY = scrollY, ticking = false;
    const update = () => {
      const y = scrollY, dy = y - lastY;
      if (nav) {
        nav.classList.toggle('is-shrunk', y > 80);
        /* ignore tiny deltas so trackpad / rubber-band jitter doesn't flicker the bar */
        if (Math.abs(dy) > 6 || y <= 160) nav.classList.toggle('is-hidden', dy > 0 && y > 160);
      }
      bottomNav?.classList.toggle('is-compact', y > 80);
      if (Math.abs(dy) > 6 || y <= 160) lastY = y;
      ticking = false;
    };
    update();
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    /* keyboard users must never land on an off-screen nav */
    nav?.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  }

  /* ---------- scroll reveal ---------- */
  const targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (targets.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('in'));
    } else {
      /* threshold 0: tall blocks (e.g. the stacked work list on a short phone) can't reach a
         higher ratio, and would otherwise stay invisible */
      const io = new IntersectionObserver(entries => {
        entries.forEach(({ isIntersecting, target }) => {
          if (isIntersecting) {
            target.classList.add('in');
            io.unobserve(target);
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      targets.forEach(el => io.observe(el));
    }
  }
})();
