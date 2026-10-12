# • ๔คภภเкคร ฬгl๔ •

Her hub. It shows whatever class she's in right now, with that class's resources, and switches automatically through the day. She can tap any class to pull it up instead.

## Editing
| To change... | Edit |
|---|---|
| Classes, times, red/blue days, days off, resource links | `data/schedule.js` (set up for Glendale 2026–27) |
| Her name in the greeting, quick links | `data/settings.js` |
| The purple | `--wrld` at the top of `css/styles.css` |
| Shows & music | Handled by another LLM, see `LLM_INSTRUCTIONS.md` |

## How the auto-switch works
- It uses the time on her phone or laptop.
- Red/blue days alternate on every day school is in session. Weekends and the days off in `noSchool` (from the official SPS 2026–27 calendar, 171 student days) are skipped. If a day is ever wrong (snow day, etc.), she can tap the red/blue badge at the top to flip it, and every day after it shifts too.
- Next school year: update `rotation`, `noSchool`, and `milestones` in `schedule.js` from the new SPS calendar.
- It switches to a class 15 minutes before it starts (`switchEarlyMinutes` in `schedule.js`).
- Between classes it shows "free time" with what's next, and a button to open that class's stuff early.
- When she taps a class, the hub stays on it until the schedule moves to the next slot (a class starting or ending) or she taps "back to schedule".
- Her pick and her to-do list are saved in the browser on that device. They don't sync between phone and laptop.

## Live site
**https://fizy-afk.github.io/dannikas-wrld/** is served by GitHub Pages from `main` / root.

To change something, edit the file on GitHub (pencil icon) and commit. The site updates in about a minute.

Note: a GitHub Pages site is public to anyone who has the link. `robots.txt` and the page's meta tag tell search engines not to index it, but don't put anything private in `schedule.js`.
