/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — sidebar (like Opera's)
   A rail on the left (a dock along the bottom on phones) with Spotify,
   sportsYou, quick jumps to each section, and settings.

   Spotify: the button is a plain link that opens Spotify in a new tab.
   sportsYou: it refuses to be shown inside other sites (X-Frame-Options:
   DENY), so its panel opens it in a slim window docked beside this one.
   ============================================================================ */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const body = document.body;
  const KEY = "wrld.sidebar";
  const SPORTSYOU = "https://app.sportsyou.com/";

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const state = Object.assign({ syDirect: false }, read());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ syDirect: state.syDirect })); } catch (e) { /* full */ } };
  const touch = window.matchMedia("(hover: none)").matches;

  /* ---------- opening and closing panels ---------- */
  let openId = null;

  function setOpen(id) {
    if (id === openId) id = null;
    openId = id;
    $$(".side-panel").forEach((p) => {
      const on = p.dataset.panel === id;
      p.classList.toggle("open", on);
      if (on) p.removeAttribute("inert"); else p.setAttribute("inert", "");
    });
    $$("[data-panel-toggle]").forEach((b) => {
      const on = b.dataset.panelToggle === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-expanded", String(on));
    });
    body.classList.toggle("panel-open", !!id);
  }

  /* ---------- sportsYou ---------- */
  function openSportsYou(where) {
    if (where === "tab" || touch) { window.open(SPORTSYOU, "_blank", "noopener"); return; }
    // a slim window docked on the right edge of the screen, like a side panel
    const w = 460;
    const h = screen.availHeight || 900;
    const left = (screen.availLeft || 0) + (screen.availWidth || 1280) - w;
    const top = screen.availTop || 0;
    const win = window.open(SPORTSYOU, "wrld-sportsyou", "popup=yes,width=" + w + ",height=" + h + ",left=" + left + ",top=" + top);
    if (!win) window.open(SPORTSYOU, "_blank", "noopener");
    else win.focus();
  }

  /* ---------- jumping to sections ---------- */
  function jump(key) {
    const sec = document.querySelector('main > .sec[data-key="' + key + '"]');
    if (!sec || sec.hidden) { window.wrldToast("That section is hidden. Turn it back on in Settings → Layout."); return; }
    sec.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  // light up the jump button for the section on screen
  if ("IntersectionObserver" in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => seen.set(en.target.dataset.key, en.intersectionRatio));
      let best = null, bestRatio = 0;
      seen.forEach((r, k) => { if (r > bestRatio) { best = k; bestRatio = r; } });
      $$("[data-jump]").forEach((b) => b.classList.toggle("here", b.dataset.jump === best && bestRatio > 0.15));
    }, { threshold: [0, 0.15, 0.4, 0.7] });
    $$("main > .sec[data-key]").forEach((s) => io.observe(s));
  }

  /* ---------- clicks ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const toggle = t.closest("[data-panel-toggle]");
    if (toggle) {
      const id = toggle.dataset.panelToggle;
      if (id === "sportsyou" && state.syDirect && openId !== "sportsyou") { openSportsYou("dock"); return; }
      setOpen(id);
      return;
    }
    if (t.closest("[data-panel-close]")) { setOpen(null); return; }

    const jumpBtn = t.closest("[data-jump]");
    if (jumpBtn) { jump(jumpBtn.dataset.jump); if (window.matchMedia("(max-width: 760px)").matches) setOpen(null); return; }
    if (t.closest('[data-rail="home"]')) { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => $("#search-input").focus({ preventScroll: true }), 400); return; }

    const sy = t.closest("[data-sy]");
    if (sy) { openSportsYou(sy.dataset.sy); return; }
  });

  $("#sy-direct").addEventListener("change", (e) => { state.syDirect = e.target.checked; save(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openId && !document.querySelector("dialog[open]")) setOpen(null);
  });

  /* ---------- go ---------- */
  $("#sy-direct").checked = !!state.syDirect;
  body.classList.add("has-rail");

  window.WRLD_SIDEBAR = { open: setOpen, close: () => setOpen(null) };
})();
