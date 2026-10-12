/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — edit mode (like holding an app on an iPhone)
   Hold down on anything for half a second: everything that can move starts
   to wiggle. Then:
     - drag sections (by their header), side cards, class cards and shortcut
       bubbles to new spots — they always snap into the grid, never float loose
     - tap the − badge to hide something (bring it back from the bar at the
       bottom, or Settings)
     - tap a shortcut bubble or class card to change it
     - Done, Esc, or tapping empty space to finish
   Order and hidden items save instantly (window.WRLD_PREFS.layout).
   ============================================================================ */
(function () {
  "use strict";

  const P = window.WRLD_PREFS;
  const L = P.layout;
  const W = window.WRLD;
  const icon = window.wrldIcon;
  const $ = (sel) => document.querySelector(sel);
  const body = document.body;
  const HOLD_MS = 480;
  const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

  // where things can move. "y" = a vertical stack, "grid" = rows and columns
  const ZONES = {
    sections: { root: () => $("main"), item: ".sec[data-key]", handle: ".sec-head", axis: "y", hideable: true },
    side: { root: () => $(".side"), item: ".panel[data-key]", handle: ".panel-h", axis: "y", hideable: true },
    courses: { root: () => $("#course-cards"), item: ".course[data-key]", axis: "grid", hideable: true },
    bookmarks: { root: () => $("#bookmarks"), item: ".bubble-wrap[data-key]", axis: "grid", hideable: false, end: ".bubble.add" }
  };
  const ZONE_ORDER = ["bookmarks", "courses", "side", "sections"]; // innermost first
  const keyOf = (el) => el.getAttribute("data-key");
  const items = (zone) => {
    const root = ZONES[zone].root();
    return root ? Array.from(root.children).filter((el) => el.matches(ZONES[zone].item)) : [];
  };
  const visible = (zone) => items(zone).filter((el) => !el.hidden);

  /* ---------- applying saved order + hidden (sections and side cards) ---------- */
  function applyStatic() {
    ["sections", "side"].forEach((zone) => {
      const root = ZONES[zone].root();
      if (!root) return;
      L.sort(zone, items(zone), keyOf).forEach((el) => root.appendChild(el));
      items(zone).forEach((el) => { el.hidden = L.isHidden(zone, keyOf(el)); });
    });
    tidy();
  }

  // section numbers follow the order on screen; the week area goes full width with no side cards
  function tidy() {
    let n = 0;
    visible("sections").forEach((sec) => {
      const num = sec.querySelector(".sec-num");
      if (num) num.textContent = String(++n).padStart(2, "0");
    });
    const wl = $(".week-layout");
    if (wl) wl.classList.toggle("no-side", !visible("side").length);
  }

  /* ---------- finding what's under the finger ---------- */
  function hitTest(target) {
    for (const zone of ZONE_ORDER) {
      const z = ZONES[zone];
      const root = z.root();
      const el = target.closest(z.item);
      if (!root || !el || el.parentElement !== root) continue;
      if (z.handle && !target.closest(z.handle)) continue;
      return { zone, el, key: keyOf(el) };
    }
    return null;
  }
  const blocked = (t) => !!t.closest("input, textarea, select, [contenteditable='true'], dialog, .edit-bar, .toast, .lock, .rail, .side-panel");
  const isBackground = (t) => t === body || t.matches("main, .wrap, .launch, .sec, .app, .week-layout, .course-grid, .bubbles, .now-grid, .side, .foot, .topbar");

  /* ---------- edit mode on / off ---------- */
  let on = false;
  function enter() {
    if (on) return;
    on = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    body.classList.add("editing");
    addBadges();
    renderBar();
    $("#edit-bar").hidden = false;
    if (navigator.vibrate) navigator.vibrate(12);
    window.dispatchEvent(new Event("wrld:edit"));
  }
  function exit() {
    if (!on) return;
    on = false;
    body.classList.remove("editing");
    document.querySelectorAll(".edit-x, .edit-grip").forEach((el) => el.remove());
    $("#edit-bar").hidden = true;
    window.dispatchEvent(new Event("wrld:edit")); // cards + bubbles redraw in the saved order
  }

  function addBadges() {
    document.querySelectorAll(".edit-x, .edit-grip").forEach((el) => el.remove());
    ["sections", "side", "courses"].forEach((zone) => {
      items(zone).forEach((el) => {
        const key = keyOf(el);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "edit-x";
        btn.setAttribute("data-edit-hide", zone + "|" + key);
        btn.setAttribute("aria-label", "Hide " + labelFor(zone, key));
        btn.innerHTML = icon("minus");
        const host = ZONES[zone].handle ? el.querySelector(ZONES[zone].handle) : el;
        host.prepend(btn);
        if (zone === "sections") {
          const grip = document.createElement("span");
          grip.className = "edit-grip";
          grip.innerHTML = icon("grip-vertical");
          host.appendChild(grip);
        }
      });
    });
  }

  function labelFor(zone, key) {
    if (zone === "courses") { const c = W.classes.find((x) => x.id === key); return c ? c.name : key; }
    const el = items(zone).find((x) => keyOf(x) === key);
    if (!el) return key;
    const h = el.querySelector(zone === "sections" ? ".sec-head h2" : ".panel-h");
    return h ? h.textContent.trim() : key;
  }

  /* ---------- the bar at the bottom ---------- */
  function renderBar() {
    const hidden = [];
    ["sections", "side", "courses"].forEach((zone) => L.hidden(zone).forEach((key) => hidden.push({ zone, key })));
    $("#edit-hidden").innerHTML = hidden.map((h) =>
      '<button class="chip-add" type="button" data-edit-show="' + h.zone + "|" + h.key + '">' + icon("plus") + labelFor(h.zone, h.key) + "</button>"
    ).join("");
    $("#edit-bar").classList.toggle("has-hidden", hidden.length > 0);
  }

  function hideItem(zone, key) {
    const el = items(zone).find((x) => keyOf(x) === key);
    if (!el) return;
    el.classList.add("edit-leaving");
    setTimeout(() => {
      el.classList.remove("edit-leaving");
      el.hidden = true;
      L.hide(zone, key);
      tidy();
      renderBar();
    }, 220);
  }

  function showItem(zone, key) {
    L.show(zone, key);
    let el = items(zone).find((x) => keyOf(x) === key);
    if (!el && zone === "courses" && window.WRLD_APP) {
      window.WRLD_APP.refresh(true); // card wasn't on the page; draw it
      addBadges();
      el = items(zone).find((x) => keyOf(x) === key);
    }
    if (el) {
      el.hidden = false;
      el.classList.add("edit-arriving");
      setTimeout(() => el.classList.remove("edit-arriving"), 400);
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    tidy();
    renderBar();
  }

  /* ---------- holding to start ---------- */
  let press = null;      // a finger/mouse held down outside edit mode
  let pending = null;    // pressed on something in edit mode, not moving yet
  let drag = null;       // something being dragged
  let swallowClick = false;
  const dist = (a, b) => Math.hypot(a.clientX - b.x, a.clientY - b.y);

  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (on) { editDown(e); return; }
    if (blocked(e.target)) return;
    const hit = hitTest(e.target);
    press = { x: e.clientX, y: e.clientY, hit, type: e.pointerType };
    press.timer = setTimeout(() => {
      if (!press) return;
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 700);
      enter();
      // still holding? moving now drags the thing she pressed
      pending = press.hit ? { hit: press.hit, x: press.x, y: press.y, t: 0, type: press.type, held: true } : null;
      press = null;
    }, HOLD_MS);
  });

  function cancelPress() {
    if (press) { clearTimeout(press.timer); press = null; }
  }

  document.addEventListener("contextmenu", (e) => { if (press || on) e.preventDefault(); });
  document.addEventListener("dragstart", (e) => { if (on) e.preventDefault(); }); // no ghost-image link dragging

  /* ---------- in edit mode ---------- */
  function editDown(e) {
    if (e.target.closest(".edit-x, .edit-bar, .bubble-x, dialog, .toast, .rail, .side-panel")) return;
    const hit = hitTest(e.target);
    pending = hit
      ? { hit, x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType }
      : { bg: isBackground(e.target), x: e.clientX, y: e.clientY };
    if (hit && e.pointerType === "mouse") e.preventDefault(); // no text selecting while dragging
  }

  const readyToDrag = (p) => p.held || p.type === "mouse" || performance.now() - p.t > 140;

  document.addEventListener("pointermove", (e) => {
    if (press) {
      if (dist(e, press) > 10) cancelPress();
      return;
    }
    if (drag) { moveDrag(e); return; }
    if (pending && pending.hit && dist(e, pending) > 6) {
      if (readyToDrag(pending)) startDrag(pending.hit, e);
      else pending = null; // a quick swipe is a scroll, not a drag
    }
  });

  // keep the page from scrolling while something is being dragged (touch)
  document.addEventListener("touchmove", (e) => {
    if (drag || (pending && pending.hit && readyToDrag(pending))) e.preventDefault();
  }, { passive: false });

  function pointerUp(e) {
    cancelPress();
    if (drag) { endDrag(); return; }
    if (!pending) return;
    const p = pending;
    pending = null;
    if (e.type === "pointercancel" || dist(e, p) > 6) return;
    if (p.hit) {
      // a tap on a card or bubble: let its owner open an editor for it
      (p.hit.el.isConnected ? p.hit.el : document.body).dispatchEvent(new CustomEvent("wrld:edit-tap", { bubbles: true, detail: { zone: p.hit.zone, key: p.hit.key } }));
    } else if (p.bg) {
      exit();
    }
  }
  document.addEventListener("pointerup", pointerUp);
  document.addEventListener("pointercancel", pointerUp);

  // in edit mode, links and buttons on the page don't do their normal thing
  document.addEventListener("click", (e) => {
    if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!on) return;
    if (e.target.closest(".edit-x, .edit-bar, .bubble-x, dialog, .toast, .rail, .side-panel, [data-action='settings']")) return;
    if (e.target.closest(".app")) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener("click", (e) => {
    const hide = e.target.closest("[data-edit-hide]");
    if (hide) { const [z, k] = hide.getAttribute("data-edit-hide").split("|"); hideItem(z, k); return; }
    const show = e.target.closest("[data-edit-show]");
    if (show) { const [z, k] = show.getAttribute("data-edit-show").split("|"); showItem(z, k); return; }
    if (e.target.closest("#edit-done")) exit();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && on && !document.querySelector("dialog[open]")) exit();
  });

  /* ---------- dragging ---------- */
  // where an element sits in the layout, ignoring any animation in progress
  function homeRect(el) {
    const r = el.getBoundingClientRect();
    const t = getComputedStyle(el).translate;
    let dx = 0, dy = 0;
    if (t && t !== "none") { const p = t.split(" "); dx = parseFloat(p[0]) || 0; dy = parseFloat(p[1]) || 0; }
    return { left: r.left - dx, top: r.top - dy, right: r.right - dx, bottom: r.bottom - dy, width: r.width, height: r.height };
  }

  function startDrag(hit, e) {
    pending = null;
    // if the thing she pressed got redrawn, grab the live copy of it
    const el = hit.el.isConnected ? hit.el : items(hit.zone).find((x) => keyOf(x) === hit.key);
    if (!el) return;
    let r = el.getBoundingClientRect();
    let offY = e.clientY - r.top;
    if (hit.zone === "sections") {
      // sections fold down to their headers while one is moving, so they're easy to shuffle
      const head = el.querySelector(".sec-head").getBoundingClientRect();
      offY = Math.max(0, Math.min(e.clientY - head.top, head.height));
      body.classList.add("sec-dragging");
      r = el.getBoundingClientRect();
    }
    drag = { zone: hit.zone, el, offX: e.clientX - r.left, offY, tx: 0, ty: 0, x: e.clientX, y: e.clientY };
    el.classList.add("dragging");
    body.classList.add("is-dragging");
    if (navigator.vibrate) navigator.vibrate(8);
    place();
    requestAnimationFrame(autoScroll);
  }

  // keep the dragged thing under the finger
  function place() {
    const el = drag.el;
    const r = el.getBoundingClientRect();
    const layoutL = r.left - drag.tx, layoutT = r.top - drag.ty;
    drag.tx = drag.x - drag.offX - layoutL;
    drag.ty = drag.y - drag.offY - layoutT;
    el.style.translate = drag.tx + "px " + drag.ty + "px";
  }

  function moveDrag(e) {
    drag.x = e.clientX;
    drag.y = e.clientY;
    place();
    findSlot();
  }

  function findSlot() {
    const z = ZONES[drag.zone];
    const root = z.root();
    const others = visible(drag.zone).filter((x) => x !== drag.el);
    const endRef = z.end ? root.querySelector(":scope > " + z.end) : null;
    let ref; // insert the dragged element before this (null = end)

    if (z.axis === "y") {
      const below = others.find((s) => { const r = homeRect(s); return drag.y < r.top + r.height / 2; });
      ref = below || endRef;
    } else {
      const over = others.find((s) => { const r = homeRect(s); return drag.x >= r.left && drag.x <= r.right && drag.y >= r.top && drag.y <= r.bottom; });
      if (!over) return; // in a gap: stay put
      const all = visible(drag.zone);
      ref = all.indexOf(drag.el) < all.indexOf(over) ? over.nextElementSibling : over;
    }
    if (ref === drag.el || ref === drag.el.nextElementSibling) return;
    reorder(root, ref, others);
  }

  // move it in the page and let everything else glide to its new spot
  function reorder(root, ref, others) {
    const before = new Map(others.map((s) => [s, s.getBoundingClientRect()]));
    others.forEach((s) => { s.style.transition = "none"; s.style.translate = ""; });
    root.insertBefore(drag.el, ref || null);
    others.forEach((s) => {
      const a = before.get(s), b = s.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) s.style.translate = dx + "px " + dy + "px";
    });
    void root.offsetWidth;
    others.forEach((s) => {
      if (!s.style.translate) { s.style.transition = ""; return; }
      s.style.transition = "translate 0.28s " + EASE;
      s.style.translate = "0px 0px";
      const done = () => { s.style.transition = ""; s.style.translate = ""; s.removeEventListener("transitionend", done); };
      s.addEventListener("transitionend", done);
    });
    place();
    if (navigator.vibrate) navigator.vibrate(4);
  }

  function autoScroll() {
    if (!drag) return;
    const edge = 80;
    let v = 0;
    if (drag.y < edge) v = -Math.ceil((edge - drag.y) / 5);
    else if (drag.y > window.innerHeight - edge) v = Math.ceil((drag.y - (window.innerHeight - edge)) / 5);
    if (v) { window.scrollBy(0, v); place(); findSlot(); }
    requestAnimationFrame(autoScroll);
  }

  function endDrag() {
    const { el, zone } = drag;
    drag = null;
    el.classList.remove("dragging");
    body.classList.remove("is-dragging");
    L.setOrder(zone, items(zone).map(keyOf));

    if (zone === "sections") {
      body.classList.remove("sec-dragging");
      el.style.translate = "";
      tidy();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // snap into its slot
    el.style.transition = "translate 0.3s " + EASE;
    el.style.translate = "0px 0px";
    const done = () => { el.style.transition = ""; el.style.translate = ""; el.removeEventListener("transitionend", done); };
    el.addEventListener("transitionend", done);
    setTimeout(done, 400);
    tidy();
  }

  /* ---------- keep things in sync ---------- */
  window.addEventListener("wrld:layout", () => {
    if (drag) return;
    applyStatic();
    if (on) renderBar();
  });
  // class cards get redrawn by app.js; put the badges back on the new ones
  new MutationObserver(() => { if (on && !drag) addBadges(); }).observe($("#course-cards"), { childList: true });

  applyStatic();
  window.WRLD_EDIT = { enter, exit, isOn: () => on };
})();
