# • ๔คภภเкคร ฬгl๔ •

Her hub and Chrome home page. It shows whatever class she's in right now, with that class's resources, and switches automatically through the day. She can tap any class to pull it up instead.

## What's on the page
- **Search + shortcuts:** a Google search bar with round shortcut bubbles under it. Hover a bubble and click × to remove it. **Edit** opens the full list, where she can add, remove, or bring removed ones back.
- **01 Right now:** the current class with a live countdown and its resource buttons.
- **Day dial:** today's classes drawn as a dial. Hover or tap a class to see it, or click to pull it up.
- **02 Classes:** Canvas-style cards with resource bubbles. **Canvas pages** links each class to its own Canvas page.
- **03 This week:** a calendar of the week, plus "Coming up" (days off, quarter ends) and a to-do list.
- **04 Vibes:** shows and music. Another LLM handles this, see `LLM_INSTRUCTIONS.md`.
- **Little extras:**
  - a live starfield that drifts with the mouse
  - shooting stars (click the empty sky, or the **999** button in the footer)
  - cards that tilt toward the cursor
  - a sparkle when a to-do is checked off
  - hovering a class lights it up everywhere on the page

## Editing
| To change... | Edit |
|---|---|
| Classes, times, red/blue days, days off, resource links | `data/schedule.js` (set up for Glendale 2026–27) |
| Her name in the greeting, default shortcut bubbles | `data/settings.js` |
| Icons | Use names from `js/icons.js` (Lucide). To add one, paste its paths from lucide.dev |
| The purple | `--wrld` at the top of `css/styles.css` |
| Shows & music | Handled by another LLM, see `LLM_INSTRUCTIONS.md` |

## Code map
| File | Job |
|---|---|
| `js/core.js` | Schedule engine: red/blue rotation, days off, current class, manual pick, Canvas links |
| `js/app.js` | Draws the page: right-now card, dial, class cards, week, coming up, to-dos |
| `js/home.js` | Search, shortcut bubbles, home-page popup |
| `js/canvas.js` | Canvas linking and "Find my classes" |
| `js/sky.js` | Starfield background |
| `js/fx.js` | Cursor glow on cards, 3D tilt, title wave, sparkle burst |
| `js/icons.js` | Bundled Lucide icons |

## How the auto-switch works
- It uses the time on her phone or laptop.
- **Red/blue days:** they alternate on every day school is in session. Weekends and the days off in `noSchool` are skipped. That list comes from the official SPS 2026–27 calendar (171 student days).
- **Fixing a wrong day:** if a day is ever wrong (snow day, etc.), she can tap the red/blue badge at the top to flip it. Every day after it shifts too.
- **Next school year:** update `rotation`, `noSchool` and `milestones` in `schedule.js` from the new SPS calendar.
- **Timing:** it switches to a class 15 minutes before it starts (`switchEarlyMinutes` in `schedule.js`).
- **Manual pick:** when she taps a class, the hub stays on it until the schedule moves to the next slot (a class starting or ending) or she taps "Back to schedule".
- **Saved per device:** her pick, to-dos, shortcuts and Canvas links are saved in the browser on that device. They don't sync between phone and laptop.

## Canvas pages
- Each class can link to its own Canvas course. Use **Canvas pages** (in the Classes header), or the **+** bubble on a class card.
- **Find my classes:** websites can't search a laptop, so instead she drags this button to her bookmarks bar and clicks it while she's on Canvas.
  - It reads her active course list from Canvas's own API: just course names and numbers.
  - It comes back to the hub with each class matched. `canvasMatch` in `schedule.js` holds the words it looks for.
  - She checks the matches and hits Save.
- **Linking on every device:** to make links work everywhere, add `canvas: "https://…/courses/123"` to a class in `schedule.js`.

## Home page setup
- **The link:** her home page link is **https://fizy-afk.github.io/dannikas-wrld/?home=1**. A page can't ask Chrome whether it's the home page, so the `?home` part is how the site knows. Opened that way, or as an installed app, the setup popup never shows.
- **The popup:** opened any other way, a popup with Chrome steps for computer, Android and iPhone shows every time. She can close it ("Maybe later"), turn it off ("Don't ask again"), or bring it back from the footer link.
- **As an app:** it can be installed as an app (`manifest.webmanifest` + `icons/`), which opens straight to `?home=1`.

## Live site
**https://fizy-afk.github.io/dannikas-wrld/** is served by GitHub Pages from `main` / root.

To change something, edit the file on GitHub (pencil icon) and commit. The site updates in about a minute. If you change CSS or JS, bump the `?v=` number on its tag in `index.html` so browsers fetch the new copy.

Note: a GitHub Pages site is public to anyone who has the link. `robots.txt` and the page's meta tag tell search engines not to index it, but don't put anything private in `schedule.js`.
