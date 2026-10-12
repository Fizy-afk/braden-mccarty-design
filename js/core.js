/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — schedule engine
   Pure logic, no drawing: red/blue rotation, days off, which class is on now,
   and her manual class pick. Everything visual lives in js/app.js.
   Exposed as window.WRLD.
   ============================================================================ */
(function () {
  "use strict";

  const schedule = window.WRLD_SCHEDULE || {};
  const classes = schedule.classes || [];
  const rotation = schedule.rotation || null;
  const EARLY = typeof schedule.switchEarlyMinutes === "number" ? schedule.switchEarlyMinutes : 15;

  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_TYPES = {
    red: { label: "Red day", color: "#ff8fa8" },
    blue: { label: "Blue day", color: "#8fb4ff" }
  };
  const PALETTE = ["#b48ef0", "#f2a7d6", "#8fb4ff", "#86dcc0", "#f5c27a", "#c9a2f5"];

  const OVERRIDE_KEY = "wrld.override";
  const ROTATION_FIX_KEY = "wrld.rotationFix";
  const CANVAS_KEY = "wrld.canvas";

  /* ---------- storage (fails quietly in private mode) ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
  const minutesNow = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const dayKey = (d) => String(d).slice(0, 3).toLowerCase();
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parseYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  const shortDate = (d) => DAY_NAMES[d.getDay()].slice(0, 3) + ", " + MONTHS[d.getMonth()] + " " + d.getDate();

  function fmtClock(min, withPeriod) {
    let h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + pad(m) + (withPeriod === false ? "" : " " + ap);
  }

  function fmtDuration(mins) {
    mins = Math.max(0, Math.round(mins));
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h >= 24) { const d = Math.round(h / 24); return d + (d === 1 ? " day" : " days"); }
    return m ? h + "h " + m + "m" : h + "h";
  }

  // 1:04:09 or 32:15
  function fmtCountdown(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? h + ":" + pad(m) + ":" + pad(sec) : m + ":" + pad(sec);
  }

  const colorOf = (cls) => cls.color || PALETTE[Math.max(0, classes.indexOf(cls)) % PALETTE.length];

  /* ---------- school calendar + red/blue rotation ---------- */
  const noSchool = new Map(); // "YYYY-MM-DD" -> label
  (schedule.noSchool || []).forEach((e) => {
    if (e.date) { noSchool.set(e.date, e.label || "no school"); return; }
    if (!e.from || !e.to) return;
    for (let d = parseYmd(e.from); ymd(d) <= e.to; d = addDays(d, 1)) noSchool.set(ymd(d), e.label || "no school");
  });

  // Why there's no school on this date, or null if it's a school day.
  function offReason(d) {
    const key = ymd(d);
    if (rotation && rotation.firstDay && key < rotation.firstDay) return "summer";
    if (rotation && rotation.lastDay && key > rotation.lastDay) return "summer";
    if (d.getDay() === 0 || d.getDay() === 6) return "weekend";
    return noSchool.get(key) || null;
  }

  // Her tap-to-fix correction (if any) wins over the anchor in schedule.js.
  function anchor() {
    const fix = store.get(ROTATION_FIX_KEY, null);
    if (fix && fix.date && DAY_TYPES[fix.day]) return fix;
    return rotation && rotation.anchor;
  }

  const otherType = (t) => (t === "red" ? "blue" : "red");
  let typeCache = new Map();

  // "red" | "blue" | null — counts school days from the anchor and alternates.
  function dayType(d) {
    const a = anchor();
    if (!a || offReason(d)) return null;
    const key = ymd(d);
    const cacheKey = key + "|" + a.date + "|" + a.day;
    if (typeCache.has(cacheKey)) return typeCache.get(cacheKey);
    const target = startOfDay(d);
    let cur = parseYmd(a.date);
    const step = target >= cur ? 1 : -1;
    let n = 0;
    for (let i = 0; i < 1000 && ymd(cur) !== key; i++) {
      if (step < 0 && !offReason(cur)) n++;
      cur = addDays(cur, step);
      if (step > 0 && !offReason(cur)) n++;
    }
    const type = n % 2 === 0 ? a.day : otherType(a.day);
    typeCache.set(cacheKey, type);
    return type;
  }

  function flipToday() {
    const today = new Date();
    const t = dayType(today);
    if (!t) return;
    store.set(ROTATION_FIX_KEY, { date: ymd(today), day: otherType(t) });
    typeCache = new Map();
    store.del(OVERRIDE_KEY);
  }

  /* ---------- sessions ---------- */
  function sessionsOn(date) {
    if (offReason(date)) return [];
    const key = DAY_KEYS[date.getDay()];
    const type = dayType(date);
    const out = [];
    classes.forEach((cls) => {
      (cls.meetings || []).forEach((mt) => {
        const rot = mt.rotation || cls.rotation;
        if (rot && type && rot !== type) return;
        if ((mt.days || []).map(dayKey).includes(key)) out.push({ cls, start: toMin(mt.start), end: toMin(mt.end) });
      });
    });
    return out.sort((a, b) => a.start - b.start);
  }

  // Next session (optionally of one class) starting after now. Looks far enough ahead to clear winter break.
  function nextSession(now, onlyId) {
    const t = minutesNow(now);
    for (let off = 0; off <= 45; off++) {
      const date = addDays(now, off);
      const hit = sessionsOn(date).find((s) => (!onlyId || s.cls.id === onlyId) && (off > 0 || s.start > t));
      if (hit) return Object.assign({}, hit, { offset: off, date, minsAway: off * 1440 + hit.start - t });
    }
    return null;
  }

  // Next date (today included) that has classes.
  function nextSchoolDay(now) {
    for (let off = 0; off <= 45; off++) {
      const date = addDays(now, off);
      if (sessionsOn(date).length) return date;
    }
    return null;
  }

  function dayWord(date, offset) {
    if (offset === 0) return "today";
    if (offset === 1) return "tomorrow";
    if (offset < 7) return DAY_NAMES[date.getDay()];
    return shortDate(date);
  }
  const whenText = (nx) => dayWord(nx.date, nx.offset) + " at " + fmtClock(nx.start);

  // What the schedule says should be on screen right now.
  function autoPick(now) {
    const today = sessionsOn(now);
    const t = minutesNow(now);
    const current = today.find((s) => t >= s.start && t < s.end);
    if (current) return { cls: current.cls, session: current, state: "in" };
    const soon = today.find((s) => s.start > t && s.start - t <= EARLY);
    if (soon) return { cls: soon.cls, session: soon, state: "soon" };
    return { cls: null, session: null, state: "free", next: nextSession(now) };
  }

  /* ---------- manual class pick ----------
     Her pick sticks until the schedule moves on to a different slot
     (next class starts / current one ends) or the day changes. */
  const autoKey = (auto) => (auto.session ? auto.cls.id + "@" + auto.session.start : "free");

  function getOverride(now, auto) {
    const o = store.get(OVERRIDE_KEY, null);
    if (!o) return null;
    const cls = classes.find((c) => c.id === o.id);
    if (!cls || o.day !== now.toDateString() || o.autoKey !== autoKey(auto)) {
      store.del(OVERRIDE_KEY);
      return null;
    }
    return cls;
  }

  function setOverride(id) {
    const now = new Date();
    const auto = autoPick(now);
    if (!id || (auto.cls && auto.cls.id === id)) store.del(OVERRIDE_KEY);
    else store.set(OVERRIDE_KEY, { id, autoKey: autoKey(auto), day: now.toDateString() });
  }

  /* ---------- per-class Canvas pages ----------
     Saved in this browser ({ classId: url }). A `canvas` field in
     data/schedule.js works too and applies on every device. */
  const canvasLinks = () => store.get(CANVAS_KEY, {}) || {};
  const canvasLink = (cls) => canvasLinks()[cls.id] || cls.canvas || null;
  function setCanvasLinks(map) {
    store.set(CANVAS_KEY, map);
    window.dispatchEvent(new Event("wrld:canvas"));
  }

  // Everything the page needs for "right now", in one object.
  function snapshot(now) {
    const auto = autoPick(now);
    const picked = getOverride(now, auto);
    const cls = picked || auto.cls;
    const tag = picked ? "Picked" : auto.state === "in" ? "Now" : auto.state === "soon" ? "Up next" : "";
    return { now, auto, picked, cls, activeId: cls ? cls.id : null, tag };
  }

  classes.forEach((c) => { if (!c.id) console.warn("[wrld] a class in data/schedule.js is missing an id:", c); });

  window.WRLD = {
    schedule, classes, store, esc, pad,
    DAY_NAMES, MONTHS, DAY_TYPES,
    toMin, minutesNow, ymd, parseYmd, addDays, daysBetween, shortDate,
    fmtClock, fmtDuration, fmtCountdown, colorOf,
    offReason, dayType, otherType, flipToday,
    sessionsOn, nextSession, nextSchoolDay, whenText, dayWord,
    autoPick, snapshot, setOverride,
    canvasLinks, canvasLink, setCanvasLinks
  };
})();
