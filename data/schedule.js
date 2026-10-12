/* ============================================================================
   HER SCHEDULE: Glendale High School (Springfield Public Schools) + Ozarks Tech
   School year 2026–2027

   HOW IT WORKS
   - Glendale runs red/blue days. Red = odd periods (1, 3, 5, 7) and
     blue = even periods (2, 4, 6, 8).
   - The color alternates every day school is in session. Weekends and the
     noSchool days below are skipped, so the rotation just picks back up on the
     next school day.
   - The hub switches to a class `switchEarlyMinutes` before it starts. She can
     tap any class to pull it up instead.
   - If a red/blue day is ever wrong (snow day, etc.), she can tap the day badge
     at the top of the page to flip it. That fixes every day after it too.

   EDITING
   - Times are 24-hour "HH:MM". Days: mon tue wed thu fri.
   - Each class has `rotation: "red"` or `"blue"`. Leave it out for every day.
   - Resources are the buttons on the class card: { label, url, icon }.
   ============================================================================ */

window.WRLD_SCHEDULE = {
  school: "Glendale High School",
  switchEarlyMinutes: 15,

  rotation: {
    anchor: { date: "2026-10-12", day: "blue" }, // Mon Oct 12, 2026 is a blue day
    firstDay: "2026-08-25",
    lastDay: "2027-05-27"
  },

  // Students-out days from the official SPS 2026–27 district calendar.
  noSchool: [
    { date: "2026-09-07", label: "Labor Day" },
    { date: "2026-10-23", label: "professional day" },
    { date: "2026-11-02", label: "professional day" },
    { date: "2026-11-03", label: "election day" },
    { from: "2026-11-25", to: "2026-11-27", label: "fall break" },
    { from: "2026-12-21", to: "2027-01-04", label: "winter break" },
    { date: "2027-01-18", label: "MLK Day" },
    { date: "2027-02-15", label: "Presidents Day" },
    { from: "2027-03-15", to: "2027-03-19", label: "spring break" },
    { date: "2027-03-22", label: "professional day" },
    { date: "2027-04-06", label: "election day" }
  ],

  // Shown under "coming up" on the week card.
  milestones: [
    { date: "2026-10-22", label: "end of quarter 1" },
    { date: "2026-12-18", label: "end of quarter 2 + semester 1" },
    { date: "2027-03-12", label: "end of quarter 3" },
    { date: "2027-05-27", label: "last day of school 🎓" }
  ],

  classes: [
    {
      id: "alg2",
      name: "Algebra II",
      short: "Algebra II",
      emoji: "📐",
      color: "#b48ef0",
      period: 1,
      rotation: "red",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "08:10", end: "09:35" },
        { days: ["wed"], start: "08:40", end: "10:10" }
      ],
      resources: [
        { label: "Canvas", url: "https://springfieldpublicschools.instructure.com", icon: "📚" },
        { label: "Desmos calculator", url: "https://www.desmos.com/calculator", icon: "🧮" },
        { label: "Khan Academy", url: "https://www.khanacademy.org/math/algebra2", icon: "🎓" }
      ]
    },
    {
      id: "forensics",
      name: "Forensics II",
      short: "Forensics",
      emoji: "🔬",
      color: "#9de0c8",
      period: 2,
      rotation: "blue",
      notes: "SCI Research & Design: Forensics II",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "08:10", end: "09:35" },
        { days: ["wed"], start: "08:40", end: "10:10" }
      ],
      resources: [
        { label: "Canvas", url: "https://springfieldpublicschools.instructure.com", icon: "📚" },
        { label: "lab notes", url: "https://drive.google.com", icon: "🧪" },
        { label: "flashcards", url: "https://quizlet.com", icon: "🃏" }
      ]
    },
    {
      id: "aplit",
      name: "AP English Literature",
      short: "AP Lit",
      emoji: "📖",
      color: "#f4a7d8",
      period: 3,
      rotation: "red",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "09:40", end: "11:08" },
        { days: ["wed"], start: "10:10", end: "11:40" }
      ],
      resources: [
        { label: "Canvas", url: "https://springfieldpublicschools.instructure.com", icon: "📚" },
        { label: "AP Classroom", url: "https://apclassroom.collegeboard.org", icon: "🅰️" },
        { label: "LitCharts", url: "https://www.litcharts.com", icon: "🔖" },
        { label: "Purdue OWL", url: "https://owl.purdue.edu/owl/", icon: "✍️" }
      ]
    },
    {
      id: "apgov",
      name: "AP Government",
      short: "AP Gov",
      emoji: "🏛️",
      color: "#8fb8f7",
      period: 4,
      rotation: "blue",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "09:40", end: "11:08" },
        { days: ["wed"], start: "10:10", end: "11:40" }
      ],
      resources: [
        { label: "Canvas", url: "https://springfieldpublicschools.instructure.com", icon: "📚" },
        { label: "AP Classroom", url: "https://apclassroom.collegeboard.org", icon: "🅰️" },
        { label: "AP Gov course page", url: "https://apstudents.collegeboard.org/courses/ap-united-states-government-and-politics", icon: "🏛️" },
        { label: "Khan Academy", url: "https://www.khanacademy.org/humanities/ap-us-government-and-politics", icon: "🎓" }
      ]
    },

    /* ⚠ OTC: start times are a guess (right after period 3/4 ends), and the
       day ends around 3pm. Swap in her real Ozarks Tech class names and times
       if you want them split out. */
    {
      id: "otc-red",
      name: "Ozarks Tech · periods 5 & 7",
      short: "OTC 5/7",
      emoji: "🦅",
      color: "#f7c98f",
      period: 5,
      rotation: "red",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "11:15", end: "15:00" },
        { days: ["wed"], start: "11:45", end: "15:00" }
      ],
      resources: [
        { label: "MyOTC", url: "https://ozarkstech.edu/myotc", icon: "🦅" },
        { label: "OTC library", url: "https://ozarkstech.edu/student-life/academic-support/library/", icon: "📚" },
        { label: "OTC calendar", url: "https://ozarkstech.edu/student-life/get-involved/calendar/", icon: "📅" }
      ]
    },
    {
      id: "otc-blue",
      name: "Ozarks Tech · periods 6 & 8",
      short: "OTC 6/8",
      emoji: "🦅",
      color: "#f7c98f",
      period: 6,
      rotation: "blue",
      meetings: [
        { days: ["mon", "tue", "thu", "fri"], start: "11:15", end: "15:00" },
        { days: ["wed"], start: "11:45", end: "15:00" }
      ],
      resources: [
        { label: "MyOTC", url: "https://ozarkstech.edu/myotc", icon: "🦅" },
        { label: "OTC library", url: "https://ozarkstech.edu/student-life/academic-support/library/", icon: "📚" },
        { label: "OTC calendar", url: "https://ozarkstech.edu/student-life/get-involved/calendar/", icon: "📅" }
      ]
    }
  ]
};
