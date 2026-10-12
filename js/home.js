/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — home page bits
   Google search, the shortcut bubbles under it, and the "make this your home
   page" popup. Default shortcuts live in data/settings.js. Ones she adds are
   saved in this browser.

   Home page detection: a page can't ask the browser if it's the home page, so
   the setup steps use a special link (…/?home=1). If the page opens with
   ?home, or as an installed app, it knows it's home and the popup stays away.
   ============================================================================ */
(function () {
  "use strict";

  const settings = window.WRLD_SETTINGS || {};
  const BOOKMARKS_KEY = "wrld.bookmarks";
  const HIDDEN_KEY = "wrld.hiddenLinks";
  const HOME_SET_KEY = "wrld.homeSet";
  const HOME_NEVER_KEY = "wrld.homeNever";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } }
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hostOf = (url) => { try { return new URL(url).hostname; } catch (e) { return ""; } };
  const withScheme = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u);
  const LOOKS_LIKE_URL = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

  /* ---------- dialogs (shared) ---------- */
  function openDialog(d) {
    if (!d || d.open) return;
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }
  function closeDialog(d) {
    if (!d) return;
    if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
  }

  // click outside the box (on the dimmed backdrop) closes it
  $$("dialog.modal").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeDialog(d);
    });
  });

  /* ---------- search ---------- */
  const searchForm = $("#search");
  const searchInput = $("#search-input");

  searchForm.addEventListener("submit", (e) => {
    const q = searchInput.value.trim();
    if (!q) { e.preventDefault(); return; }
    // looks like a link? go straight there, like Chrome's own box
    if (LOOKS_LIKE_URL.test(q)) {
      e.preventDefault();
      location.href = withScheme(q);
    }
  });

  // "/" jumps to the search box
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
    if (document.querySelector("dialog[open]")) return;
    e.preventDefault();
    searchInput.focus();
  });

  /* ---------- shortcut bubbles ---------- */
  let custom = store.get(BOOKMARKS_KEY, []);
  const faviconUrl = (url) => "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(hostOf(url)) + "&sz=64";

  const icon = (name) => (window.wrldIcon ? window.wrldIcon(name) : "");

  // Every shortcut on the page: the defaults she hasn't removed, then her own.
  let hidden = store.get(HIDDEN_KEY, []);
  function allShortcuts() {
    return (settings.links || [])
      .filter((l) => !hidden.includes(l.url))
      .map((l) => Object.assign({ key: "d:" + l.url }, l))
      .concat(custom.map((l, i) => Object.assign({ key: "c:" + i }, l)));
  }

  function removeShortcut(key) {
    if (key.startsWith("d:")) {
      hidden.push(key.slice(2));
      store.set(HIDDEN_KEY, hidden);
    } else {
      custom.splice(Number(key.slice(2)), 1);
      store.set(BOOKMARKS_KEY, custom);
    }
    renderBookmarks();
    renderShortcutList();
  }

  function bubbleHtml(b) {
    const fallback = b.icon || "globe";
    const art = b.favicon === false
      ? icon(fallback)
      : '<img src="' + esc(faviconUrl(b.url)) + '" alt="" width="24" height="24" data-fallback="' + esc(fallback) + '">';
    return '<span class="bubble-wrap"><a class="bubble" href="' + esc(b.url) + '" title="' + esc(b.label) + '">' +
      '<span class="bubble-icon" aria-hidden="true">' + art + "</span>" +
      '<span class="bubble-label">' + esc(b.label) + "</span></a>" +
      '<button class="bubble-x" type="button" data-unlink="' + esc(b.key) + '" aria-label="Remove ' + esc(b.label) + '" title="Remove">' + icon("x") + "</button></span>";
  }

  function renderBookmarks() {
    $("#bookmarks").innerHTML = allShortcuts().map(bubbleHtml).join("") +
      '<button class="bubble add" type="button" data-action="add-shortcut">' +
      '<span class="bubble-icon" aria-hidden="true">' + icon("plus") + '</span><span class="bubble-label">Edit</span></button>';
  }

  // No logo (or only a tiny blurry one)? Use the line icon instead.
  function useFallback(img) {
    const holder = img.parentNode;
    if (holder) holder.innerHTML = icon(img.getAttribute("data-fallback") || "globe");
  }
  $("#bookmarks").addEventListener("error", (e) => { if (e.target.tagName === "IMG") useFallback(e.target); }, true);
  $("#bookmarks").addEventListener("load", (e) => {
    if (e.target.tagName === "IMG" && e.target.naturalWidth < 32) useFallback(e.target);
  }, true);

  function renderShortcutList() {
    const all = allShortcuts();
    $("#sc-list").innerHTML = all.length
      ? all.map((b) =>
        '<li><span class="sc-name">' + esc(b.label) + " <small>" + esc(hostOf(b.url)) + "</small></span>" +
        '<button class="icon-btn" type="button" data-unlink="' + esc(b.key) + '" aria-label="Remove ' + esc(b.label) + '">' + icon("trash-2") + "</button></li>"
      ).join("")
      : '<li class="empty">No shortcuts. Add one above.</li>';
    $("#sc-restore").hidden = !hidden.length;
  }

  $("#sc-restore").addEventListener("click", () => {
    hidden = [];
    store.set(HIDDEN_KEY, hidden);
    renderBookmarks();
    renderShortcutList();
  });

  $("#shortcut-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl = $("#sc-name"), urlEl = $("#sc-url");
    const url = withScheme(urlEl.value.trim());
    if (!LOOKS_LIKE_URL.test(url)) {
      urlEl.setCustomValidity("That doesn't look like a link");
      urlEl.reportValidity();
      return;
    }
    custom.push({ label: nameEl.value.trim() || hostOf(url), url });
    store.set(BOOKMARKS_KEY, custom);
    e.target.reset();
    renderBookmarks();
    renderShortcutList();
    nameEl.focus();
  });
  $("#sc-url").addEventListener("input", (e) => e.target.setCustomValidity(""));

  /* ---------- "make this your home page" popup ---------- */
  const homeDialog = $("#home-dialog");
  const params = new URLSearchParams(location.search);
  const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const viaHomeLink = params.has("home");

  // iPhones can't set a home page, so only the installed app counts there.
  const openedAsHome = standalone || (viaHomeLink && !isApple);
  if (openedAsHome) store.set(HOME_SET_KEY, true);

  const homeUrl = location.href.split(/[?#]/)[0] + "?home=1";
  $("#home-url").value = homeUrl;
  $("#home-link").href = homeUrl;

  function selectTab(name) {
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    $$(".tab-panel").forEach((p) => { p.hidden = p.dataset.panel !== name; });
  }
  selectTab(isApple ? "iphone" : isAndroid ? "android" : "computer");

  $("#copy-home").addEventListener("click", () => {
    const label = $("#copy-home .copy-label");
    const done = () => { label.textContent = "Copied"; setTimeout(() => { label.textContent = "Copy link"; }, 2000); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(homeUrl).then(done, () => { $("#home-url").select(); });
    } else {
      $("#home-url").select();
      try { document.execCommand("copy"); done(); } catch (err) { /* she can copy it by hand */ }
    }
  });

  $("#home-never").addEventListener("click", () => {
    store.set(HOME_NEVER_KEY, true);
    closeDialog(homeDialog);
  });

  // (skip it when she's just come back from "Find my classes" — that opens its own popup)
  const backFromCanvas = location.hash.startsWith("#canvas=");
  const shouldNag = !openedAsHome && !viaHomeLink && !backFromCanvas && !store.get(HOME_SET_KEY, false) && !store.get(HOME_NEVER_KEY, false);

  /* ---------- clicks ---------- */
  document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close]");
    if (closer) { closeDialog(closer.closest("dialog")); return; }

    const tab = e.target.closest(".tab");
    if (tab) { selectTab(tab.dataset.tab); return; }

    if (e.target.closest('[data-action="home-setup"]')) { openDialog(homeDialog); return; }

    if (e.target.closest('[data-action="add-shortcut"]')) {
      renderShortcutList();
      openDialog($("#shortcut-dialog"));
      $("#sc-name").focus();
      return;
    }

    const rm = e.target.closest("[data-unlink]");
    if (rm) removeShortcut(rm.getAttribute("data-unlink"));
  });

  /* ---------- go ---------- */
  renderBookmarks();
  if (shouldNag) {
    setTimeout(() => openDialog(homeDialog), 500);
  } else if (window.matchMedia("(pointer: fine)").matches) {
    searchInput.focus({ preventScroll: true }); // ready to type, like a new tab
  }
})();
