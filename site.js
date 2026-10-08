/* Shared site motion: theme toggle + nav shrink/hide on scroll + scroll-reveal. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- always land at the top of a freshly loaded page ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- theme: dark / light toggle ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    const syncLabel = () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      themeBtn.setAttribute('aria-pressed', String(isLight));
      themeBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    };
    syncLabel();
    themeBtn.addEventListener('click', () => {
      const goingLight = root.getAttribute('data-theme') !== 'light';
      if (goingLight) root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      try { localStorage.setItem('ag-theme', goingLight ? 'light' : 'dark'); } catch (e) {}
      syncLabel();
    });
  }

  /* ---------- nav: shrink + hide on scroll ---------- */
  const top = document.querySelector('.top');
  if (top) {
    let lastY = window.scrollY, ticking = false;
    const update = () => {
      const y = window.scrollY;
      top.classList.toggle('is-shrunk', y > 80);
      if (y > lastY && y > 160) top.classList.add('is-hidden');
      else top.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    };
    update();
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ---------- scroll reveal ---------- */
  const targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (targets.length) {
    if (reduce) {
      targets.forEach(t => t.classList.add('in'));
    } else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
      targets.forEach(t => io.observe(t));
    }
  }
})();
