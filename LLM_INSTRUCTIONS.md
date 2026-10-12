# Instructions for the "vibes" LLM

You are building the **shows + music** section of **• ๔คภภเкคร ฬгl๔ •** ("dannikas wrld"). It's a personal hub site a guy made for his girlfriend. The rest of the site already exists and works. Your job is only the **vibes** section.

## What the site is
- A plain static site with no build step, no framework and no npm. It's hosted on GitHub Pages and also works when you double-click `index.html`.
- **Don't use ES modules** (`type="module"`) or `fetch()` of local JSON files, because they break when the page is opened from a folder. Data is loaded as plain `<script>` files that set a `window.*` global.
- Dark purple night-sky look. Her favorite color is the lavender in `--wrld` (`#b48ef0`).
- She loves **Juice WRLD**. The site already uses his "999" motif (background watermark, footer). Lean into that on the music side.

## Files you own (edit freely)
| File | Purpose |
|---|---|
| `data/vibes.js` | The content: `window.WRLD_VIBES = { shows, music }`. The schema is documented at the top of the file. You may reshape it. |
| `js/vibes.js` | Renders `WRLD_VIBES` into `<div id="vibes-root">`. A bare starter is there now. Rewrite it however you like. |
| `css/vibes.css` | Styles for the section. **Scope every rule under `.vibes`.** |
| `index.html`, only between `VIBES` and `END VIBES` | You may change the markup inside `<section id="vibes">`. |

## Files you must NOT edit
`css/styles.css`, `js/app.js`, `data/schedule.js`, `data/settings.js`, and everything in `index.html` outside the VIBES block. These run the class-schedule hub.

Also avoid:
- Global CSS selectors (`body`, `h2`, `a`, `.card` without `.vibes` in front)
- Global JS variables. Keep your code inside the existing IIFE in `js/vibes.js`.
- Element IDs that clash with the hub: `now`, `class-chips`, `today-list`, `links`, `todo-*`, `week`, `greeting`, `clock-*`

## Design tokens you can use (from css/styles.css)
```
--wrld        #b48ef0  her lavender (main accent)
--wrld-soft   #d6c2f8  lighter lavender (headings, highlights)
--wrld-deep   #7b55c7  deeper purple
--pink        #f4a7d8  secondary accent
--text        #f3edff  body text
--muted       #b9acd8  secondary text
--surface     rgba(255,255,255,.045)  inner tile background
--card / --card-border                 card glass
--radius 22px / --radius-sm 14px
--font (Outfit)  --font-title (Noto Sans Thai, for the ๔คภภ-style lettering)
```
The section already sits in a `.card`, so it gets the glass panel automatically.

## Ideas (optional)
- Shows: poster cards with "where to watch" and a "currently watching" or "rewatch comfort show" tag
- Music: a Juice WRLD feature block with 999 styling, Spotify embeds (`https://open.spotify.com/embed/...` in an `<iframe>`), and her top songs or playlists
- Small touches: hover glow in `--wrld`, a shuffle "song of the day" picked from the list based on the date

## Rules
- Mobile first. It has to look right at 375px wide with no sideways scrolling.
- Respect `prefers-reduced-motion`.
- **Don't paste song lyrics** (copyright). Titles, artists, links and embeds are fine.
- Only use images you link to from official sources (for example, posters from the streaming service) or that the user gives you.
- To test, open `index.html` in a browser, check the console for errors, and make sure the rest of the hub still works.
