/* ============================================================================
   VIBES RENDERER — shows + music.
   OWNED BY: the "vibes" LLM. Read LLM_INSTRUCTIONS.md before editing.

   This is a bare-bones starter that reads window.WRLD_VIBES (data/vibes.js)
   and draws it into #vibes-root. Replace or rewrite it freely.
   ============================================================================ */
(function () {
  "use strict";

  const root = document.getElementById("vibes-root");
  if (!root) return;

  const data = window.WRLD_VIBES || {};
  const shows = data.shows || [];
  const music = data.music || {};
  const artists = music.artists || [];
  const playlists = music.playlists || [];
  const songs = music.songs || [];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  if (!shows.length && !artists.length && !playlists.length && !songs.length) {
    root.innerHTML = '<p class="vibes-empty">this corner is getting decorated ✿ shows &amp; music coming soon</p>';
    return;
  }

  let html = "";

  if (shows.length) {
    html += '<h3 class="vibes-sub">shows</h3><div class="vibes-grid">' + shows.map((s) =>
      '<a class="vibe-card" href="' + esc(s.url || "#") + '" target="_blank" rel="noopener">' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" loading="lazy">' : "") +
      "<strong>" + esc(s.title) + "</strong>" +
      (s.where ? "<small>" + esc(s.where) + "</small>" : "") +
      (s.note ? "<p>" + esc(s.note) + "</p>" : "") + "</a>"
    ).join("") + "</div>";
  }

  if (artists.length || playlists.length || songs.length) {
    html += '<h3 class="vibes-sub">music</h3>';
    if (artists.length) {
      html += '<div class="vibes-grid">' + artists.map((a) =>
        '<a class="vibe-card" href="' + esc(a.url || "#") + '" target="_blank" rel="noopener"><strong>' + esc(a.name) + "</strong>" +
        (a.note ? "<p>" + esc(a.note) + "</p>" : "") + "</a>"
      ).join("") + "</div>";
    }
    playlists.forEach((p) => {
      html += p.embed
        ? '<iframe class="vibe-embed" src="' + esc(p.embed) + '" title="' + esc(p.title) + '" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>'
        : '<a class="vibe-card" href="' + esc(p.url || "#") + '" target="_blank" rel="noopener"><strong>' + esc(p.title) + "</strong></a>";
    });
    if (songs.length) {
      html += '<ul class="vibe-songs">' + songs.map((s) =>
        '<li><a href="' + esc(s.url || "#") + '" target="_blank" rel="noopener">' + esc(s.title) + "</a>" +
        (s.artist ? " <small>" + esc(s.artist) + "</small>" : "") + "</li>"
      ).join("") + "</ul>";
    }
  }

  root.innerHTML = html;
})();
