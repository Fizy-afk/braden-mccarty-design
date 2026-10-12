/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — little effects
   - .spot   cards light up around the cursor
   - .tilt   cards lean toward the cursor in 3D
   - #title  letters get a lavender-to-pink color run and wave on hover
   - window.wrldBurst(x, y, color)  sparkle burst (used when a to-do is checked)
   All of it switches off for "reduce motion" and on touch screens where it
   doesn't make sense.
   ============================================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- spotlight + tilt ---------- */
  let tiltEl = null;
  let queued = false, lastEvent = null;

  function untilt(el) {
    if (!el) return;
    el.style.transform = "";
    el.classList.remove("tilting");
  }

  function onMove() {
    queued = false;
    const e = lastEvent;
    const spot = e.target.closest && e.target.closest(".spot");
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty("--sx", (e.clientX - r.left) + "px");
      spot.style.setProperty("--sy", (e.clientY - r.top) + "px");
    }
    const P = window.WRLD_PREFS;
    if (reduce || (P && (!P.get("tilt") || P.get("calm"))) || document.body.classList.contains("editing")) {
      if (tiltEl) { untilt(tiltEl); tiltEl = null; }
      return;
    }
    const tilt = e.target.closest && e.target.closest(".tilt");
    if (tilt !== tiltEl) { untilt(tiltEl); tiltEl = tilt; }
    if (tilt) {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.classList.add("tilting");
      tilt.style.transform = "perspective(900px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-4px)";
    }
  }

  if (hover) {
    document.addEventListener("pointermove", (e) => {
      lastEvent = e;
      if (!queued) { queued = true; requestAnimationFrame(onMove); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { untilt(tiltEl); tiltEl = null; });
  }

  /* ---------- title: per-letter color + wave ---------- */
  const title = document.getElementById("title");

  // letter colors run from a light tint of her accent, through the accent, to pink
  function hexRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    const n = m ? parseInt(m[1], 16) : 0xb48ef0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function colorTitle() {
    if (!title) return;
    const accent = hexRgb(getComputedStyle(document.documentElement).getPropertyValue("--wrld"));
    const stops = [accent.map((v) => Math.round(v + (255 - v) * 0.55)), accent, [242, 167, 214]];
    const letters = title.querySelectorAll(".ch");
    letters.forEach((span, n) => {
      const t = letters.length > 1 ? n / (letters.length - 1) : 0;
      const seg = t < 0.5 ? 0 : 1;
      const local = seg === 0 ? t / 0.5 : (t - 0.5) / 0.5;
      const a = stops[seg], b = stops[seg + 1];
      span.style.color = "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * local)).join(",") + ")";
    });
  }
  window.addEventListener("wrld:prefs", colorTitle);

  if (title) {
    const chars = Array.from(title.textContent);
    let n = 0;
    title.textContent = "";
    chars.forEach((c) => {
      if (!c.trim()) { title.appendChild(document.createTextNode(c)); return; }
      const span = document.createElement("span");
      span.className = "ch" + (c === "•" ? " bullet" : "");
      span.textContent = c;
      span.style.setProperty("--i", n);
      span.setAttribute("aria-hidden", "true");
      title.appendChild(span);
      n++;
    });
    colorTitle();
    title.classList.add("split");

    if (!reduce) {
      title.addEventListener("pointerenter", () => {
        title.classList.remove("wave");
        void title.offsetWidth; // restart the animation
        title.classList.add("wave");
      });
      title.addEventListener("animationend", (e) => {
        if (e.target === title.lastElementChild) title.classList.remove("wave");
      });
    }
  }

  /* ---------- sparkle burst ---------- */
  window.wrldBurst = function (x, y, color) {
    if (reduce) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 26 + Math.random() * 30;
      s.className = "spark";
      s.style.setProperty("--x0", x - 5 + "px");
      s.style.setProperty("--y0", y - 5 + "px");
      s.style.setProperty("--x1", x - 5 + Math.cos(angle) * dist + "px");
      s.style.setProperty("--y1", y - 5 + Math.sin(angle) * dist + "px");
      s.style.setProperty("--sc", color || (i % 3 === 0 ? "#f2a7d6" : "#b48ef0"));
      s.style.animationDelay = Math.random() * 60 + "ms";
      document.body.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }
  };
})();
