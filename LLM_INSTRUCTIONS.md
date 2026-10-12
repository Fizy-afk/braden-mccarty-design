# Instructions for the "vibes" LLM

You are building the **shows + music** section of **• ๔คภภเкคร ฬгl๔ •** ("dannikas wrld"). It's a personal hub site a guy made for his girlfriend. The rest of the site already exists and works. Your job is only the **vibes** section (the "Vibes" section near the bottom of the page).

**The page is password-protected.**
- Ask the owner for the password to test it locally, and never write it into any file.
- Your files (`data/vibes.js`, `js/vibes.js`, `css/vibes.css`) are not encrypted, so they can't hold anything private.
- They load after the page unlocks. Your script runs after the rest of the page is built.

## What the site is
- A plain static site with no build step, no framework and no npm. It's hosted on GitHub Pages and also works when you double-click `index.html`.
- **Don't use ES modules** (`type="module"`) or `fetch()` of local JSON files, because they break when the page is opened from a folder. Data is loaded as plain `<script>` files that set a `window.*` global.
- **Look:** a dark night sky with a live starfield. Her favorite color is the lavender in `--wrld` (`#b48ef0`). It should look designed, not generated:
  - real line icons, no emoji
  - Instrument Serif for headings, Geist for text, Geist Mono for small labels and numbers
  - thin hairline borders, restrained color
- She loves **Juice WRLD**. The site already uses his "999" motif (background watermark, the footer button that makes shooting stars rain). Lean into that on the music side.

## Files you own (edit freely)
| File | Purpose |
|---|---|
| `data/vibes.js` | The content: `window.WRLD_VIBES = { shows, music }`. The schema is documented at the top of the file. You may reshape it. |
| `js/vibes.js` | Renders `WRLD_VIBES` into `<div id="vibes-root">`. A bare starter is there now. Rewrite it however you like. |
| `css/vibes.css` | Styles for the section. **Scope every rule under `.vibes`.** |
| `index.html`, only between `VIBES` and `END VIBES` | You may change the markup inside `<section id="vibes">`. Keep its `sec-head` header (with the `sec-num` span) and its `data-key="vibes"` attribute. Edit mode uses them to move and number sections. |

## Icons
`wrldIcon("music")` returns a ready `<svg>` (Lucide line icons, bundled in `js/icons.js`). In HTML you can also write `<span data-icon="music"></span>`. Icons already available: tv, music, headphones, play, heart, star, sparkles, moon-star, and more (see the keys in `js/icons.js`).

If you need an icon that isn't there, add its `<path>` markup from lucide.dev to the end of the `ICONS` map in `js/icons.js`. That's the only change you may make to that file.

## Files you must NOT edit
`css/styles.css`, `js/gate.js`, `js/prefs.js`, `js/app.js`, `js/core.js`, `js/home.js`, `js/canvas.js`, `js/notes.js`, `js/settings.js`, `js/edit.js`, `js/sky.js`, `js/fx.js`, `data/private.js`, `manifest.webmanifest`, `icons/`, and everything in `index.html` outside the VIBES block.

To add a new file of yours (say `js/vibes-player.js`), ask the owner. Scripts are loaded by `js/gate.js` after unlocking, not by `index.html`.

Those files run:
- the class schedule, day dial, class cards and week calendar
- the Google search bar and shortcut bubbles
- the Canvas linking
- the starfield
- the popups

Also avoid:
- Global CSS selectors (`body`, `h2`, `a`, `.panel`, `.spot`, `.tilt`, `.hero`, `.course`, `.bubble`, `.blk`, `.arc`, `.modal` without `.vibes` in front)
- Global JS variables. Keep your code inside the existing IIFE in `js/vibes.js`.
- Element IDs that clash with the hub: `sky`, `title`, `app`, `lock*`, `now`, `dial*`, `course-cards`, `week*`, `coming-up`, `todo-*`, `greeting`, `clock*`, `day-badge`, `search*`, `bookmarks`, `nine`, `home-*`, `shortcut-*`, `sc-*`, `canvas-*`, `cv-*`, `bookmarklet*`, `notes*`, `note-*`, `ni-*`, `settings`, `set-*`, `edit-*`
- Using `data-key` on your own elements. Edit mode treats `data-key` as "movable".
- Your own `localStorage` keys: start them with `wrld.vibes.` so backups include them.
- Matching the accent: use `var(--wrld)` and `color-mix(in srgb, var(--wrld) 20%, transparent)` rather than hard-coded lavender. She can change the accent in Settings.
- Extra `<dialog>` popups or anything that opens on page load. The hub already has its own popups.

## Things you can reuse
- `class="panel"` on a box gives the standard card. `#vibes-root` already is one.
- Add `spot` to a card for the cursor-following glow. It uses `--c` for the color if you set it.
- Add `tilt` to a card for the 3D lean on hover.
- `window.wrldBurst(x, y)` makes a sparkle burst at a screen position.
- `window.WRLD_SKY.shower(12)` makes shooting stars rain.

## Design tokens (from css/styles.css)
```
--wrld        #b48ef0  her lavender (main accent)
--wrld-soft   #d7c4fb  lighter lavender
--wrld-deep   #7b55c7  deeper purple
--pink        #f2a7d6  secondary accent
--text        #f2ecff  body text
--muted       #a99dc4  secondary text
--faint       #6f6489  tertiary text, labels
--line / --line-2      hairline borders
--surface / --surface-2  inner tile backgrounds
--card                 card background
--ink         #150c28  text on lavender
--radius 20px / --radius-sm 12px
--font (Geist)  --mono (Geist Mono)  --serif (Instrument Serif)
--ease  the site's easing curve
```

## Ideas (optional)
- **Shows:** poster cards with "where to watch" and a "currently watching" or "comfort rewatch" tag.
- **Music:** a Juice WRLD feature block with 999 styling, Spotify embeds (`https://open.spotify.com/embed/...` in an `<iframe>`), and her top songs or playlists.
- **Small touches:** a "song of the day" picked from the list based on the date. A play button could trigger `wrldBurst`.

## Rules
- Mobile first. It has to look right at 375px wide with no sideways scrolling.
- Respect `prefers-reduced-motion`.
- **Don't paste song lyrics** (copyright). Titles, artists, links and embeds are fine.
- Only use images you link to from official sources (for example, posters from the streaming service) or that the user gives you.
- To test, open `index.html` in a browser, check the console for errors, and make sure the rest of the hub still works.
