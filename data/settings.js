/* ============================================================================
   HUB SETTINGS: her name for the greeting + the round shortcut bubbles under
   the search bar.
   Links: { label, url, icon }. Each bubble shows the site's real logo. `icon`
   is the backup if the site doesn't have one: a name from js/icons.js (Lucide),
   e.g. "folder". Add `favicon: false` to always use the icon instead.
   She can add her own bubbles with the "+" bubble (saved per device).
   ============================================================================ */

window.WRLD_SETTINGS = {
  herName: "Dannika",

  links: [
    { label: "Canvas", url: "https://springfieldpublicschools.instructure.com", icon: "book-marked" },
    { label: "Grades", url: "https://homeaccess.sps.org/HomeAccess/Account/LogOn?ReturnUrl=%2fhomeaccess", icon: "chart-column", favicon: false },
    { label: "AP Classroom", url: "https://apclassroom.collegeboard.org", icon: "award" },
    { label: "MyOTC", url: "https://ozarkstech.edu/myotc", icon: "graduation-cap" },
    { label: "Lunch", url: "https://sps.nutrislice.com/menu/glendale-high-school", icon: "utensils" },
    { label: "Calendar", url: "https://glendale.sps.org/fs/pages/5827", icon: "calendar-days" },
    { label: "Drive", url: "https://drive.google.com", icon: "hard-drive" },
    { label: "Spotify", url: "https://open.spotify.com", icon: "music" }
  ]
};
