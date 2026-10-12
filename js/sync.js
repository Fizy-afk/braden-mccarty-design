/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — sync across devices
   Everything she does is saved in this browser (localStorage). When sync is
   set up, those saves are also kept in one file in a PRIVATE GitHub repo, so
   every device she unlocks shows the same notes, to-dos, layout, settings…

   - The file is encrypted with the same key her password makes (AES-GCM), so
     GitHub only ever stores scrambled data.
   - The repo + access token come from the encrypted private data
     (window.WRLD_SYNC_CONFIG), never from the public code.
   - Each saved item carries a timestamp; the newest wins. Notes, to-dos and
     shortcuts merge item by item, and deletions are remembered so they don't
     come back.
   - Device-only things (unlock key, "this is my home page", the class she
     picked for right now) are never synced.
   ============================================================================ */
(function () {
  "use strict";

  const cfg = window.WRLD_SYNC_CONFIG;
  const key = window.WRLD_KEY;
  const META = "wrld.sync.meta"; // { t: {key: ms}, deleted: {key: {id: ms}}, sha, last }
  const DEVICE_ONLY = ["wrld.deviceKey", "wrld.homeSet", "wrld.homeNever", "wrld.override"];
  const BY_ID = { "wrld.notes": "id", "wrld.todos": "id", "wrld.bookmarks": "id" };
  const synced = (k) => typeof k === "string" && k.startsWith("wrld.") && !k.startsWith("wrld.sync.") && !DEVICE_ONLY.includes(k);

  const listeners = new Set();
  let status = { state: cfg ? "idle" : "off", last: 0, error: "" };
  function setStatus(s) {
    status = Object.assign({}, status, s);
    listeners.forEach((fn) => { try { fn(status); } catch (e) { /* ignore */ } });
    window.dispatchEvent(new CustomEvent("wrld:sync", { detail: status }));
  }

  const api = {
    enabled: !!(cfg && key && window.crypto && window.crypto.subtle),
    status: () => status,
    onStatus(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); },
    firstPull: Promise.resolve(),
    syncNow: () => Promise.resolve(),
    flush: () => Promise.resolve(),
    forgetLocal() {}
  };
  window.WRLD_SYNC = api;
  if (!api.enabled) return;

  const store = window.localStorage;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  const readMeta = () => { try { return Object.assign({ t: {}, deleted: {} }, JSON.parse(store.getItem(META)) || {}); } catch (e) { return { t: {}, deleted: {} }; } };
  let meta = readMeta();
  const saveMeta = () => rawSet.call(store, META, JSON.stringify(meta));

  /* ---------- noticing changes ---------- */
  let applying = false;

  function idsOf(raw, field) {
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.map((x) => x && x[field]).filter((x) => x != null).map(String) : []; } catch (e) { return []; }
  }

  function noteChange(k, before, after) {
    const now = Date.now();
    meta.t[k] = now;
    // remember deletions in id-merged lists, so other devices drop them too
    if (BY_ID[k]) {
      const keep = new Set(idsOf(after, BY_ID[k]));
      const d = meta.deleted[k] || (meta.deleted[k] = {});
      // anything back in the list (undo, restore) is alive again
      keep.forEach((id) => { delete d[id]; });
      if (before) idsOf(before, BY_ID[k]).filter((id) => !keep.has(id)).forEach((id) => { d[id] = now; });
    }
    saveMeta();
    schedulePush();
  }

  Storage.prototype.setItem = function (k, v) {
    const watch = this === store && !applying && synced(k);
    const before = watch ? this.getItem(k) : null;
    rawSet.call(this, k, v);
    if (watch && before !== String(v)) noteChange(k, before, String(v));
  };
  Storage.prototype.removeItem = function (k) {
    const watch = this === store && !applying && synced(k);
    const before = watch ? this.getItem(k) : null;
    rawRemove.call(this, k);
    if (watch && before !== null) noteChange(k, before, null);
  };

  /* ---------- talking to GitHub ---------- */
  const URL_ = "https://api.github.com/repos/" + encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) + "/contents/" + (cfg.path || "sync.json");
  const headers = () => ({ Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });
  const b64 = (bytes) => { let s = ""; const a = new Uint8Array(bytes); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(String(s).replace(/\s+/g, "")), (c) => c.charCodeAt(0));

  async function encrypt(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return JSON.stringify({ v: 1, iv: b64(iv), data: b64(data) });
  }
  async function decrypt(text) {
    const box = JSON.parse(text);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function fetchRemote() {
    const r = await fetch(URL_ + "?t=" + Date.now(), { headers: headers(), cache: "no-store" });
    if (r.status === 404) return { sha: null, doc: null };
    if (r.status === 401 || r.status === 403) throw new Error("auth");
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    const text = new TextDecoder().decode(unb64(j.content));
    return { sha: j.sha, doc: await decrypt(text) };
  }

  /* ---------- merging ---------- */
  function mergeLists(k, localRaw, remoteRaw, localNewer, deleted) {
    const field = BY_ID[k];
    let L = [], R = [];
    try { L = JSON.parse(localRaw) || []; } catch (e) { /* ignore */ }
    try { R = JSON.parse(remoteRaw) || []; } catch (e) { /* ignore */ }
    if (!Array.isArray(L)) L = [];
    if (!Array.isArray(R)) R = [];
    const out = new Map();
    const stamp = (x) => (x && (x.updated || x.created)) || 0;
    const add = (x, preferThis) => {
      if (!x || x[field] == null) return;
      const id = String(x[field]);
      const del = deleted[id];
      if (del && del >= stamp(x)) return; // deleted after this version
      const cur = out.get(id);
      if (!cur) { out.set(id, x); return; }
      const a = stamp(cur), b = stamp(x);
      if (b > a || (b === a && preferThis)) out.set(id, x);
    };
    (localNewer ? R : L).forEach((x) => add(x, false));
    (localNewer ? L : R).forEach((x) => add(x, true));
    let merged = Array.from(out.values());
    if (k === "wrld.todos") merged.sort((a, b) => Number(a.id) - Number(b.id));
    return JSON.stringify(merged);
  }

  // fold the remote copy into this device; returns true if remote needs our changes
  function merge(doc) {
    const remote = (doc && doc.keys) || {};
    const rDeleted = (doc && doc.deleted) || {};
    let needPush = !doc;
    let changed = false;

    Object.keys(rDeleted).forEach((k) => {
      const d = meta.deleted[k] || (meta.deleted[k] = {});
      Object.keys(rDeleted[k]).forEach((id) => { d[id] = Math.max(d[id] || 0, rDeleted[k][id]); });
    });

    const keys = new Set(Object.keys(remote));
    for (let i = 0; i < store.length; i++) { const k = store.key(i); if (synced(k)) keys.add(k); }

    applying = true;
    try {
      keys.forEach((k) => {
        const lv = store.getItem(k);
        const lt = meta.t[k] || 0;
        const r = remote[k];
        const rt = r ? r.t || 0 : 0;
        if (!r) { if (lv !== null) needPush = true; return; }
        if (BY_ID[k] && lv !== null && r.v !== null) {
          const m = mergeLists(k, lv, r.v, lt >= rt, meta.deleted[k] || {});
          if (m !== lv) { rawSet.call(store, k, m); changed = true; }
          if (m !== r.v) needPush = true;
          meta.t[k] = Math.max(lt, rt);
          return;
        }
        // remote wins if it's newer, or if this device hasn't touched it since sync started
        if (rt > lt || lt === 0) {
          if (r.v === null) { if (lv !== null) { rawRemove.call(store, k); changed = true; } }
          else if (r.v !== lv) { rawSet.call(store, k, r.v); changed = true; }
          meta.t[k] = rt;
        } else if (lt > rt && lv !== r.v) {
          needPush = true;
        }
      });
    } finally {
      applying = false;
    }
    saveMeta();
    return { needPush, changed };
  }

  function snapshot() {
    const keys = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (synced(k)) keys[k] = { v: store.getItem(k), t: meta.t[k] || 0 };
    }
    Object.keys(meta.t).forEach((k) => { if (synced(k) && !(k in keys)) keys[k] = { v: null, t: meta.t[k] }; });
    return { v: 1, saved: Date.now(), keys, deleted: meta.deleted };
  }

  /* ---------- the sync loop ---------- */
  let busy = null;
  let pushTimer = null;
  let lastPush = 0;

  async function push(sha) {
    const body = { message: "sync", content: btoa(await encrypt(snapshot())) };
    if (sha) body.sha = sha;
    const r = await fetch(URL_, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, headers()), body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) return false; // someone else saved first
    if (r.status === 401 || r.status === 403) throw new Error("auth");
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    meta.sha = j.content && j.content.sha;
    lastPush = Date.now();
    saveMeta();
    return true;
  }

  // pull, merge, and push if we have anything newer — retried if another device saved in between
  function cycle(reason) {
    if (busy) return busy;
    busy = (async () => {
      setStatus({ state: "syncing", error: "" });
      let changed = false;
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { sha, doc } = await fetchRemote();
          const res = merge(doc);
          changed = changed || res.changed;
          if (!res.needPush) break;
          if (await push(sha)) break;
        }
        meta.last = Date.now();
        saveMeta();
        setStatus({ state: "ok", last: meta.last });
        if (changed && reason !== "boot") window.dispatchEvent(new Event("wrld:synced"));
      } catch (e) {
        setStatus({ state: navigator.onLine === false ? "offline" : e.message === "auth" ? "auth" : "error", error: String(e.message || e) });
      } finally {
        busy = null;
      }
      return changed;
    })();
    return busy;
  }

  function schedulePush() {
    if (status.state !== "off") setStatus({ state: "pending" });
    clearTimeout(pushTimer);
    const wait = Math.max(4000, 15000 - (Date.now() - lastPush)); // at most one save every ~15s while typing
    pushTimer = setTimeout(() => cycle("push"), wait);
  }

  api.syncNow = () => { clearTimeout(pushTimer); return cycle("manual"); };
  api.flush = () => { clearTimeout(pushTimer); return cycle("flush"); };
  // drop this device's copy; the next unlock downloads everything again
  api.forgetLocal = () => {
    clearTimeout(pushTimer);
    applying = true;
    const keys = [];
    for (let i = 0; i < store.length; i++) { const k = store.key(i); if (synced(k) || k.startsWith("wrld.sync.")) keys.push(k); }
    keys.forEach((k) => rawRemove.call(store, k));
    applying = false;
  };

  // first pull happens before the page draws, so she sees her latest stuff right away
  api.firstPull = Promise.race([cycle("boot"), new Promise((r) => setTimeout(r, 6000))]);

  // when she comes back to the page, check for changes from her other devices
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (pushTimer) api.flush(); return; }
    if (Date.now() - (meta.last || 0) > 20000) cycle("focus");
  });
  window.addEventListener("online", () => cycle("online"));
  setInterval(() => { if (!document.hidden) cycle("tick"); }, 120000);

  // changes from another device arrived mid-visit: redraw by reloading, but never mid-typing
  window.addEventListener("wrld:synced", () => {
    const active = document.activeElement;
    const typing = active && (active.isContentEditable || /^(INPUT|TEXTAREA)$/.test(active.tagName));
    const refresh = () => { sessionStorage.setItem("wrld.scroll", String(window.scrollY)); location.reload(); };
    if (!typing && !document.querySelector("dialog[open]") && !document.body.classList.contains("editing")) refresh();
    else window.wrldToast && window.wrldToast("New changes from your other device", { action: "Show", onAction: refresh, duration: 10000 });
  });
  const y = sessionStorage.getItem("wrld.scroll");
  if (y) { sessionStorage.removeItem("wrld.scroll"); window.addEventListener("wrld:ready", () => window.scrollTo(0, Number(y))); }
})();
