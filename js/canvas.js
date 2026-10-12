/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — Canvas pages
   Lets her link each class to its own Canvas page, by hand or automatically.

   "Find my classes": a website can't look around her laptop, so instead she
   drags a bookmark button to her bookmarks bar and clicks it while she's on
   Canvas. It runs on Canvas (where she's signed in), reads her active course
   list (/api/v1/courses), and sends just the names + course numbers back here
   in the address bar (#canvas=...). Nothing else leaves Canvas, and the
   address part after # is never sent to any server. This file matches the
   courses to her classes and fills the form in for her to check and save.
   ============================================================================ */
(function () {
  "use strict";

  const W = window.WRLD;
  if (!W) return;
  const icon = window.wrldIcon;
  const { esc, classes } = W;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $("#canvas-dialog");
  if (!dialog) return;

  const LOOKS_LIKE_URL = /^https:\/\/([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;
  const hubUrl = location.href.split(/[?#]/)[0];

  /* ---------- the bookmark button ---------- */
  const code =
    "(async()=>{try{" +
    "const all=[];let u='/api/v1/courses?enrollment_state=active&per_page=100';" +
    "for(let i=0;i<5&&u;i++){" +
    "const r=await fetch(u,{headers:{Accept:'application/json'},credentials:'same-origin'});" +
    "if(!r.ok)throw 0;" +
    "const t=(await r.text()).replace(/^while\\(1\\);/,'');" +
    "JSON.parse(t).forEach(c=>{if(c&&c.id&&c.name)all.push([c.id,c.name,c.course_code||''])});" +
    "const m=(r.headers.get('Link')||'').match(/<([^>]+)>;\\s*rel=\"next\"/);u=m?m[1]:null}" +
    "const p=btoa(unescape(encodeURIComponent(JSON.stringify({o:location.origin,c:all}))));" +
    "location.href=" + JSON.stringify(hubUrl + "#canvas=") + "+encodeURIComponent(p)" +
    "}catch(e){alert('Open Canvas and sign in first, then click Find my classes again.')}})()";
  const bookmarklet = $("#bookmarklet");
  bookmarklet.href = "javascript:" + encodeURIComponent(code);
  bookmarklet.addEventListener("click", (e) => {
    // clicking it here does nothing useful; it has to live in the bookmarks bar
    e.preventDefault();
    bookmarklet.classList.remove("nudge");
    void bookmarklet.offsetWidth;
    bookmarklet.classList.add("nudge");
    $("#bookmarklet-hint").textContent = "Drag it up to your bookmarks bar, don't click it here.";
  });

  /* ---------- reading what the bookmark sent back ---------- */
  function readFound() {
    const h = location.hash;
    if (!h.startsWith("#canvas=")) return null;
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(h.slice(8)))));
      const d = JSON.parse(json);
      if (!d || !/^https:\/\/[a-z0-9.-]+$/i.test(d.o)) return null;
      const courses = (Array.isArray(d.c) ? d.c : [])
        .filter((c) => Array.isArray(c) && /^\d+$/.test(String(c[0])) && typeof c[1] === "string")
        .slice(0, 100)
        .map((c) => ({ name: c[1].slice(0, 120), code: String(c[2] || "").slice(0, 60), url: d.o + "/courses/" + c[0] }));
      return { origin: d.o, courses };
    } catch (e) {
      return null;
    }
  }

  /* ---------- matching courses to classes ---------- */
  const norm = (s) => String(s || "").toLowerCase()
    .replace(/\biii\b/g, "3").replace(/\bii\b/g, "2")
    .replace(/[^a-z0-9]+/g, " ").trim();

  function keysFor(cls) {
    if (Array.isArray(cls.canvasMatch) && cls.canvasMatch.length) return cls.canvasMatch.map(norm).filter(Boolean);
    return [norm(cls.name)].concat(norm(cls.name).split(" ").filter((w) => w.length >= 5));
  }

  function match(found) {
    const pairs = [];
    classes.forEach((cls) => {
      const keys = keysFor(cls);
      found.courses.forEach((course) => {
        const hay = norm(course.name + " " + course.code);
        const score = keys.reduce((s, k) => (k && hay.includes(k) ? s + k.length : s), 0);
        if (score > 0) pairs.push({ cls, course, score });
      });
    });
    pairs.sort((a, b) => b.score - a.score);
    const out = {}, used = new Set();
    pairs.forEach((p) => {
      if (out[p.cls.id] || used.has(p.course.url)) return;
      out[p.cls.id] = p.course;
      used.add(p.course.url);
    });
    return out;
  }

  /* ---------- the dialog ---------- */
  function render(found, matches) {
    const links = W.canvasLinks();
    const banner = $("#canvas-found");
    $(".finder").hidden = !!found; // already done the finding, show the results first
    if (found) {
      const n = Object.keys(matches).length;
      banner.hidden = false;
      banner.innerHTML = icon("sparkles") + "<span><b>Found " + found.courses.length + " course" + (found.courses.length === 1 ? "" : "s") + " on Canvas.</b> " +
        (n ? "Matched " + n + " of your classes. Check them, then hit Save." : "Pick the right course for each class, then hit Save.") + "</span>";
    } else {
      banner.hidden = true;
      banner.innerHTML = "";
    }

    $("#canvas-rows").innerHTML = classes.map((cls) => {
      const current = links[cls.id] || cls.canvas || "";
      const m = matches && matches[cls.id];
      const value = m ? m.url : current;
      const badge = m ? '<span class="cv-badge">' + icon("sparkles") + "Matched</span>"
        : current ? '<span class="cv-badge ok">' + icon("check") + "Linked</span>" : "";
      let select = "";
      if (found) {
        const options = found.courses.map((c) => '<option value="' + esc(c.url) + '"' + (c.url === value ? " selected" : "") + ">" + esc(c.name) + "</option>").join("");
        const keepCurrent = value && !found.courses.some((c) => c.url === value) ? '<option value="' + esc(value) + '" selected>Keep current link</option>' : "";
        select = '<select class="field cv-select" data-for="cv-' + esc(cls.id) + '" aria-label="Canvas course for ' + esc(cls.name) + '">' +
          '<option value=""' + (value ? "" : " selected") + ">Not on Canvas</option>" + keepCurrent + options + "</select>";
      }
      return '<div class="cv-row" style="--c:' + esc(W.colorOf(cls)) + '">' +
        '<span class="cv-i">' + icon(cls.icon || "book-open") + "</span>" +
        '<div class="cv-main"><label class="cv-name" for="cv-' + esc(cls.id) + '">' + esc(cls.name) + badge + "</label>" + select +
        '<input class="field" type="url" id="cv-' + esc(cls.id) + '" name="' + esc(cls.id) + '" value="' + esc(value) + '" placeholder="Paste this class\'s Canvas link" inputmode="url" autocomplete="off">' +
        "</div></div>";
    }).join("");
  }

  function open(focusId, found) {
    const matches = found ? match(found) : null;
    render(found, matches);
    if (typeof dialog.showModal === "function") { if (!dialog.open) dialog.showModal(); } else dialog.setAttribute("open", "");
    const target = focusId && document.getElementById("cv-" + focusId);
    if (target) {
      target.focus();
      target.closest(".cv-row").classList.add("focus");
    }
  }

  dialog.addEventListener("change", (e) => {
    const sel = e.target.closest(".cv-select");
    if (sel) document.getElementById(sel.getAttribute("data-for")).value = sel.value;
  });

  $("#canvas-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const map = {};
    let bad = null;
    classes.forEach((cls) => {
      const input = document.getElementById("cv-" + cls.id);
      const v = input.value.trim();
      input.setCustomValidity("");
      if (!v) return;
      if (!LOOKS_LIKE_URL.test(v)) { input.setCustomValidity("Paste the full link, starting with https://"); bad = bad || input; return; }
      if (v !== cls.canvas) map[cls.id] = v;
    });
    if (bad) { bad.reportValidity(); return; }
    W.setCanvasLinks(map);
    const btn = e.submitter || $("#canvas-form [type=submit]");
    if (btn && window.wrldBurst) {
      const r = btn.getBoundingClientRect();
      window.wrldBurst(r.left + r.width / 2, r.top + r.height / 2);
    }
    dialog.close();
  });

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-canvas]");
    if (trigger) open(trigger.getAttribute("data-canvas"));
  });

  /* ---------- coming back from "Find my classes" ---------- */
  const found = readFound();
  if (found) {
    if (found.courses.length) open(null, found);
    else {
      open(null, null);
      const banner = $("#canvas-found");
      banner.hidden = false;
      banner.innerHTML = icon("info") + "<span><b>Canvas didn't list any active courses.</b> You can paste links below instead.</span>";
    }
  }
})();
