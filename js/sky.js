/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — night sky
   A canvas starfield behind the page. Stars sit at different depths and drift
   with the mouse and scroll, twinkle, and now and then a shooting star goes by.
   Clicking empty sky fires one from that spot.
   window.WRLD_SKY.shoot(x, y)  /  window.WRLD_SKY.shower(count)
   ============================================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("sky");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  // Settings: starfield on/off, shooting stars, how many stars, calm mode
  const pref = (k) => (window.WRLD_PREFS ? window.WRLD_PREFS.get(k) : { sky: true, shooting: true, density: "some", calm: false }[k]);
  const animating = () => !reduce && pref("sky") && !pref("calm");

  const TINTS = ["255,255,255", "236,226,255", "246,214,238", "206,220,255"];
  let W = 0, H = 0;
  let stars = [];
  const shooters = [];
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = window.scrollY;
  let nextShot = performance.now() + 4000;
  let last = performance.now();

  /* ---------- cursor glow (CSS reads --mx / --my) ---------- */
  let glowQueued = false, gx = 0, gy = 0;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    gx = e.clientX; gy = e.clientY;
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!glowQueued) {
      glowQueued = true;
      requestAnimationFrame(() => {
        glowQueued = false;
        root.style.setProperty("--mx", gx + "px");
        root.style.setProperty("--my", gy + "px");
        root.classList.add("has-cursor");
      });
    }
  }, { passive: true });
  document.addEventListener("pointerleave", () => root.classList.remove("has-cursor"));

  if (!ctx) { window.WRLD_SKY = { shoot() {}, shower() {} }; return; }

  /* ---------- stars ---------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const amount = { few: 0.45, some: 1, lots: 1.8 }[pref("density")] || 1;
    const count = Math.round(Math.min(460, ((W * H) / 4800) * amount));
    stars = [];
    for (let i = 0; i < count; i++) {
      const z = Math.pow(Math.random(), 1.8); // most stars far away
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        r: 0.3 + z * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.8,
        tint: TINTS[(Math.random() * TINTS.length) | 0]
      });
    }
    if (!animating()) draw(performance.now());
  }

  const wrap = (v, max) => ((v % max) + max) % max;

  function draw(t) {
    const dt = Math.min(48, t - last) / 16.67;
    last = t;
    ctx.clearRect(0, 0, W, H);
    if (!pref("sky")) return;
    const still = !animating();

    mouse.x += (mouse.tx - mouse.x) * 0.05 * dt;
    mouse.y += (mouse.ty - mouse.y) * 0.05 * dt;

    for (const s of stars) {
      const x = wrap(s.x - mouse.x * 26 * s.z, W);
      const y = wrap(s.y - mouse.y * 16 * s.z - scroll * 0.08 * s.z, H);
      const twinkle = still ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
      ctx.globalAlpha = twinkle * (0.3 + 0.7 * s.z);
      ctx.fillStyle = "rgb(" + s.tint + ")";
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.z > 0.88) { // the closest stars get a faint four-point glint
        const g = s.r * 3.2;
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(x - g, y - 0.35, g * 2, 0.7);
        ctx.fillRect(x - 0.35, y - g, 0.7, g * 2);
      }
    }

    for (let i = shooters.length - 1; i >= 0; i--) {
      const m = shooters[i];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const p = m.life / m.max;
      const a = p < 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88);
      const tx = m.x - m.vx * m.len, ty = m.y - m.vy * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, "rgba(255,255,255," + a + ")");
      g.addColorStop(0.25, "rgba(214,192,250," + a * 0.6 + ")");
      g.addColorStop(1, "rgba(180,142,240,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = m.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      if (m.life >= m.max) shooters.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    if (t > nextShot) {
      if (pref("shooting")) shoot();
      nextShot = t + 6000 + Math.random() * 9000;
    }
  }

  function shoot(x, y) {
    if (!animating()) return;
    const leftward = x == null ? Math.random() < 0.5 : x > W / 2;
    const angle = (leftward ? 200 : -20) + (Math.random() * 30 - 15);
    const rad = (angle * Math.PI) / 180;
    const speed = 9 + Math.random() * 7;
    shooters.push({
      x: x == null ? W * (0.2 + Math.random() * 0.7) : x,
      y: y == null ? H * Math.random() * 0.45 : y,
      vx: Math.cos(rad) * speed,
      vy: Math.abs(Math.sin(rad) * speed) + 2.5,
      len: 9 + Math.random() * 7,
      w: 1.2 + Math.random() * 0.9,
      life: 0,
      max: 46 + Math.random() * 30
    });
  }

  function shower(count) {
    if (!animating()) return;
    const n = count || 12;
    for (let i = 0; i < n; i++) setTimeout(() => shoot(), i * 140 + Math.random() * 120);
  }

  // the loop only runs while there's something moving; it restarts when Settings change
  let running = false;
  function loop(t) {
    if (!animating()) { running = false; draw(t); return; }
    draw(t);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || !animating()) { if (!animating()) draw(performance.now()); return; }
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", () => { scroll = window.scrollY; if (!running) draw(performance.now()); }, { passive: true });
  window.addEventListener("wrld:prefs", (e) => {
    const k = e.detail && e.detail.key;
    if (k === "density" || k === "*") resize();
    start();
  });

  // click on empty sky -> shooting star from there
  document.addEventListener("click", (e) => {
    if (!fine || document.body.classList.contains("editing")) return;
    if (e.target.closest("a, button, input, label, dialog, form, .panel, .hero, .course, .dial-card, .bubbles, .title, .lock, .notes, .drawer, .rail, .side-panel")) return;
    shoot(e.clientX, e.clientY);
  });

  resize();
  start();

  window.WRLD_SKY = { shoot, shower };
})();
