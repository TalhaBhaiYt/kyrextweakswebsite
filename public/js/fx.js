/* ================================================================
   fx.js – cursor dot + background particles (all pages)
   ================================================================ */
(function () {
  'use strict';

  /* ── 1. Inject HTML elements ── */
  const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
  const ring = document.createElement('div'); ring.id = 'cursor-ring';
  const canvas = document.createElement('canvas'); canvas.id = 'bg-particles';
  document.body.prepend(canvas);
  document.body.appendChild(ring);
  document.body.appendChild(dot);

  /* ── 2. Cursor tracking ── */
  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let rafCursor;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  document.addEventListener('mousedown', () => dot.classList.add('clicking'));
  document.addEventListener('mouseup',   () => dot.classList.remove('clicking'));

  /* hover effect on interactive elements */
  const hoverSelectors = 'a, button, input, textarea, select, label, [data-tab], .sidebar-link, .faq-q, .nav-link, .btn, .filter-btn';

  function addHoverListeners() {
    document.querySelectorAll(hoverSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => { dot.classList.add('hovering'); ring.classList.add('hovering'); });
      el.addEventListener('mouseleave', () => { dot.classList.remove('hovering'); ring.classList.remove('hovering'); });
    });
  }
  addHoverListeners();

  /* re-apply hover listeners when DOM changes (dynamic content) */
  new MutationObserver(addHoverListeners).observe(document.body, { childList: true, subtree: true });

  /* animate the dot (instant) and ring (lagged) */
  function animateCursor() {
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';

    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';

    rafCursor = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  /* hide cursor when it leaves window */
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

  /* ── 3. Background particle system ── */
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  /* Particle types:
     - dots   : small drifting crimson dots
     - lines  : connected mesh between nearby particles
     - sparks : occasional upward-rising sparks near cursor
  */
  const PARTICLE_COUNT = 80;
  const CONNECTION_DIST = 140;

  const particles = [];

  class Particle {
    constructor(x, y, forced) {
      this.reset(x, y, forced);
    }
    reset(x, y, forced) {
      this.x  = x  !== undefined ? x  : Math.random() * W;
      this.y  = y  !== undefined ? y  : Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = forced ? -(Math.random() * 1.5 + 0.5) : (Math.random() - 0.5) * 0.4;
      this.r  = forced ? Math.random() * 1.5 + 0.5 : Math.random() * 1.8 + 0.4;
      this.alpha = forced ? Math.random() * 0.6 + 0.3 : Math.random() * 0.5 + 0.15;
      this.decay = forced ? 0.012 + Math.random() * 0.01 : 0;
      this.spark = !!forced;
      this.life  = 1;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.spark) {
        this.life -= this.decay;
        this.vx  *= 0.98;
        this.vy  *= 0.98;
      } else {
        /* wrap around edges */
        if (this.x < -10) this.x = W + 10;
        if (this.x > W + 10) this.x = -10;
        if (this.y < -10) this.y = H + 10;
        if (this.y > H + 10) this.y = -10;
        /* subtle cursor attraction */
        const dx = mx - this.x;
        const dy = my - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0) {
          const force = (160 - dist) / 160 * 0.012;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
        }
        /* max speed clamp */
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1.2) { this.vx = (this.vx / speed) * 1.2; this.vy = (this.vy / speed) * 1.2; }
      }
    }
    draw() {
      const a = this.spark ? this.alpha * this.life : this.alpha;
      if (a <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,20,60,${a})`;
      ctx.fill();
    }
    get dead() { return this.spark && this.life <= 0; }
  }

  /* init base particles */
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  /* spawn sparks near cursor on move */
  let lastSparkTime = 0;
  document.addEventListener('mousemove', () => {
    const now = Date.now();
    if (now - lastSparkTime < 60) return; /* max ~16 sparks/sec */
    lastSparkTime = now;
    if (Math.random() > 0.4) return;      /* only 60% of moves */
    particles.push(new Particle(
      mx + (Math.random() - 0.5) * 10,
      my + (Math.random() - 0.5) * 10,
      true
    ));
  });

  /* draw connections */
  function drawConnections() {
    /* only between non-spark particles for perf */
    const base = particles.filter(p => !p.spark);
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        const dx   = base[i].x - base[j].x;
        const dy   = base[i].y - base[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(base[i].x, base[i].y);
          ctx.lineTo(base[j].x, base[j].y);
          ctx.strokeStyle = `rgba(220,20,60,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  /* draw cursor glow on canvas */
  function drawCursorGlow() {
    if (mx < 0 || my < 0) return;
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
    grad.addColorStop(0,   'rgba(220,20,60,0.06)');
    grad.addColorStop(0.5, 'rgba(220,20,60,0.02)');
    grad.addColorStop(1,   'rgba(220,20,60,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  /* main loop */
  function loop() {
    ctx.clearRect(0, 0, W, H);

    drawCursorGlow();
    drawConnections();

    /* update + draw, cull dead sparks */
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].dead) particles.splice(i, 1);
    }

    requestAnimationFrame(loop);
  }
  loop();

})();
