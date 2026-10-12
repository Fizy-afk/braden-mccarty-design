# • ๔คภภเкคร ฬгl๔ •

A private hub and Chrome home page, made as a gift.

## Privacy
- **Password:** the page asks for a password once per device. After that, the device remembers it (Settings → Lock this device makes it forget).
- **Encrypted data:** the personal data (schedule, name, links) is in `data/private.js`, encrypted with AES-256-GCM. The key comes from the password (PBKDF2, 250k rounds). Without the password that file is unreadable, and the password itself isn't stored anywhere in this repo.
- **Readable source stays off GitHub:** the readable versions of the private data live in a folder that's never uploaded. Its build script makes `data/private.js`.
- **Device-only data:** notes, to-dos, shortcuts, layout and settings are saved only in the browser on each device. Settings → Download backup / Restore a backup moves them between devices.

## Features
- **Sidebar (like Opera's):** a rail on the left, or a dock along the bottom on phones.
  - **Spotify:** the real Spotify player lives in a panel and keeps playing when the panel closes. There's a library of saved playlists, albums and songs.
  - **sportsYou:** opens in a slim window docked beside the page, because sportsYou blocks being shown inside other sites.
  - **Jumps:** buttons that go straight to each section.
  - Both logos are their real logos, drawn in the accent color.
- **Search and shortcuts:** a search bar (Google, DuckDuckGo or Bing) with shortcut bubbles under it.
- **Right now:** the current class, with a live countdown, resource buttons and a school-day dial.
- **Classes:** class cards with resource bubbles. Each one can link to its own Canvas course, either by hand or with the "Find my classes" bookmark.
- **This week:** a calendar of the week, plus "Coming up" and a to-do list.
- **Notes:** an Apple Notes-style notes app with checklists. Notes can be imported from Apple Notes by copy/paste or as files.
- **Settings (gear icon):** name, color, starfield, motion, clock, search engine, which sections show, backup, and locking the device.
- **Edit mode:** hold down on anything. Items wiggle, sections, cards and shortcuts can be dragged into a new order and snap into place, and the − badge hides something.
- **Background:** a live starfield, shooting stars, cards that light up and tilt, and a sparkle when a to-do is checked off.

## Code map
| File | Job |
|---|---|
| `js/gate.js` | Password lock, decrypts the private data, then loads everything else |
| `js/prefs.js` | Settings + layout storage, toasts |
| `js/core.js` | Schedule engine |
| `js/app.js` | Right now, dial, class cards, week, coming up, to-dos |
| `js/home.js` | Search, shortcut bubbles, home-page popup |
| `js/canvas.js` | Canvas links and "Find my classes" |
| `js/notes.js` | Notes and Apple Notes import |
| `js/settings.js` | The settings panel, backup / restore |
| `js/edit.js` | Hold-to-edit mode: wiggle, drag and snap, hide |
| `js/sidebar.js` | The sidebar rail, Spotify + sportsYou panels |
| `js/sky.js`, `js/fx.js` | Starfield, card glow and tilt, title wave, sparkles |
| `js/icons.js` | Bundled Lucide icons |
| `data/vibes.js`, `js/vibes.js`, `css/vibes.css` | Shows & music. See `LLM_INSTRUCTIONS.md` |

## Updating
- Push changes to `main`. GitHub Pages republishes in about a minute.
- When a CSS or JS file changes, bump its `?v=` number. Those are in `index.html` for the files it loads directly, and `VERSION` in `js/gate.js` for the rest, so browsers fetch the new copy.
