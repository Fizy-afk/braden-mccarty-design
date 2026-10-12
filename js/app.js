/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — hub logic
   Works out today's red/blue day from data/schedule.js, picks the current class
   by the device clock, lets her override it, and renders today / week / links /
   to-dos. You shouldn't need to edit this to change classes or links; edit data/.
   ============================================================================ */
(function () {
  "use strict";

  const settings = window.WRLD_SETTINGS || {};
  const schedule = window.WRLD_SCHEDULE || {};
  const classes = schedule.classes || [];
  const rotation = schedule.rotation || null;
  const EARLY = typeof schedule.switchEarlyMinutes === "number" ? schedule.switchEarlyMinutes : 15;

  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_TYPES = {
    red: { label: "red day", color: "#ff8fab" },
    blue: { label: "blue day", color: "#8fb8f7" }
  };
  const PALETTE = ["#b48ef0", "#f4a7d8", "#8fb8f7", "#9de0c8", "#f7c98f", "#c9a2f5"];
  const LINES_999 = [
    "999 — flip the bad into good ✿",
    "you've got this, one class at a time",
    "drink some water, you're doing amazing",
    "breathe. you're right on track ✿",
    "legends never die — neither does your GPA"
  ];

  const OVERRIDE_KEY = "wrld.override";
  const ROTATION_FIX_KEY = "wrld.rotationFix";
  const TODO_KEY = "wrld.todos";

  const $ = (sel) => document.querySelector(sel);

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

  function fmtClock(min) {
    let h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + pad(m) + " " + ap;
  }

  function fmtDuration(mins) {
    mins = Math.max(0, Math.round(mins));
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h >= 24) { const d = Math.round(h / 24); return d + (d === 1 ? " day" : " days"); }
    return m ? h + "h " + m + "m" : h + "h";
  }

  function colorOf(cls) {
    return cls.color || PALETTE[Math.max(0, classes.indexOf(cls)) % PALETTE.length];
  }

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
    render();
  }

  /* ---------- schedule math ---------- */
  function sessionsOn(date) {
    if (offReason(date)) return [];
    const key = DAY_KEYS[date.getDay()];
    const type = dayType(date);
    const out = [];
    classes.forEach((cls) => {
      (cls.meetings || []).forEach((mt) => {
        const rot = mt.rotation || cls.rotation;
        if (rot && type && rot !== type) return;
        if ((mt.days || []).map(dayKey).includes(key)) {
          out.push({ cls, start: toMin(mt.start), end: toMin(mt.end) });
        }
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

  /* ---------- manual class override ----------
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
    render();
    $("#now").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- rendering ---------- */
  function typeDot(type) {
    return type ? '<i class="dot" style="--d:' + DAY_TYPES[type].color + '" aria-hidden="true"></i>' : "";
  }

  function resourcesHtml(cls) {
    const res = cls.resources || [];
    if (!res.length) return "";
    return '<div class="resources">' + res.map((r) =>
      '<a class="res" href="' + esc(r.url || "#") + '" target="_blank" rel="noopener">' +
      '<span aria-hidden="true">' + esc(r.icon || "↗") + "</span>" + esc(r.label) + "</a>"
    ).join("") + "</div>";
  }

  function metaHtml(cls, session) {
    const bits = [];
    if (cls.period) bits.push("period " + esc(cls.period));
    if (session) bits.push(fmtClock(session.start) + " – " + fmtClock(session.end));
    if (cls.room) bits.push(esc(cls.room));
    if (cls.teacher) bits.push(esc(cls.teacher));
    return bits.length ? '<p class="now-meta">' + bits.join(" · ") + "</p>" : "";
  }

  function freeTitle(now) {
    const reason = offReason(now);
    if (reason === "weekend") return "it's the weekend ✿";
    if (reason === "summer") return "summer mode ☀️";
    if (reason) return "no school, " + reason + " ✿";
    const t = minutesNow(now);
    const today = sessionsOn(now);
    if (today.length && today.every((s) => s.end <= t)) return "done for today 🎉";
    if (today.length && today[0].start > t) return "school starts at " + fmtClock(today[0].start) + " ✿";
    return "free time, breathe ✿";
  }

  function renderDayBadge(now) {
    const el = $("#day-badge");
    const type = dayType(now);
    if (!type) {
      const reason = offReason(now);
      el.innerHTML = reason && reason !== "weekend" ? '<span class="day-pill">no school · ' + esc(reason) + "</span>" : "";
      return;
    }
    el.innerHTML =
      '<button class="day-pill" type="button" data-action="flip" style="--d:' + DAY_TYPES[type].color + '" ' +
      'title="tap if today is actually a ' + DAY_TYPES[otherType(type)].label + '">' +
      typeDot(type) + DAY_TYPES[type].label + ' <span class="flip" aria-hidden="true">⇄</span>' +
      '<span class="sr-only">, tap to switch to ' + DAY_TYPES[otherType(type)].label + "</span></button>";
  }

  function renderNow(now, auto, picked) {
    const el = $("#now");
    const t = minutesNow(now);

    if (!classes.length) {
      el.style.setProperty("--c", "var(--wrld)");
      el.innerHTML = '<div class="now-main"><span class="now-emoji">✿</span><div><h2 class="now-name">no classes yet</h2>' +
        '<p class="now-meta">add them in <code>data/schedule.js</code></p></div></div>';
      return;
    }

    const cls = picked || auto.cls;

    if (!cls) {
      const nx = auto.next;
      const line = LINES_999[now.getDate() % LINES_999.length];
      const nxType = nx ? dayType(nx.date) : null;
      el.style.setProperty("--c", "var(--wrld)");
      el.innerHTML =
        '<div class="now-top"><span class="pill">free time</span></div>' +
        '<div class="now-main"><span class="now-emoji" aria-hidden="true">☁️</span><div>' +
        '<h2 class="now-name">' + freeTitle(now) + "</h2>" +
        '<p class="now-meta">' + (nx
          ? "next up: <b>" + esc(nx.cls.name) + "</b> " + whenText(nx) +
            (nx.offset > 0 && nxType ? " (" + DAY_TYPES[nxType].label + ")" : "") +
            (nx.offset === 0 ? " · in " + fmtDuration(nx.minsAway) : "")
          : "nothing on the schedule") + "</p></div></div>" +
        (nx ? '<div class="resources"><button class="res" type="button" data-pick="' + esc(nx.cls.id) + '">' +
          "open " + esc(nx.cls.short || nx.cls.name) + " stuff early →</button></div>" : "") +
        '<p class="now-quote">' + esc(line) + "</p>";
      return;
    }

    el.style.setProperty("--c", colorOf(cls));
    let top, timing = "", session = null;

    if (picked) {
      top = '<span class="pill picked">✿ you picked this</span>' +
        '<button class="ghost" type="button" data-action="auto">↺ back to schedule</button>';
      const nx = nextSession(now, cls.id);
      if (nx) timing = '<p class="now-left">next class ' + whenText(nx) + "</p>";
    } else if (auto.state === "in") {
      session = auto.session;
      const pct = Math.min(100, Math.max(0, ((t - session.start) / (session.end - session.start)) * 100));
      top = '<span class="pill live"><i aria-hidden="true"></i>in class now</span>';
      timing =
        '<div class="progress" role="progressbar" aria-label="class progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '">' +
        '<span style="width:' + pct.toFixed(1) + '%"></span></div>' +
        '<p class="now-left">' + fmtDuration(Math.ceil(session.end - t)) + " left · ends " + fmtClock(session.end) + "</p>";
    } else {
      session = auto.session;
      top = '<span class="pill soon">starts in ' + fmtDuration(Math.ceil(session.start - t)) + "</span>";
    }

    el.innerHTML =
      '<div class="now-top">' + top + "</div>" +
      '<div class="now-main"><span class="now-emoji" aria-hidden="true">' + esc(cls.emoji || "✿") + "</span><div>" +
      '<h2 class="now-name">' + esc(cls.name) + "</h2>" + metaHtml(cls, session) + "</div></div>" +
      timing +
      (cls.notes ? '<p class="now-notes">📌 ' + esc(cls.notes) + "</p>" : "") +
      resourcesHtml(cls);
  }

  // Canvas-style class cards: tap the card to pull the class up top,
  // tap a bubble underneath to open that resource.
  function renderCourses(now, activeId, activeTag) {
    $("#course-cards").innerHTML = classes.map((cls) => {
      const active = cls.id === activeId;
      const nx = nextSession(now, cls.id);
      const sub = [
        cls.period ? "period " + esc(cls.period) : "",
        cls.rotation && DAY_TYPES[cls.rotation] ? DAY_TYPES[cls.rotation].label + "s" : ""
      ].filter(Boolean).join(" · ");
      const tag = active && activeTag
        ? '<span class="course-tag">' + activeTag + "</span>"
        : cls.rotation && DAY_TYPES[cls.rotation] ? '<span class="course-tag">' + typeDot(cls.rotation) + DAY_TYPES[cls.rotation].label + "</span>" : "";

      return '<article class="course' + (active ? " active" : "") + '" style="--c:' + esc(colorOf(cls)) + '">' +
        '<button class="course-main" type="button" data-pick="' + esc(cls.id) + '" aria-pressed="' + active + '">' +
        '<span class="course-hero">' + tag + '<span class="course-em" aria-hidden="true">' + esc(cls.emoji || "✿") + "</span></span>" +
        '<span class="course-text"><span class="course-name">' + esc(cls.name) + "</span>" +
        (sub ? '<span class="course-sub">' + sub + "</span>" : "") +
        (nx ? '<span class="course-next">next: ' + whenText(nx) + "</span>" : "") +
        "</span></button>" +
        '<div class="course-bubbles">' + (cls.resources || []).map((r) =>
          '<a class="mini" href="' + esc(r.url || "#") + '" target="_blank" rel="noopener" aria-label="' + esc(r.label) + '" data-tip="' + esc(r.label) + '">' +
          '<span aria-hidden="true">' + esc(r.icon || "↗") + "</span></a>"
        ).join("") + "</div></article>";
    }).join("");
  }

  function renderToday(now, activeId) {
    const list = sessionsOn(now);
    const t = minutesNow(now);
    const type = dayType(now);
    $("#today-title").innerHTML = "today" + (type ? ' <span class="h-sub">' + typeDot(type) + DAY_TYPES[type].label + "</span>" : "");
    if (!list.length) {
      const reason = offReason(now);
      $("#today-list").innerHTML = '<li class="empty">' +
        (reason && reason !== "weekend" ? "no school today (" + esc(reason) + ") ✿ enjoy it" : "no classes today ✿ enjoy it") + "</li>";
      return;
    }
    $("#today-list").innerHTML = list.map((s) => {
      const state = t >= s.end ? "past" : t >= s.start ? "now" : "upcoming";
      const active = s.cls.id === activeId ? " active" : "";
      return '<li class="slot ' + state + active + '" style="--c:' + esc(colorOf(s.cls)) + '">' +
        '<button type="button" data-pick="' + esc(s.cls.id) + '">' +
        '<span class="slot-time">' + fmtClock(s.start) + "<small>" + fmtClock(s.end) + "</small></span>" +
        '<span class="slot-name">' + esc(s.cls.emoji || "") + " " + esc(s.cls.name) +
        (state === "now" ? ' <em class="tag">now</em>' : "") +
        (s.cls.period ? "<small>period " + esc(s.cls.period) + (s.cls.room ? " · " + esc(s.cls.room) : "") + "</small>" : "") +
        "</span></button></li>";
    }).join("");
  }

  // Mon–Fri of this week (or next week, on weekends) with real dates.
  function renderWeek(now) {
    const dow = now.getDay();
    const monday = addDays(now, dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow);
    $("#week-title").textContent = dow === 0 || dow === 6 ? "next week" : "this week";

    const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    $("#week").innerHTML = days.map((d) => {
      const isToday = ymd(d) === ymd(now);
      const type = dayType(d);
      const reason = offReason(d);
      const list = sessionsOn(d);
      return '<div class="day' + (isToday ? " today" : "") + (reason ? " off" : "") + '"' + (type ? ' style="--d:' + DAY_TYPES[type].color + '"' : "") + ">" +
        "<h3>" + DAY_NAMES[d.getDay()].slice(0, 3) + " " + d.getDate() + (isToday ? " · today" : "") + "</h3>" +
        (type ? '<p class="day-type">' + typeDot(type) + DAY_TYPES[type].label + "</p>" : "") +
        (list.length
          ? "<ul>" + list.map((s) =>
            '<li style="--c:' + esc(colorOf(s.cls)) + '"><span>' + fmtClock(s.start).replace(" ", " ") + "</span>" + esc(s.cls.short || s.cls.name) + "</li>"
          ).join("") + "</ul>"
          : '<p class="day-free">' + (reason && reason !== "summer" ? "no school · " + esc(reason) : "free") + " ✿</p>") +
        "</div>";
    }).join("");

    renderComingUp(now);
  }

  function renderComingUp(now) {
    const items = [];
    const today = ymd(now);

    // next weekday with no school (skips plain weekends)
    for (let i = 1; i <= 200; i++) {
      const d = addDays(now, i);
      const reason = offReason(d);
      if (reason === "summer") break;
      if (reason && reason !== "weekend") { items.push({ date: d, label: "no school · " + reason }); break; }
    }
    // next milestone
    const ms = (schedule.milestones || []).find((m) => m.date >= today);
    if (ms) items.push({ date: parseYmd(ms.date), label: ms.label });

    items.sort((a, b) => a.date - b.date);
    $("#coming-up").innerHTML = items.length
      ? items.map((it) => {
        const n = daysBetween(now, it.date);
        return "<li><b>" + esc(it.label) + "</b><span>" + shortDate(it.date) + " · " +
          (n === 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days") + "</span></li>";
      }).join("")
      : "";
  }

  /* ---------- to-dos (saved on this device) ---------- */
  let todos = store.get(TODO_KEY, []);

  function renderTodos() {
    const ul = $("#todo-list");
    if (!todos.length) {
      ul.innerHTML = '<li class="empty">all clear ✿</li>';
      return;
    }
    ul.innerHTML = todos.map((td) =>
      '<li class="' + (td.done ? "done" : "") + '">' +
      '<label><input type="checkbox" data-todo="' + td.id + '"' + (td.done ? " checked" : "") + ">" +
      "<span>" + esc(td.text) + "</span></label>" +
      '<button class="x" type="button" data-del="' + td.id + '" aria-label="remove ' + esc(td.text) + '">×</button></li>'
    ).join("");
  }

  function saveTodos() { store.set(TODO_KEY, todos); renderTodos(); }

  /* ---------- header ---------- */
  function greeting(h) {
    if (h < 5) return "up late";
    if (h < 12) return "good morning";
    if (h < 17) return "good afternoon";
    if (h < 21) return "good evening";
    return "good night";
  }

  function updateClock() {
    const now = new Date();
    $("#clock-time").textContent = fmtClock(minutesNow(now));
    $("#clock-date").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    $("#greeting").textContent = greeting(now.getHours()) + (settings.herName ? ", " + settings.herName : "") + " ✿";
  }

  function render() {
    const now = new Date();
    const auto = autoPick(now);
    const picked = getOverride(now, auto);
    const activeId = picked ? picked.id : auto.cls ? auto.cls.id : null;
    const activeTag = picked ? "✿ picked" : auto.state === "in" ? "● now" : auto.state === "soon" ? "up next" : "";
    renderDayBadge(now);
    renderNow(now, auto, picked);
    renderCourses(now, activeId, activeTag);
    renderToday(now, activeId);
    renderWeek(now);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) { setOverride(pick.getAttribute("data-pick")); return; }
    if (e.target.closest('[data-action="auto"]')) { setOverride(null); return; }
    if (e.target.closest('[data-action="flip"]')) { flipToday(); return; }
    const del = e.target.closest("[data-del]");
    if (del) { todos = todos.filter((td) => String(td.id) !== del.getAttribute("data-del")); saveTodos(); }
  });

  document.addEventListener("change", (e) => {
    const box = e.target.closest("[data-todo]");
    if (!box) return;
    const td = todos.find((x) => String(x.id) === box.getAttribute("data-todo"));
    if (td) { td.done = box.checked; saveTodos(); }
  });

  $("#todo-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#todo-input");
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false });
    input.value = "";
    saveTodos();
  });

  document.addEventListener("visibilitychange", () => { if (!document.hidden) { updateClock(); render(); } });

  /* ---------- go ---------- */
  classes.forEach((c) => { if (!c.id) console.warn("[wrld] a class in data/schedule.js is missing an id:", c); });
  updateClock();
  render();
  renderTodos();
  setInterval(updateClock, 1000);
  setInterval(render, 15000);
})();
