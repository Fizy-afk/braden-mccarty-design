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

  function bubbleHtml(b) {
    const icon = b.favicon === false
      ? esc(b.icon || "↗")
      : '<img src="' + esc(faviconUrl(b.url)) + '" alt="" width="26" height="26" data-fallback="' + esc(b.icon || "↗") + '">';
    return '<a class="bubble" href="' + esc(b.url) + '" title="' + esc(b.label) + '">' +
      '<span class="bubble-icon" aria-hidden="true">' + icon + "</span>" +
      '<span class="bubble-label">' + esc(b.label) + "</span></a>";
  }

  function renderBookmarks() {
    const all = (settings.links || []).concat(custom);
    $("#bookmarks").innerHTML = all.map(bubbleHtml).join("") +
      '<button class="bubble add" type="button" data-action="add-shortcut">' +
      '<span class="bubble-icon" aria-hidden="true">+</span><span class="bubble-label">add</span></button>';
  }

  // No icon (or only a tiny blurry one)? Use the emoji instead.
  function useFallback(img) {
    img.replaceWith(document.createTextNode(img.getAttribute("data-fallback") || "↗"));
  }
  $("#bookmarks").addEventListener("error", (e) => { if (e.target.tagName === "IMG") useFallback(e.target); }, true);
  $("#bookmarks").addEventListener("load", (e) => {
    if (e.target.tagName === "IMG" && e.target.naturalWidth < 32) useFallback(e.target);
  }, true);

  function renderShortcutList() {
    $("#sc-list").innerHTML = custom.length
      ? custom.map((b, i) =>
        "<li><span>" + esc(b.label) + " <small>" + esc(hostOf(b.url)) + "</small></span>" +
        '<button class="x" type="button" data-remove="' + i + '" aria-label="remove ' + esc(b.label) + '">×</button></li>'
      ).join("")
      : '<li class="empty">nothing added yet ✿</li>';
  }

  $("#shortcut-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl = $("#sc-name"), urlEl = $("#sc-url");
    const url = withScheme(urlEl.value.trim());
    if (!LOOKS_LIKE_URL.test(url)) {
      urlEl.setCustomValidity("that doesn't look like a link");
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
    const btn = $("#copy-home");
    const done = () => { btn.textContent = "copied ✓"; setTimeout(() => { btn.textContent = "copy link"; }, 2000); };
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

  const shouldNag = !openedAsHome && !viaHomeLink && !store.get(HOME_SET_KEY, false) && !store.get(HOME_NEVER_KEY, false);

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

    const rm = e.target.closest("[data-remove]");
    if (rm) {
      custom.splice(Number(rm.getAttribute("data-remove")), 1);
      store.set(BOOKMARKS_KEY, custom);
      renderBookmarks();
      renderShortcutList();
    }
  });

  /* ---------- go ---------- */
  renderBookmarks();
  if (shouldNag) {
    setTimeout(() => openDialog(homeDialog), 500);
  } else if (window.matchMedia("(pointer: fine)").matches) {
    searchInput.focus({ preventScroll: true }); // ready to type, like a new tab
  }
})();
