/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — Settings
   The gear in the top bar. Every control here is wired by its data-pref
   attribute to window.WRLD_PREFS and saves the instant it changes.
   Also: layout visibility, red/blue fixes, backup + restore, lock device.
   ============================================================================ */
(function () {
  "use strict";

  const P = window.WRLD_PREFS;
  const W = window.WRLD;
  const icon = window.wrldIcon;
  const $ = (sel) => document.querySelector(sel);
  const drawer = $("#settings");
  if (!drawer) return;

  const ACCENTS = [
    { name: "Lavender", hex: "#b48ef0" },
    { name: "Lilac", hex: "#c9a2f5" },
    { name: "Periwinkle", hex: "#9aa8ff" },
    { name: "Rose", hex: "#f2a7d6" },
    { name: "Mint", hex: "#86dcc0" },
    { name: "Peach", hex: "#f5c27a" }
  ];
  const SECTIONS = [
    { zone: "sections", key: "now", label: "Right now" },
    { zone: "sections", key: "classes", label: "Classes" },
    { zone: "sections", key: "week", label: "This week" },
    { zone: "side", key: "coming", label: "Coming up" },
    { zone: "side", key: "todo", label: "To-do" },
    { zone: "sections", key: "notes", label: "Notes" },
    { zone: "sections", key: "vibes", label: "Vibes" }
  ];

  const open = () => { sync(); window.wrldDialog.open(drawer); };
  const close = () => window.wrldDialog.close(drawer);
  const refresh = () => window.dispatchEvent(new Event("wrld:refresh"));

  /* ---------- build the dynamic bits ---------- */
  $("#set-swatches").innerHTML = ACCENTS.map((a) =>
    '<button class="swatch" type="button" data-accent="' + a.hex + '" style="--sw:' + a.hex + '" aria-label="' + a.name + '" title="' + a.name + '"></button>'
  ).join("") +
    '<label class="swatch custom" title="Pick any color"><input type="color" id="set-color" aria-label="Pick any color">' + icon("palette") + "</label>";

  $("#set-sections").innerHTML = SECTIONS.map((s) =>
    '<label class="set-row"><span class="set-label">' + s.label + '</span><input class="switch" type="checkbox" data-layout="' + s.zone + "|" + s.key + '"></label>'
  ).join("");

  /* ---------- show current values ---------- */
  function sync() {
    drawer.querySelectorAll("input[data-pref]").forEach((el) => {
      const v = P.get(el.getAttribute("data-pref"));
      if (el.type === "checkbox") el.checked = !!v;
      else if (document.activeElement !== el) el.value = v || "";
    });
    $("#set-name").placeholder = (window.WRLD_SETTINGS || {}).herName || "Your name";
    drawer.querySelectorAll(".seg[data-pref]").forEach((seg) => {
      const v = P.get(seg.getAttribute("data-pref"));
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(String(v) === b.getAttribute("data-value") || (v == null && b.getAttribute("data-value") === "default"))));
    });
    const accent = String(P.get("accent")).toLowerCase();
    drawer.querySelectorAll("[data-accent]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-accent") === accent)));
    const custom = !ACCENTS.some((a) => a.hex === accent);
    $(".swatch.custom").setAttribute("aria-pressed", String(custom));
    $("#set-color").value = accent;
    drawer.querySelectorAll("[data-layout]").forEach((el) => {
      const [zone, key] = el.getAttribute("data-layout").split("|");
      el.checked = !P.layout.isHidden(zone, key);
    });

    // today's red/blue color
    const type = W.dayType(new Date());
    $("#set-daytype").innerHTML = type
      ? '<span class="type-pill" style="--d:' + W.DAY_TYPES[type].color + '"><i class="dot"></i>' + W.DAY_TYPES[type].label + "</span>" +
        '<button class="btn ghost sm" type="button" data-action="flip">' + icon("arrow-left-right") + "Switch</button>"
      : '<span class="set-muted">No school today</span>';
    $("#set-unfix").hidden = !W.hasRotationFix();
  }

  /* ---------- controls ---------- */
  drawer.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("input[type=checkbox][data-pref]")) P.set(el.getAttribute("data-pref"), el.checked);
    if (el.matches("[data-layout]")) {
      const [zone, key] = el.getAttribute("data-layout").split("|");
      if (el.checked) P.layout.show(zone, key); else P.layout.hide(zone, key);
    }
    if (el.id === "set-color") { P.set("accent", el.value); sync(); }
  });

  let nameTimer = null;
  $("#set-name").addEventListener("input", (e) => {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => P.set("name", e.target.value.trim()), 250);
  });

  drawer.addEventListener("click", (e) => {
    const seg = e.target.closest(".seg[data-pref] button");
    if (seg) {
      const key = seg.closest(".seg").getAttribute("data-pref");
      let v = seg.getAttribute("data-value");
      if (v === "default") v = null;
      else if (/^\d+$/.test(v)) v = Number(v);
      else if (v === "true" || v === "false") v = v === "true";
      P.set(key, v);
      sync();
      return;
    }
    const sw = e.target.closest("[data-accent]");
    if (sw) { P.set("accent", sw.getAttribute("data-accent")); sync(); return; }

    const action = e.target.closest("[data-set]");
    if (!action) return;
    switch (action.getAttribute("data-set")) {
      case "edit-layout": close(); setTimeout(() => window.WRLD_EDIT && window.WRLD_EDIT.enter(), 200); break;
      case "reset-layout": P.layout.reset(); sync(); window.wrldToast("Layout reset"); break;
      case "unfix": W.resetRotationFix(); refresh(); sync(); window.wrldToast("Red/blue days back to the school calendar"); break;
      case "canvas": close(); window.WRLD_CANVAS && window.WRLD_CANVAS.open(""); break;
      case "shortcuts": close(); window.WRLD_HOME.openShortcuts(null); break;
      case "home": close(); window.WRLD_HOME.openHomeSetup(); break;
      case "notes-import": close(); window.WRLD_NOTES && window.WRLD_NOTES.openImport(); break;
      case "backup": downloadBackup(); break;
      case "restore": $("#set-restore-file").click(); break;
      case "restore-yes": applyRestore(); break;
      case "restore-no": pendingRestore = null; $("#set-restore-confirm").hidden = true; break;
      case "erase": $("#set-erase-confirm").hidden = false; break;
      case "erase-no": $("#set-erase-confirm").hidden = true; break;
      case "erase-yes": eraseAll(); break;
      case "prefs-reset": P.reset(); sync(); window.wrldToast("Settings back to how they started"); break;
      case "sync-now": if (S && S.enabled) S.syncNow(); break;
      case "lock":
        // with sync on, locking also clears this device's copy (it comes back on unlock)
        if (S && S.enabled) S.flush().finally(() => { S.forgetLocal(); window.WRLD_GATE.lock(); });
        else window.WRLD_GATE.lock();
        break;
    }
  });

  // the red/blue "Switch" button lives in here too; app.js handles the flip itself
  window.addEventListener("wrld:refresh", () => { if (drawer.open) sync(); });
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="settings"]')) open();
    if (drawer.open && e.target.closest('#settings [data-action="flip"]')) setTimeout(sync, 0);
  });

  /* ---------- backup + restore ---------- */
  const OWN = (k) => k.startsWith("wrld.") && k !== "wrld.deviceKey"; // never export the unlock key

  function downloadBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (OWN(k)) data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify({ app: "wrld", version: 1, saved: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wrld-backup-" + W.ymd(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    window.wrldToast("Backup downloaded");
  }

  let pendingRestore = null;
  $("#set-restore-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.app !== "wrld" || typeof parsed.data !== "object") throw new Error();
      const keys = Object.keys(parsed.data).filter(OWN);
      pendingRestore = keys.reduce((m, k) => { if (typeof parsed.data[k] === "string") m[k] = parsed.data[k]; return m; }, {});
      $("#set-restore-msg").textContent = "Restore the backup from " + new Date(parsed.saved).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        "? It replaces the notes, to-dos, shortcuts and settings on this device.";
      $("#set-restore-confirm").hidden = false;
    } catch (err) {
      window.wrldToast("That file isn't a backup from this page.");
    }
  });

  function applyRestore() {
    if (!pendingRestore) return;
    clearOwn();
    Object.keys(pendingRestore).forEach((k) => { try { localStorage.setItem(k, pendingRestore[k]); } catch (e) { /* full */ } });
    // with sync on, send the restored copy to her other devices before reloading
    if (S && S.enabled) S.flush().finally(() => location.reload());
    else location.reload();
  }

  function clearOwn() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (OWN(k)) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  function eraseAll() {
    // with sync on this only drops this device's copy; everything downloads again on reload
    if (S && S.enabled) S.forgetLocal();
    else clearOwn();
    location.reload();
  }

  /* ---------- sync status (Settings + the little cloud in the top bar) ---------- */
  const S = window.WRLD_SYNC;
  const SYNC_TEXT = {
    idle: "Connecting…",
    syncing: "Syncing…",
    pending: "Saving…",
    ok: "Synced",
    offline: "Offline · saved on this device",
    auth: "Sync key stopped working",
    error: "Couldn't sync right now"
  };
  function showSync(st) {
    const on = st.state !== "off";
    $("#set-sync-group").hidden = !on;
    const pill = $("#sync-pill");
    pill.hidden = !on;
    if (!on) return;
    const when = st.last ? " · " + W.fmtClock(new Date(st.last).getHours() * 60 + new Date(st.last).getMinutes()) : "";
    const text = SYNC_TEXT[st.state] || "Sync";
    $("#set-sync-state").innerHTML = '<i class="sync-dot ' + st.state + '"></i>' + text + (st.state === "ok" ? when : "");
    pill.className = "sync-pill " + st.state;
    pill.title = text + (st.state === "ok" ? when : "");
    pill.setAttribute("aria-label", "Sync: " + pill.title);
    pill.querySelector(".sync-label").textContent = st.state === "ok" ? "Synced" : text.split(" · ")[0];
    const erase = drawer.querySelector('[data-set="erase"]');
    if (erase) erase.textContent = "Clear this device's copy";
    const eraseMsg = $("#set-erase-confirm p");
    if (eraseMsg) eraseMsg.textContent = "This clears what's stored on this device only. Your synced notes, to-dos and settings download again right after.";
  }
  if (S) S.onStatus(showSync);

  window.WRLD_SETTINGS_PANEL = { open, close, sync };
})();
