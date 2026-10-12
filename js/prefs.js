/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — preferences, layout, toasts
   Everything she changes in Settings or edit mode is saved here, on this
   device, the moment she changes it.
     window.WRLD_PREFS.get("accent") / .set("accent", "#f2a7d6") / .reset()
     window.WRLD_PREFS.layout.sort(zone, items, keyFn) / .hide / .show / .setOrder
     window.wrldToast("Saved", { action: "Undo", onAction() {} })
   Changes fire a "wrld:prefs" or "wrld:layout" event on window.
   ============================================================================ */
(function () {
  "use strict";

  const PREFS_KEY = "wrld.prefs";
  const LAYOUT_KEY = "wrld.layout";

  const DEFAULTS = {
    name: "",            // empty = use the name from the private data
    accent: "#b48ef0",   // her lavender
    sky: true,
    shooting: true,
    density: "some",     // few | some | lots
    glow: true,
    tilt: true,
    calm: false,
    quotes: true,
    clock24: false,
    early: null,         // minutes before class to switch; null = schedule default
    engine: "google",    // google | duckduckgo | bing
    newTab: false
  };

  const read = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  };
  const write = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full or blocked */ } };

  let prefs = Object.assign({}, DEFAULTS, read(PREFS_KEY, {}));

  const root = document.documentElement;
  function apply() {
    root.style.setProperty("--wrld", /^#[0-9a-f]{6}$/i.test(prefs.accent) ? prefs.accent : DEFAULTS.accent);
    root.classList.toggle("calm", !!prefs.calm);
    root.classList.toggle("no-glow", !prefs.glow);
  }
  apply();

  window.WRLD_PREFS = {
    DEFAULTS,
    get: (k) => (k in prefs ? prefs[k] : DEFAULTS[k]),
    all: () => Object.assign({}, prefs),
    set(k, v) {
      prefs[k] = v;
      write(PREFS_KEY, prefs);
      apply();
      window.dispatchEvent(new CustomEvent("wrld:prefs", { detail: { key: k, value: v } }));
    },
    reset() {
      prefs = Object.assign({}, DEFAULTS);
      write(PREFS_KEY, prefs);
      apply();
      window.dispatchEvent(new CustomEvent("wrld:prefs", { detail: { key: "*" } }));
    }
  };

  /* ---------- layout: order + hidden items per zone ---------- */
  let layout = Object.assign({ order: {}, hidden: {} }, read(LAYOUT_KEY, {}));
  const saveLayout = () => {
    write(LAYOUT_KEY, layout);
    window.dispatchEvent(new CustomEvent("wrld:layout"));
  };

  window.WRLD_PREFS.layout = {
    order: (zone) => (layout.order[zone] || []).slice(),
    setOrder(zone, keys) { layout.order[zone] = keys.slice(); saveLayout(); },
    isHidden: (zone, key) => (layout.hidden[zone] || []).includes(key),
    hidden: (zone) => (layout.hidden[zone] || []).slice(),
    hide(zone, key) {
      const list = layout.hidden[zone] || (layout.hidden[zone] = []);
      if (!list.includes(key)) list.push(key);
      saveLayout();
    },
    show(zone, key) {
      layout.hidden[zone] = (layout.hidden[zone] || []).filter((k) => k !== key);
      saveLayout();
    },
    // items in her saved order; anything new goes at the end in its natural order
    sort(zone, items, keyFn) {
      const order = layout.order[zone] || [];
      const rank = (it) => { const i = order.indexOf(keyFn(it)); return i === -1 ? 1e6 : i; };
      return items.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it) - rank(b.it) || a.i - b.i).map((x) => x.it);
    },
    reset() { layout = { order: {}, hidden: {} }; saveLayout(); }
  };

  /* ---------- toasts ---------- */
  let toastEl = null, toastTimer = null;
  window.wrldToast = function (message, opts) {
    opts = opts || {};
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = "";
    const text = document.createElement("span");
    text.textContent = message;
    toastEl.appendChild(text);
    if (opts.action) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opts.action;
      btn.addEventListener("click", () => { hide(); if (opts.onAction) opts.onAction(); });
      toastEl.appendChild(btn);
    }
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, opts.duration || 4500);
    function hide() { toastEl.classList.remove("show"); }
  };
})();
