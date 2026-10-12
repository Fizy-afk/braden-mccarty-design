/* ============================================================================
   • ๔คภภเкคร ฬгl๔ • — the lock
   Her schedule, name and links are encrypted (data/private.js). The password
   turns into the key that unlocks them, right here in the browser. Nothing is
   sent anywhere and the password itself isn't stored on GitHub.
   Once a device gets it right, it keeps the key and never asks again
   (Settings → Lock this device makes it forget).

   After unlocking, this file loads the rest of the site in order.
   ============================================================================ */
(function () {
  "use strict";

  const VERSION = "6";
  const KEY_STORE = "wrld.deviceKey";
  const BOOT = [
    "data/vibes.js",
    "js/core.js",
    "js/fx.js",
    "js/app.js",
    "js/home.js",
    "js/canvas.js",
    "js/notes.js",
    "js/settings.js",
    "js/sidebar.js",
    "js/edit.js",
    "js/vibes.js"
  ];

  const $ = (sel) => document.querySelector(sel);
  const root = document.documentElement;
  const subtle = window.crypto && window.crypto.subtle;

  // not picky about capitals, commas or extra spaces
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: asks each visit */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  async function decryptWith(key) {
    const box = window.WRLD_PRIVATE;
    const plain = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function keyFromPassword(password) {
    const box = window.WRLD_PRIVATE;
    const base = await subtle.importKey("raw", new TextEncoder().encode(normalize(password)), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey({ name: "PBKDF2", salt: fromB64(box.salt), iterations: box.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src + "?v=" + VERSION;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Couldn't load " + src));
      document.body.appendChild(s);
    });
  }

  async function boot(data) {
    window.WRLD_SCHEDULE = data.schedule;
    window.WRLD_SETTINGS = data.settings;
    $("#app").hidden = false;
    root.classList.remove("booting", "locked");
    root.classList.add("unlocked");
    for (const src of BOOT) await loadScript(src);
    window.dispatchEvent(new Event("wrld:ready"));
  }

  function showLock() {
    root.classList.remove("booting");
    root.classList.add("locked");
    $("#lock").hidden = false;
    setTimeout(() => $("#lock-input").focus(), 50);
  }

  /* ---------- the form ---------- */
  const form = $("#lock-form");
  const input = $("#lock-input");
  const error = $("#lock-error");

  $("#lock-eye").addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#lock-eye").innerHTML = window.wrldIcon(show ? "eye-off" : "eye");
    $("#lock-eye").setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    const card = $(".lock-card");
    form.classList.add("busy");
    error.textContent = "";
    try {
      const key = await keyFromPassword(input.value);
      const data = await decryptWith(key);
      store.set(KEY_STORE, toB64(await subtle.exportKey("raw", key)));
      card.classList.add("opening");
      if (window.WRLD_SKY) window.WRLD_SKY.shower(10);
      setTimeout(() => { $("#lock").hidden = true; boot(data); }, 650);
    } catch (err) {
      form.classList.remove("busy");
      error.textContent = "That's not quite it. Try again.";
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
      input.select();
    }
  });

  /* ---------- start ---------- */
  (async function start() {
    if (!subtle || !window.WRLD_PRIVATE) {
      showLock();
      error.textContent = !subtle ? "This browser can't unlock the page. Try Chrome or Safari." : "The site's data is missing.";
      form.querySelector("button[type=submit]").disabled = true;
      return;
    }
    const saved = store.get(KEY_STORE);
    if (saved) {
      let data = null;
      try {
        const key = await subtle.importKey("raw", fromB64(saved), { name: "AES-GCM" }, false, ["decrypt"]);
        data = await decryptWith(key);
      } catch (e) {
        store.del(KEY_STORE); // password changed since this device was unlocked
      }
      if (data) { await boot(data); return; }
    }
    showLock();
  })();

  window.WRLD_GATE = {
    lock() { store.del(KEY_STORE); location.reload(); }
  };
})();
