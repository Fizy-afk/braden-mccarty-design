/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — the page
   Draws everything from the schedule engine (js/core.js): the right-now card,
   the school-day dial, class cards, the week calendar, coming up, and to-dos.
   Hovering a class anywhere lights it up everywhere (dial, week, cards).
   You shouldn't need to edit this to change classes or links; edit data/.
   ============================================================================ */
(function () {
  "use strict";

  const W = window.WRLD;
  const icon = window.wrldIcon;
  const settings = window.WRLD_SETTINGS || {};
  const { esc, classes, DAY_TYPES, DAY_NAMES } = W;
  const $ = (sel) => document.querySelector(sel);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TODO_KEY = "wrld.todos";

  const LINES = [
    "One class at a time.",
    "Drink some water. You're doing great.",
    "999: turn the bad into something good.",
    "Breathe. You're right on track.",
    "Legends never die."
  ];

  // Only touch the DOM when the markup really changed, so hover/tilt state survives.
  function setHTML(el, html) {
    if (el && el.__html !== html) { el.innerHTML = html; el.__html = html; }
  }
  const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  const shortName = (cls) => cls.short || cls.name;
  const clsIcon = (cls, c) => icon(cls.icon || cls.emoji || "book-open", c);

  function typePill(type, asButton) {
    const d = DAY_TYPES[type];
    if (!d) return "";
    if (!asButton) return '<span class="type-pill" style="--d:' + d.color + '"><i class="dot"></i>' + d.label + "</span>";
    const other = DAY_TYPES[W.otherType(type)].label;
    return '<button class="type-pill" type="button" data-action="flip" style="--d:' + d.color + '" title="Wrong color? Tap to switch to ' + other + '">' +
      '<i class="dot"></i>' + d.label + icon("arrow-left-right", "flip-i") +
      '<span class="sr-only">. Tap to switch to ' + other + "</span></button>";
  }

  /* =========================== header =========================== */
  function greeting(h) {
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }

  function renderClock(now) {
    $("#clock-time").textContent = W.fmtClock(W.minutesNow(now), false);
    $("#clock-ap").textContent = now.getHours() >= 12 ? "PM" : "AM";
    $("#clock-date").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    setHTML($("#greeting"), greeting(now.getHours()) + (settings.herName ? ", <em>" + esc(settings.herName) + "</em>" : ""));
  }

  function renderDayBadge(now) {
    const type = W.dayType(now);
    if (type) { setHTML($("#day-badge"), typePill(type, true)); return; }
    const r = W.offReason(now);
    setHTML($("#day-badge"), r && r !== "weekend" && r !== "summer"
      ? '<span class="type-pill off"><i class="dot"></i>No school</span>' : "");
  }

  /* =========================== right now =========================== */
  function chips(cls, session) {
    const out = [];
    if (session) out.push('<span class="chip">' + icon("clock") + W.fmtClock(session.start, false) + " – " + W.fmtClock(session.end) + "</span>");
    if (cls.room) out.push('<span class="chip">' + icon("map-pin") + esc(cls.room) + "</span>");
    if (cls.teacher) out.push('<span class="chip">' + icon("user-round") + esc(cls.teacher) + "</span>");
    if (cls.rotation && DAY_TYPES[cls.rotation]) out.push(typePill(cls.rotation));
    return out.length ? '<div class="meta">' + out.join("") + "</div>" : "";
  }

  // The class's own Canvas page (if linked) replaces the general Canvas button.
  function resourcesFor(cls) {
    const link = W.canvasLink(cls);
    const res = (cls.resources || []).filter((r) => !(link && /^canvas$/i.test(r.label)));
    return link ? [{ label: "Canvas", url: link, icon: "book-marked" }].concat(res) : res;
  }

  function resourcesHtml(cls) {
    const res = resourcesFor(cls);
    const linkBtn = W.canvasLink(cls) ? "" :
      '<button class="res res-add" type="button" data-canvas="' + esc(cls.id) + '"><span class="res-i">' + icon("plus") + "</span>Link Canvas page</button>";
    return '<div class="resources">' + res.map((r) =>
      '<a class="res" href="' + esc(r.url || "#") + '" target="_blank" rel="noopener">' +
      '<span class="res-i">' + icon(r.icon || "link") + "</span>" + esc(r.label) + icon("arrow-up-right", "res-go") + "</a>"
    ).join("") + linkBtn + "</div>";
  }

  function freeTitle(now) {
    const reason = W.offReason(now);
    if (reason === "weekend") return "It's the weekend";
    if (reason === "summer") return "Summer break";
    if (reason) return cap(reason);
    const t = W.minutesNow(now);
    const today = W.sessionsOn(now);
    if (today.length && today.every((s) => s.end <= t)) return "Done for today";
    if (today.length && today[0].start > t) return "School starts at " + W.fmtClock(today[0].start);
    return "Free period";
  }

  function heroHtml(snap) {
    const { now, auto, picked, cls } = snap;

    if (!classes.length) {
      return '<div class="hero-body"><p class="eyebrow">Setup</p><h2 class="hero-title">No classes yet</h2>' +
        '<p class="hero-next"><span>Add them in <code>data/schedule.js</code></span></p></div>';
    }

    if (!cls) {
      const nx = auto.next;
      const reason = W.offReason(now);
      const nxType = nx ? W.dayType(nx.date) : null;
      const eyebrow = reason
        ? '<span class="eyebrow-tag">' + icon("moon-star") + (reason === "weekend" ? "Weekend" : "No school") + "</span>"
        : '<span class="eyebrow-tag">' + icon("coffee") + "Free</span>";
      let body = "";
      if (nx && nx.offset === 0) {
        body = '<div class="countdown"><span class="cd-num" id="cd-num">--:--</span><span class="cd-label">until <b>' + esc(nx.cls.name) + "</b></span></div>";
      } else if (nx) {
        body = '<p class="hero-next">' + icon("calendar") + "<span>Next up: <b>" + esc(nx.cls.name) + "</b>, " + W.whenText(nx) +
          (nxType ? " · " + DAY_TYPES[nxType].label : "") + "</span></p>";
      }
      return '<span class="hero-glow"></span><div class="hero-body">' +
        '<p class="eyebrow">' + eyebrow + "</p>" +
        '<h2 class="hero-title">' + esc(freeTitle(now)) + "</h2>" +
        body +
        (nx ? '<div class="hero-actions"><button class="btn" type="button" data-pick="' + esc(nx.cls.id) + '">' + clsIcon(nx.cls) +
          "Open " + esc(shortName(nx.cls)) + " now" + icon("arrow-right") + "</button></div>" : "") +
        '<p class="quote">' + esc(LINES[now.getDate() % LINES.length]) + "</p></div>";
    }

    const session = picked ? null : auto.session;
    let eyebrow, timing = "";
    if (picked) {
      eyebrow = '<span class="eyebrow-tag">' + icon("pin") + "Pinned by you</span>" +
        '<button class="btn ghost sm" type="button" data-action="auto">' + icon("rotate-ccw") + "Back to schedule</button>";
      const nx = W.nextSession(now, cls.id);
      if (nx) timing = '<p class="hero-next">' + icon("calendar") + "<span>Next class " + W.whenText(nx) + "</span></p>";
    } else if (auto.state === "in") {
      eyebrow = '<span class="live"><i></i>In class</span>';
      timing = '<div class="countdown"><span class="cd-num" id="cd-num">--:--</span><span class="cd-label">left · ends ' + W.fmtClock(session.end) + "</span></div>" +
        '<div class="progress" role="progressbar" aria-label="Class progress" aria-valuemin="0" aria-valuemax="100"><span id="cd-bar"></span></div>';
    } else {
      eyebrow = '<span class="eyebrow-tag">' + icon("timer") + "Starting soon</span>";
      timing = '<div class="countdown"><span class="cd-num" id="cd-num">--:--</span><span class="cd-label">until it starts</span></div>';
    }
    if (cls.period) eyebrow += '<span class="eyebrow-sep">Period ' + esc(cls.period) + "</span>";

    return '<span class="hero-glow"></span><div class="hero-body">' +
      '<p class="eyebrow">' + eyebrow + "</p>" +
      '<h2 class="hero-title">' + esc(cls.name) + "</h2>" +
      chips(cls, session) +
      timing +
      (cls.notes ? '<p class="note">' + icon("info") + esc(cls.notes) + "</p>" : "") +
      resourcesHtml(cls) +
      "</div>";
  }

  function renderHero(snap) {
    const el = $("#now");
    el.style.setProperty("--c", snap.cls ? W.colorOf(snap.cls) : "var(--wrld)");
    setHTML(el, heroHtml(snap));
  }

  /* =========================== day dial =========================== */
  const D = { c: 160, r: 112, a0: -135, sweep: 270 };
  let dial = null; // { date, isToday, sessions, from, to }

  const polar = (a, r) => {
    const rad = (a * Math.PI) / 180;
    return [D.c + r * Math.sin(rad), D.c - r * Math.cos(rad)];
  };
  function arcPath(a0, a1, r) {
    const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r);
    return "M" + x0.toFixed(2) + " " + y0.toFixed(2) + "A" + r + " " + r + " 0 " + (a1 - a0 > 180 ? 1 : 0) + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2);
  }
  const angleAt = (min) => D.a0 + ((min - dial.from) / (dial.to - dial.from)) * D.sweep;
  const hourLabel = (h) => (h % 12 || 12);

  function pickDialDay(now) {
    const t = W.minutesNow(now);
    const today = W.sessionsOn(now);
    if (today.length && today.some((s) => s.end > t)) return { date: now, isToday: true, sessions: today };
    const next = W.nextSchoolDay(W.addDays(now, 1));
    return next ? { date: next, isToday: false, sessions: W.sessionsOn(next) } : null;
  }

  function renderDial(snap) {
    const now = snap.now;
    const t = W.minutesNow(now);
    dial = pickDialDay(now);

    if (!dial) {
      setHTML($("#dial"), '<div class="dial-center"><span class="dc-label">Summer</span><span class="dc-big">No classes</span></div>');
      setHTML($("#dial-legend"), "");
      return;
    }

    dial.from = Math.floor((dial.sessions[0].start - 5) / 60) * 60;
    dial.to = Math.ceil(Math.max.apply(null, dial.sessions.map((s) => s.end)) / 60) * 60;

    let svg = '<svg class="dial-svg" viewBox="0 0 320 320" role="group" aria-label="School day">' +
      '<path class="dial-track" d="' + arcPath(D.a0, D.a0 + D.sweep, D.r) + '"/>';

    for (let m = dial.from; m <= dial.to; m += 30) {
      const a = angleAt(m);
      const major = m % 60 === 0;
      const [x0, y0] = polar(a, major ? 128 : 129);
      const [x1, y1] = polar(a, major ? 135 : 132);
      svg += '<line class="dial-tick' + (major ? "" : " minor") + '" x1="' + x0.toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y1.toFixed(1) + '"/>';
      if (major) {
        const [lx, ly] = polar(a, 148);
        svg += '<text class="dial-hour" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + hourLabel(m / 60) + "</text>";
      }
    }

    if (dial.isToday) svg += '<path class="dial-elapsed" id="dial-elapsed" d=""/>';

    dial.sessions.forEach((s) => {
      const state = !dial.isToday ? "next" : t >= s.end ? "past" : t >= s.start ? "now" : "next";
      const label = s.cls.name + ", " + W.fmtClock(s.start) + " to " + W.fmtClock(s.end);
      svg += '<path class="arc ' + state + '" d="' + arcPath(angleAt(s.start) + 0.9, angleAt(s.end) - 0.9, D.r) + '" style="--c:' + esc(W.colorOf(s.cls)) + '"' +
        ' data-cid="' + esc(s.cls.id) + '" data-pick="' + esc(s.cls.id) + '" role="button" tabindex="0" aria-label="' + esc(label) + '"/>';
    });

    if (dial.isToday) {
      const [, y0] = polar(0, 84), [, y1] = polar(0, 128), [, yd] = polar(0, D.r);
      svg += '<g class="dial-needle" id="dial-needle"><line x1="160" y1="' + y0 + '" x2="160" y2="' + y1 + '"/><circle cx="160" cy="' + yd + '" r="5.5"/></g>';
    }
    svg += "</svg>";

    setHTML($("#dial"), svg + '<div class="dial-center" id="dial-center"></div>');
    setHTML($("#dial-center"), dialCenterHtml(hlId));

    // legend under the dial
    const type = W.dayType(dial.date);
    const head = '<li class="lg-head"><span>' + (dial.isToday ? "Today" : DAY_NAMES[dial.date.getDay()] + ", " + W.MONTHS[dial.date.getMonth()] + " " + dial.date.getDate()) + "</span>" +
      (type ? typePill(type) : "") + "</li>";
    setHTML($("#dial-legend"), head + dial.sessions.map((s) => {
      const state = !dial.isToday ? "" : t >= s.end ? "past" : t >= s.start ? "now" : "";
      return '<li><button class="lg-row ' + state + '" type="button" data-cid="' + esc(s.cls.id) + '" data-pick="' + esc(s.cls.id) + '" style="--c:' + esc(W.colorOf(s.cls)) + '">' +
        '<i class="lg-dot"></i><span class="lg-time">' + W.fmtClock(s.start, false) + "</span>" +
        '<span class="lg-name">' + esc(s.cls.name) + "</span>" +
        (state === "now" ? '<span class="lg-tag">Now</span>' : state === "past" ? '<span class="lg-tag done">' + icon("check") + "</span>" : "") +
        "</button></li>";
    }).join(""));
  }

  function dialCenterHtml(id) {
    if (!dial) return "";
    const now = new Date();
    const t = W.minutesNow(now);
    const block = (label, big, sub) => '<span class="dc-label">' + label + '</span><span class="dc-big">' + esc(big) + '</span><span class="dc-sub">' + sub + "</span>";
    if (id) {
      const s = dial.sessions.find((x) => x.cls.id === id);
      if (s) return block(s.cls.period ? "Period " + esc(s.cls.period) : "Class", shortName(s.cls), W.fmtClock(s.start, false) + " – " + W.fmtClock(s.end));
    }
    if (dial.isToday) {
      const cur = dial.sessions.find((s) => t >= s.start && t < s.end);
      if (cur) return block("In class", shortName(cur.cls), "until " + W.fmtClock(cur.end));
      const nx = dial.sessions.find((s) => s.start > t);
      if (nx) return block("Up next", shortName(nx.cls), W.fmtClock(nx.start));
    }
    const first = dial.sessions[0];
    const type = W.dayType(dial.date);
    return block(DAY_NAMES[dial.date.getDay()], shortName(first.cls), W.fmtClock(first.start) + (type ? " · " + DAY_TYPES[type].label : ""));
  }

  /* =========================== class cards =========================== */
  function renderCourses(snap) {
    setHTML($("#course-cards"), classes.map((cls) => {
      const active = cls.id === snap.activeId;
      const nx = W.nextSession(snap.now, cls.id);
      const tag = active && snap.tag
        ? '<span class="course-tag">' + (snap.tag === "Now" ? "<i></i>" : "") + snap.tag + "</span>" : "";
      const rot = cls.rotation && DAY_TYPES[cls.rotation]
        ? '<span class="course-meta"><i class="dot" style="--d:' + DAY_TYPES[cls.rotation].color + '"></i>' + DAY_TYPES[cls.rotation].label + "s</span>" : "";
      return '<article class="course spot tilt' + (active ? " active" : "") + '" style="--c:' + esc(W.colorOf(cls)) + '" data-cid="' + esc(cls.id) + '">' +
        '<button class="course-main" type="button" data-pick="' + esc(cls.id) + '" aria-pressed="' + active + '">' +
        '<span class="course-art">' +
        (cls.period ? '<span class="course-period">P' + esc(cls.period) + "</span>" : "") + tag +
        '<span class="course-glyph">' + clsIcon(cls) + "</span></span>" +
        '<span class="course-body"><span class="course-name">' + esc(cls.name) + "</span>" + rot +
        (nx ? '<span class="course-next">Next · ' + cap(W.dayWord(nx.date, nx.offset)) + " " + W.fmtClock(nx.start) + "</span>" : "") +
        "</span></button>" +
        '<div class="course-tools">' + resourcesFor(cls).map((r) =>
          '<a class="tool" href="' + esc(r.url || "#") + '" target="_blank" rel="noopener" aria-label="' + esc(r.label) + '" data-tip="' + esc(r.label) + '">' + icon(r.icon || "link") + "</a>"
        ).join("") +
        (W.canvasLink(cls) ? "" : '<button class="tool tool-add" type="button" data-canvas="' + esc(cls.id) + '" aria-label="Link Canvas page for ' + esc(cls.name) + '" data-tip="Link Canvas page">' + icon("plus") + "</button>") +
        "</div></article>";
    }).join(""));
  }

  /* =========================== week calendar =========================== */
  let week = null; // { from, to, todayIndex }

  function renderWeek(snap) {
    const now = snap.now;
    const t = W.minutesNow(now);
    const dow = now.getDay();
    const monday = W.addDays(now, dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow);
    $("#week-title").textContent = dow === 0 || dow === 6 ? "Next week" : "This week";

    const days = [0, 1, 2, 3, 4].map((i) => W.addDays(monday, i));
    const lists = days.map((d) => W.sessionsOn(d));
    const all = [].concat.apply([], lists);
    const from = all.length ? Math.floor(Math.min.apply(null, all.map((s) => s.start)) / 60) * 60 : 480;
    const to = all.length ? Math.ceil(Math.max.apply(null, all.map((s) => s.end)) / 60) * 60 : 900;
    const pct = (m) => (((m - from) / (to - from)) * 100).toFixed(3) + "%";
    const todayKey = W.ymd(now);
    week = { from, to, today: days.findIndex((d) => W.ymd(d) === todayKey) };

    let head = '<div class="wk-head"><span></span>';
    days.forEach((d, i) => {
      const type = W.dayType(d);
      head += '<div class="wk-day' + (i === week.today ? " today" : "") + '"><span class="wk-dn">' + DAY_NAMES[d.getDay()].slice(0, 3) + "</span>" +
        '<span class="wk-date">' + d.getDate() + "</span>" +
        (type ? '<span class="wk-type" style="--d:' + DAY_TYPES[type].color + '"><i class="dot"></i><span>' + cap(type) + "</span></span>" : '<span class="wk-type muted">Off</span>') +
        "</div>";
    });
    head += "</div>";

    let gutter = '<div class="wk-gutter">';
    for (let m = from; m <= to; m += 60) gutter += '<span style="top:' + pct(m) + '">' + hourLabel(m / 60) + (m / 60 < 12 ? "a" : "p") + "</span>";
    gutter += "</div>";

    const cols = days.map((d, i) => {
      const reason = W.offReason(d);
      if (reason) {
        return '<div class="wk-col off"><span class="wk-off">' + icon("moon-star") + "<b>No school</b><small>" + esc(cap(reason)) + "</small></span></div>";
      }
      const isPastDay = W.ymd(d) < todayKey;
      return '<div class="wk-col' + (i === week.today ? " today" : "") + '">' +
        lists[i].map((s) => {
          const past = isPastDay || (i === week.today && t >= s.end);
          return '<button class="blk' + (past ? " past" : "") + '" type="button" data-cid="' + esc(s.cls.id) + '" data-pick="' + esc(s.cls.id) + '"' +
            ' style="--c:' + esc(W.colorOf(s.cls)) + ";top:" + pct(s.start) + ";height:calc(" + pct(s.end) + " - " + pct(s.start) + ')"' +
            ' aria-label="' + esc(s.cls.name + ", " + DAY_NAMES[d.getDay()] + " " + W.fmtClock(s.start) + " to " + W.fmtClock(s.end)) + '">' +
            '<span class="blk-name"><span class="blk-full">' + esc(shortName(s.cls)) + '</span><span class="blk-abbr">' + esc(s.cls.abbr || shortName(s.cls)) + '</span></span><span class="blk-time">' + W.fmtClock(s.start, false) + "</span></button>";
        }).join("") +
        (i === week.today ? '<div class="wk-now" id="wk-now"></div>' : "") +
        "</div>";
    }).join("");

    setHTML($("#week"), head + '<div class="wk-body" style="--hours:' + (to - from) / 60 + '">' + gutter + cols + "</div>");
  }

  /* =========================== coming up =========================== */
  function renderComingUp(now) {
    const today = W.ymd(now);
    const items = [];
    (W.schedule.noSchool || []).forEach((e) => {
      const start = e.date || e.from, end = e.date || e.to;
      if (!start || end < today) return;
      const s = W.parseYmd(start < today ? today : start);
      const sub = e.from ? W.shortDate(W.parseYmd(e.from)) + " – " + W.shortDate(W.parseYmd(e.to)) : W.shortDate(s) + " · No school";
      items.push({ date: s, label: cap(e.label), sub, icon: e.from ? "moon-star" : "calendar-x-2" });
    });
    (W.schedule.milestones || []).forEach((m) => {
      if (m.date < today) return;
      items.push({ date: W.parseYmd(m.date), label: cap(m.label), sub: W.shortDate(W.parseYmd(m.date)), icon: /last day/i.test(m.label) ? "graduation-cap" : "flag" });
    });
    items.sort((a, b) => a.date - b.date);
    setHTML($("#coming-up"), items.slice(0, 4).map((it) => {
      const n = W.daysBetween(now, it.date);
      return '<li class="cu"><span class="cu-i">' + icon(it.icon) + '</span><span class="cu-text"><b>' + esc(it.label) + "</b><small>" + esc(it.sub) + "</small></span>" +
        '<span class="cu-days">' + (n <= 0 ? "<b>Today</b>" : "<b>" + n + "</b><small>" + (n === 1 ? "day" : "days") + "</small>") + "</span></li>";
    }).join("") || '<li class="empty">Nothing coming up.</li>');
  }

  /* =========================== to-dos =========================== */
  let todos = W.store.get(TODO_KEY, []);

  function renderTodos() {
    setHTML($("#todo-list"), todos.length
      ? todos.map((td) =>
        '<li class="todo' + (td.done ? " done" : "") + '">' +
        '<button class="check" type="button" data-todo="' + td.id + '" aria-pressed="' + !!td.done + '" aria-label="Mark ' + esc(td.text) + (td.done ? " not done" : " done") + '">' + icon("check") + "</button>" +
        '<span class="todo-text">' + esc(td.text) + "</span>" +
        '<button class="icon-btn del" type="button" data-del="' + td.id + '" aria-label="Remove ' + esc(td.text) + '">' + icon("x") + "</button></li>"
      ).join("")
      : '<li class="empty">' + icon("circle-check") + "All clear.</li>");
  }
  const saveTodos = () => { W.store.set(TODO_KEY, todos); renderTodos(); };

  /* =========================== live bits (every second) =========================== */
  function updateLive(snap) {
    const now = snap.now;
    const t = W.minutesNow(now);

    const cd = $("#cd-num");
    if (cd) {
      let target = null;
      if (!snap.picked && snap.auto.session) target = snap.auto.state === "in" ? snap.auto.session.end : snap.auto.session.start;
      else if (!snap.cls && snap.auto.next && snap.auto.next.offset === 0) target = snap.auto.next.start;
      if (target != null) cd.textContent = W.fmtCountdown((target - t) * 60);
    }
    const bar = $("#cd-bar");
    if (bar && snap.auto.state === "in") {
      const s = snap.auto.session;
      const p = Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start)));
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      bar.parentElement.setAttribute("aria-valuenow", Math.round(p * 100));
    }

    if (dial && dial.isToday) {
      const clamped = Math.min(dial.to, Math.max(dial.from, t));
      const a = angleAt(clamped);
      const needle = $("#dial-needle");
      if (needle) {
        needle.style.transform = "rotate(" + a.toFixed(2) + "deg)";
        needle.classList.toggle("outside", t < dial.from || t > dial.to);
      }
      const el = $("#dial-elapsed");
      if (el) el.setAttribute("d", a > D.a0 + 0.5 ? arcPath(D.a0, a, 94) : "");
    }

    const line = $("#wk-now");
    if (line && week) {
      const inside = t >= week.from && t <= week.to;
      line.style.top = (((t - week.from) / (week.to - week.from)) * 100).toFixed(3) + "%";
      line.hidden = !inside;
    }
  }

  /* =========================== linked highlight =========================== */
  let hlId = null;
  function setHL(id, force) {
    if (id === hlId && !force) return;
    hlId = id;
    document.body.classList.toggle("hl", !!id);
    document.querySelectorAll(".hl-on").forEach((el) => el.classList.remove("hl-on"));
    if (id) document.querySelectorAll('[data-cid="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach((el) => el.classList.add("hl-on"));
    setHTML($("#dial-center"), dialCenterHtml(id));
  }
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest && e.target.closest("[data-cid]");
    setHL(el ? el.getAttribute("data-cid") : null);
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest && e.target.closest("[data-cid]");
    setHL(el ? el.getAttribute("data-cid") : null);
  });

  /* =========================== render loop =========================== */
  let lastKey = "";
  function renderAll(snap) {
    renderDayBadge(snap.now);
    renderHero(snap);
    renderDial(snap);
    renderCourses(snap);
    renderWeek(snap);
    renderComingUp(snap.now);
    const today = W.sessionsOn(snap.now);
    $("#now-aside").textContent = today.length ? today.length + (today.length === 1 ? " class today" : " classes today") : "No classes today";
    setHL(hlId, true);
  }

  function tick(force) {
    const now = new Date();
    const snap = W.snapshot(now);
    renderClock(now);
    const key = W.ymd(now) + "|" + Math.floor(W.minutesNow(now)) + "|" + snap.activeId + "|" + snap.tag;
    if (force || key !== lastKey) { lastKey = key; renderAll(snap); }
    updateLive(snap);
  }

  /* =========================== events =========================== */
  function pick(id) {
    W.setOverride(id);
    tick(true);
    const hero = $("#now");
    const r = hero.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) hero.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) { pick(p.getAttribute("data-pick")); return; }
    if (e.target.closest('[data-action="auto"]')) { pick(null); return; }
    if (e.target.closest('[data-action="flip"]')) { W.flipToday(); tick(true); return; }

    const chk = e.target.closest("[data-todo]");
    if (chk) {
      const td = todos.find((x) => String(x.id) === chk.getAttribute("data-todo"));
      if (td) {
        td.done = !td.done;
        if (td.done && window.wrldBurst) {
          const r = chk.getBoundingClientRect();
          window.wrldBurst(r.left + r.width / 2, r.top + r.height / 2);
        }
        saveTodos();
      }
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) { todos = todos.filter((td) => String(td.id) !== del.getAttribute("data-del")); saveTodos(); return; }

    if (e.target.closest("#nine") && window.WRLD_SKY) {
      window.WRLD_SKY.shower(16);
      const r = e.target.closest("#nine").getBoundingClientRect();
      if (window.wrldBurst) window.wrldBurst(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  // SVG arcs act like buttons from the keyboard too
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][data-pick]')) {
      e.preventDefault();
      pick(e.target.getAttribute("data-pick"));
    }
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

  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(true); });
  window.addEventListener("wrld:canvas", () => tick(true));

  /* =========================== go =========================== */
  tick(true);
  renderTodos();
  setInterval(tick, 1000);
})();
