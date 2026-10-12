/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — sidebar (like Opera's)
   A rail on the left (a dock along the bottom on phones) with Spotify and
   sportsYou panels, quick jumps to each section, and settings.

   Spotify: the official Spotify player sits right in the panel and keeps
   playing when the panel closes. Her saved playlists/albums/songs live in a
   little library (titles + covers come from Spotify's public oEmbed).
   sportsYou: it refuses to be shown inside other sites (X-Frame-Options:
   DENY), so its panel opens it in a slim window docked beside this one.
   ============================================================================ */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const icon = window.wrldIcon;
  const body = document.body;
  const KEY = "wrld.sidebar";
  const JUICE = { url: "https://open.spotify.com/artist/4MCBfE4596Uoi2O4DtmEMz", title: "Juice WRLD", type: "artist", thumb: "https://image-cdn-ak.spotifycdn.com/image/ab6761610000517423a60030944f7853c21565ef" };
  const SPORTSYOU = "https://app.sportsyou.com/";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let state = Object.assign({ pinned: false, syDirect: false, spotify: { items: [JUICE], current: JUICE.url } }, read());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* full */ } };
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
    body.classList.toggle("panel-pinned", !!id && state.pinned);
    $$("[data-panel-pin]").forEach((b) => b.setAttribute("aria-pressed", String(state.pinned)));
    if (id === "spotify") buildPlayer();
  }

  /* ---------- Spotify ---------- */
  const SP_LINK = /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]{10,})/i;
  function parseSpotify(link) {
    const m = SP_LINK.exec(String(link || ""));
    if (!m) return null;
    const type = m[1].toLowerCase();
    return { type, id: m[2], url: "https://open.spotify.com/" + type + "/" + m[2] };
  }
  const embedOf = (url) => { const p = parseSpotify(url); return p ? "https://open.spotify.com/embed/" + p.type + "/" + p.id + "?utm_source=generator&theme=0" : ""; };
  const TYPE_LABEL = { track: "Song", album: "Album", playlist: "Playlist", artist: "Artist", episode: "Episode", show: "Podcast" };

  async function lookup(url) {
    try {
      const r = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(url));
      if (r.ok) { const j = await r.json(); return { title: j.title, thumb: j.thumbnail_url }; }
    } catch (e) { /* offline: keep the link without a title */ }
    return {};
  }

  // the player is only created the first time she opens the panel, then kept so music keeps going
  let frame = null;
  function buildPlayer() {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.className = "sp-frame";
    frame.title = "Spotify player";
    frame.loading = "lazy";
    frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.src = embedOf(state.spotify.current || JUICE.url);
    $("#sp-player").appendChild(frame);
    $("#sp-player").classList.add("ready");
    $('[data-panel-toggle="spotify"]').classList.add("loaded");
  }

  function play(url) {
    state.spotify.current = url;
    save();
    if (frame) frame.src = embedOf(url);
    else buildPlayer();
    renderLibrary();
  }

  function renderLibrary() {
    const items = state.spotify.items || [];
    $("#sp-list").innerHTML = items.map((it) =>
      '<li class="sp-row' + (it.url === state.spotify.current ? " current" : "") + '">' +
      '<button class="sp-item" type="button" data-sp-play="' + esc(it.url) + '">' +
      (it.thumb ? '<img src="' + esc(it.thumb) + '" alt="" width="40" height="40" loading="lazy">' : '<span class="sp-noart">' + icon("music") + "</span>") +
      '<span class="sp-meta"><b>' + esc(it.title || "Spotify link") + "</b><small>" + esc(TYPE_LABEL[it.type] || "Spotify") + (it.url === state.spotify.current ? " · Playing here" : "") + "</small></span></button>" +
      '<button class="icon-btn sp-x" type="button" data-sp-remove="' + esc(it.url) + '" aria-label="Remove ' + esc(it.title || "link") + '">' + icon("x") + "</button></li>"
    ).join("") || '<li class="empty">' + icon("music") + "Nothing saved yet.</li>";
  }

  $("#sp-add").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#sp-link");
    const p = parseSpotify(input.value);
    if (!p) { window.wrldToast("That isn't a Spotify link. In Spotify: Share → Copy link."); return; }
    if (state.spotify.items.some((x) => x.url === p.url)) { play(p.url); input.value = ""; return; }
    const item = { url: p.url, type: p.type, title: "", thumb: "" };
    state.spotify.items.unshift(item);
    input.value = "";
    play(p.url);
    Object.assign(item, await lookup(p.url));
    save();
    renderLibrary();
  });

  function signIn() {
    const w = 480, h = 720;
    const left = (screen.availLeft || 0) + Math.max(0, ((screen.availWidth || 1280) - w) / 2);
    const top = (screen.availTop || 0) + Math.max(0, ((screen.availHeight || 900) - h) / 2);
    const win = window.open("https://accounts.spotify.com/login?continue=" + encodeURIComponent("https://open.spotify.com/"), "wrld-spotify-login",
      "popup=yes,width=" + w + ",height=" + h + ",left=" + left + ",top=" + top);
    if (!win) { window.open("https://accounts.spotify.com/login", "_blank", "noopener"); return; }
    // once she's signed in and closes it, reload the player so it picks up her account
    const timer = setInterval(() => {
      if (win.closed) { clearInterval(timer); if (frame) frame.src = frame.src; window.wrldToast("Player refreshed"); }
    }, 800);
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
    if (t.closest("[data-panel-pin]")) { state.pinned = !state.pinned; save(); repin(); return; }

    const jumpBtn = t.closest("[data-jump]");
    if (jumpBtn) { jump(jumpBtn.dataset.jump); if (window.matchMedia("(max-width: 760px)").matches) setOpen(null); return; }
    if (t.closest('[data-rail="home"]')) { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => $("#search-input").focus({ preventScroll: true }), 400); return; }

    const playBtn = t.closest("[data-sp-play]");
    if (playBtn) { play(playBtn.dataset.spPlay); return; }
    const rm = t.closest("[data-sp-remove]");
    if (rm) {
      const url = rm.dataset.spRemove;
      const before = state.spotify.items.slice();
      state.spotify.items = state.spotify.items.filter((x) => x.url !== url);
      save();
      renderLibrary();
      window.wrldToast("Removed from your music", { action: "Undo", onAction() { state.spotify.items = before; save(); renderLibrary(); } });
      return;
    }
    if (t.closest("[data-sp-signin]")) { signIn(); return; }

    const sy = t.closest("[data-sy]");
    if (sy) { openSportsYou(sy.dataset.sy); return; }
  });

  $("#sy-direct").addEventListener("change", (e) => { state.syDirect = e.target.checked; save(); });

  // "pinned" panels push the page over instead of sitting on top of it (wide screens)
  function repin() {
    body.classList.toggle("panel-pinned", !!openId && state.pinned);
    $$("[data-panel-pin]").forEach((b) => b.setAttribute("aria-pressed", String(state.pinned)));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openId && !document.querySelector("dialog[open]")) setOpen(null);
  });

  /* ---------- go ---------- */
  $("#sy-direct").checked = !!state.syDirect;
  if (!state.spotify || !Array.isArray(state.spotify.items)) state.spotify = { items: [JUICE], current: JUICE.url };
  renderLibrary();
  body.classList.add("has-rail");

  window.WRLD_SIDEBAR = { open: setOpen, close: () => setOpen(null) };
})();
