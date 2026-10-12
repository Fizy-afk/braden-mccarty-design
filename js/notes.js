/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — Notes
   Apple Notes-style: a list on the left, the note on the right, and the first
   line of a note is its title. Saves as she types (on this device).

   Importing from Apple Notes: Apple doesn't let websites read Notes, so she
   either copies a note and pastes it in (formatting comes along), or exports
   notes as files (e.g. with the free "Exporter" Mac app) and picks them here.
   Everything coming in is cleaned first: only text and simple formatting
   survive — no scripts, no images.
   ============================================================================ */
(function () {
  "use strict";

  const NOTES_KEY = "wrld.notes";
  const icon = window.wrldIcon;
  const $ = (sel) => document.querySelector(sel);
  const root = $("#notes");
  if (!root) return;

  const listEl = $("#notes-list");
  const editor = $("#note-editor");
  const status = $("#note-status");

  /* ---------- storage ---------- */
  let notes = [];
  try { notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch (e) { notes = []; }
  function persist() {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return true;
    } catch (e) {
      window.wrldToast("This device is out of space for notes. Try removing a big one.");
      return false;
    }
  }
  const newId = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- cleaning anything that comes in ---------- */
  const KEEP = new Set(["P", "DIV", "BR", "B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "A", "BLOCKQUOTE", "PRE", "CODE", "HR"]);
  const RENAME = { H4: "H3", H5: "H3", H6: "H3", STRIKE: "S", DEL: "S", TT: "CODE", TR: "DIV", SECTION: "DIV", ARTICLE: "DIV" };
  const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "PICTURE", "SVG", "VIDEO", "AUDIO", "CANVAS", "BUTTON", "SELECT", "TEXTAREA", "FORM", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE"]);

  function sanitize(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html || ""); // template content is inert: nothing runs or loads
    const out = document.createElement("div");
    (function walk(src, dst) {
      src.childNodes.forEach((node) => {
        if (node.nodeType === 3) { dst.appendChild(document.createTextNode(node.nodeValue)); return; }
        if (node.nodeType !== 1) return;
        let tag = node.tagName.toUpperCase();
        if (tag === "INPUT") {
          // Apple-style checklists sometimes arrive as <li><input type=checkbox>
          if (node.type === "checkbox" && dst.tagName === "LI") {
            dst.setAttribute("data-check", "1");
            if (node.checked || node.hasAttribute("checked")) dst.setAttribute("data-done", "true");
          }
          return;
        }
        if (DROP.has(tag)) return;
        if (RENAME[tag]) tag = RENAME[tag];
        if (!KEEP.has(tag)) { walk(node, dst); return; } // unknown wrapper: keep what's inside
        const el = document.createElement(tag);
        if (tag === "A") {
          const href = node.getAttribute("href") || "";
          if (/^(https?:|mailto:)/i.test(href)) { el.setAttribute("href", href); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
        }
        if (tag === "UL" && /check/i.test(node.getAttribute("class") || "")) el.className = "checklist";
        if (tag === "LI" && (node.getAttribute("data-done") === "true" || /\b(done|checked)\b/i.test(node.getAttribute("class") || ""))) el.setAttribute("data-done", "true");
        walk(node, el);
        dst.appendChild(el);
      });
    })(tpl.content, out);
    out.querySelectorAll("li[data-check]").forEach((li) => {
      li.removeAttribute("data-check");
      const ul = li.closest("ul");
      if (ul) ul.className = "checklist";
    });
    return out.innerHTML;
  }

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // plain text / Markdown -> simple HTML (lists, checklists, headings, bold, italic, links)
  function textToHtml(text, markdown) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    let html = "", list = null;
    const close = () => { if (list) { html += list === "ol" ? "</ol>" : "</ul>"; list = null; } };
    const open = (kind) => {
      if (list === kind) return;
      close();
      html += kind === "ol" ? "<ol>" : kind === "check" ? '<ul class="checklist">' : "<ul>";
      list = kind;
    };
    const inline = (s) => {
      s = escHtml(s);
      if (!markdown) return s;
      return s
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<i>$2</i>")
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    };
    lines.forEach((line) => {
      let m;
      if ((m = line.match(/^\s*(?:[-*+•]\s*)?\[( |x|X)\]\s+(.*)$/))) {
        open("check");
        html += "<li" + (m[1] !== " " ? ' data-done="true"' : "") + ">" + inline(m[2]) + "</li>";
      } else if ((m = line.match(/^\s*[-*+•◦▪]\s+(.*)$/))) {
        open("ul");
        html += "<li>" + inline(m[1]) + "</li>";
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        open("ol");
        html += "<li>" + inline(m[1]) + "</li>";
      } else {
        close();
        if (markdown && (m = line.match(/^(#{1,3})\s+(.*)$/))) html += "<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">";
        else html += line.trim() ? "<div>" + inline(line) + "</div>" : "<div><br></div>";
      }
    });
    close();
    return html;
  }

  /* ---------- reading a note ---------- */
  const BLOCK_END = /<\/(div|p|li|h[1-3]|blockquote|pre)>|<br\s*\/?>|<(ul|ol|hr)[^>]*>/gi;
  function linesOf(html) {
    const t = document.createElement("textarea");
    t.innerHTML = String(html || "").replace(BLOCK_END, "\n").replace(/<[^>]+>/g, "");
    return t.value.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  const titleOf = (n) => linesOf(n.html)[0] || "New note";
  const previewOf = (n) => linesOf(n.html).slice(1).join(" ").slice(0, 100) || "No additional text";
  const isEmpty = (n) => !linesOf(n.html).length;

  function when(ts) {
    const d = new Date(ts), now = new Date();
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    const time = window.WRLD ? window.WRLD.fmtClock(d.getHours() * 60 + d.getMinutes()) : d.toLocaleTimeString();
    if (days === 0) return time;
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  }

  /* ---------- the list ---------- */
  let currentId = null;
  let query = "";

  function sorted() {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !q || linesOf(n.html).join(" ").toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated);
  }

  function renderList() {
    const items = sorted();
    root.classList.toggle("is-empty", !notes.length);
    if (!items.length) {
      listEl.innerHTML = notes.length ? '<li class="empty">' + icon("search-x") + "Nothing matches.</li>" : "";
      return;
    }
    let lastPinned = null;
    listEl.innerHTML = items.map((n) => {
      let head = "";
      if (lastPinned !== !!n.pinned) {
        lastPinned = !!n.pinned;
        if (items.some((x) => x.pinned)) head = '<li class="notes-group">' + (n.pinned ? "Pinned" : "Notes") + "</li>";
      }
      return head + '<li><button class="note-item' + (n.id === currentId ? " active" : "") + '" type="button" data-note="' + n.id + '">' +
        '<span class="ni-title">' + (n.pinned ? icon("pin") : "") + escHtml(titleOf(n)) + "</span>" +
        '<span class="ni-meta"><time>' + escHtml(when(n.updated)) + "</time>" + escHtml(previewOf(n)) + "</span></button></li>";
    }).join("");
  }

  /* ---------- the editor ---------- */
  const current = () => notes.find((n) => n.id === currentId) || null;

  function dropIfEmpty(id) {
    const n = notes.find((x) => x.id === id);
    if (n && isEmpty(n)) { notes = notes.filter((x) => x.id !== id); persist(); }
  }

  function openNote(id, focusEnd) {
    if (currentId && currentId !== id) dropIfEmpty(currentId);
    currentId = id;
    const n = current();
    root.classList.toggle("has-note", !!n);
    root.classList.toggle("open-note", !!n);
    if (n) {
      editor.innerHTML = sanitize(n.html);
      $("#note-pin").setAttribute("aria-pressed", String(!!n.pinned));
      status.textContent = "Edited " + when(n.updated);
      if (focusEnd) {
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editor.innerHTML = "";
    }
    renderList();
  }

  function newNote(html) {
    const now = Date.now();
    const n = { id: newId(), html: html || "", created: now, updated: now, pinned: false };
    notes.unshift(n);
    persist();
    query = "";
    $("#notes-q").value = "";
    openNote(n.id, true);
    return n;
  }

  let saveTimer = null;
  function scheduleSave() {
    status.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    const n = current();
    if (!n) return;
    n.html = editor.innerHTML;
    n.updated = Date.now();
    if (persist()) status.textContent = "Saved";
    renderList();
  }

  editor.addEventListener("input", scheduleSave);
  editor.addEventListener("blur", () => { if (saveTimer) saveNow(); });
  window.addEventListener("pagehide", () => { if (saveTimer) saveNow(); });

  // pasting: clean it, keep simple formatting
  editor.addEventListener("paste", (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();
    const html = cd.getData("text/html");
    const clean = html ? sanitize(html) : textToHtml(cd.getData("text/plain"), false);
    document.execCommand("insertHTML", false, clean);
  });

  // checklist boxes: tap the circle to tick an item
  editor.addEventListener("click", (e) => {
    const li = e.target.closest && e.target.closest("ul.checklist > li");
    if (!li || !editor.contains(li)) return;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left > 28) return;
    if (li.getAttribute("data-done") === "true") li.removeAttribute("data-done");
    else li.setAttribute("data-done", "true");
    scheduleSave();
  });

  /* ---------- formatting toolbar ---------- */
  function listAtCaret() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    const list = node && node.closest ? node.closest("ul, ol") : null;
    return list && editor.contains(list) ? list : null;
  }
  function blockAtCaret() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    const b = node && node.closest ? node.closest("h1, h2, h3, div, p, li") : null;
    return b && editor.contains(b) && b !== editor ? b : null;
  }

  const COMMANDS = {
    bold: () => document.execCommand("bold"),
    italic: () => document.execCommand("italic"),
    bullets: () => document.execCommand("insertUnorderedList"),
    numbers: () => document.execCommand("insertOrderedList"),
    heading: () => {
      const b = blockAtCaret();
      document.execCommand("formatBlock", false, b && /^H[1-3]$/.test(b.tagName) ? "div" : "h2");
    },
    checklist: () => {
      const list = listAtCaret();
      if (list && list.classList.contains("checklist")) { document.execCommand("insertUnorderedList"); return; }
      if (!list || list.tagName !== "UL") document.execCommand("insertUnorderedList");
      const ul = listAtCaret();
      if (ul) ul.classList.add("checklist");
    }
  };

  const bar = $(".notes-bar");
  bar.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-cmd]")) e.preventDefault(); }); // keep the caret where it is
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cmd]");
    if (!b || !current()) return;
    editor.focus();
    COMMANDS[b.getAttribute("data-cmd")]();
    scheduleSave();
  });

  $("#note-pin").addEventListener("click", () => {
    const n = current();
    if (!n) return;
    n.pinned = !n.pinned;
    persist();
    $("#note-pin").setAttribute("aria-pressed", String(n.pinned));
    renderList();
  });

  $("#note-delete").addEventListener("click", () => {
    const n = current();
    if (!n) return;
    const index = notes.indexOf(n);
    notes = notes.filter((x) => x !== n);
    persist();
    const next = sorted()[0];
    currentId = null;
    openNote(next ? next.id : null);
    if (!next) root.classList.remove("open-note");
    window.wrldToast('Deleted "' + titleOf(n) + '"', {
      action: "Undo",
      onAction() { notes.splice(index, 0, n); persist(); openNote(n.id); }
    });
  });

  $("#note-new").addEventListener("click", () => newNote());
  $("#note-first").addEventListener("click", () => newNote());
  $("#note-back").addEventListener("click", () => {
    if (saveTimer) saveNow();
    root.classList.remove("open-note");
    if (currentId) dropIfEmpty(currentId);
    renderList();
  });
  listEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-note]");
    if (b) { if (saveTimer) saveNow(); openNote(b.getAttribute("data-note")); }
  });
  $("#notes-q").addEventListener("input", (e) => { query = e.target.value; renderList(); });

  /* ---------- importing ---------- */
  const importDialog = $("#notes-import");
  const pasteBox = $("#ni-paste");
  let importedCount = 0;

  function openImport() {
    importedCount = 0;
    $("#ni-count").textContent = "";
    pasteBox.innerHTML = "";
    $("#ni-add").disabled = true;
    window.wrldDialog.open(importDialog);
  }

  pasteBox.addEventListener("paste", (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();
    const html = cd.getData("text/html");
    const clean = html ? sanitize(html) : textToHtml(cd.getData("text/plain"), false);
    document.execCommand("insertHTML", false, clean);
    $("#ni-add").disabled = !pasteBox.textContent.trim();
  });
  pasteBox.addEventListener("input", () => { $("#ni-add").disabled = !pasteBox.textContent.trim(); });

  $("#ni-add").addEventListener("click", () => {
    const html = sanitize(pasteBox.innerHTML);
    if (!linesOf(html).length) return;
    const now = Date.now();
    notes.unshift({ id: newId(), html, created: now, updated: now, pinned: false });
    persist();
    importedCount++;
    pasteBox.innerHTML = "";
    $("#ni-add").disabled = true;
    $("#ni-count").textContent = importedCount + (importedCount === 1 ? " note added" : " notes added") + ". Paste another, or close.";
    renderList();
    if (window.wrldBurst) { const r = $("#ni-add").getBoundingClientRect(); window.wrldBurst(r.left + r.width / 2, r.top + r.height / 2); }
  });

  async function importFiles(files) {
    const added = [];
    for (const file of Array.from(files || [])) {
      if (file.size > 2 * 1024 * 1024) continue; // skip anything huge
      const name = file.name.replace(/\.[^.]+$/, "");
      const text = await file.text();
      let html;
      if (/\.html?$/i.test(file.name) || /html/.test(file.type)) {
        const doc = new DOMParser().parseFromString(text, "text/html");
        html = sanitize(doc.body ? doc.body.innerHTML : text);
      } else {
        html = textToHtml(text, /\.(md|markdown)$/i.test(file.name) || /markdown/.test(file.type) || /^\s*(#|- \[)/m.test(text));
      }
      const first = (linesOf(html)[0] || "").toLowerCase();
      if (name && first !== name.toLowerCase() && !first.includes(name.toLowerCase())) html = "<div>" + escHtml(name) + "</div>" + html;
      if (!linesOf(html).length) continue;
      const ts = file.lastModified || Date.now();
      added.push({ id: newId(), html, created: ts, updated: ts, pinned: false });
    }
    if (!added.length) { window.wrldToast("Couldn't read any notes from those files."); return; }
    notes = added.concat(notes);
    persist();
    window.wrldDialog.close(importDialog);
    openNote(added[0].id);
    window.wrldToast("Imported " + added.length + (added.length === 1 ? " note" : " notes"));
  }

  $("#ni-files").addEventListener("change", (e) => { importFiles(e.target.files); e.target.value = ""; });
  const drop = $("#ni-drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("over")));
  drop.addEventListener("drop", (e) => { e.preventDefault(); importFiles(e.dataTransfer.files); });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-notes-import]")) openImport();
  });

  /* ---------- go ---------- */
  const first = sorted()[0];
  if (first && window.matchMedia("(min-width: 760px)").matches) openNote(first.id);
  else renderList();

  window.WRLD_NOTES = { openImport, newNote, sanitize };
})();
