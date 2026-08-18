# CSPC SASO — Student Organization Activity Monitoring
### Web-based front-end prototype · Phase 0–2 foundation

Front-end only. No backend, no database, no server. All state is simulated in
the browser with JavaScript and `localStorage`, in line with Chapters 1–3 and
the panel defense revisions.

---

## Running it

Open `index.html` in Google Chrome. That's it — there is no build step and no
server requirement.

VS Code Live Server also works and is the smoother option while developing.

All scripts are classic `<script>` tags rather than ES modules, specifically so
the prototype still runs when opened directly from the file system. Do not
convert them to `type="module"` — browsers block module loading over `file://`.

---

## Demonstration accounts

Prototype authentication only. Passwords are stored in plain text in the seed
data and compared in the browser. Click any chip on the login screen to fill
the fields.

| Username | Password  | Role | Organization |
|---|---|---|---|
| `admin` | `admin123` | SASO Administrator | — |
| `aide`  | `aide123`  | SASO Administrator | — |
| `jpcs`  | `jpcs123`  | Organization Officer | JPCS |
| `ccs`   | `ccs123`   | Organization Officer | CCS-SC |
| `chs`   | `chs123`   | Organization Officer | CHS-SC |
| `ssc`   | `ssc123`   | Organization Officer | SSC |
| `cas`   | `cas123`   | Organization Officer | CAS-SC |

**Reset demo data** lives in the user menu, top right. Use it before each fresh
walkthrough.

---

## Structure

```
saso-prototype/
├── index.html                     login (simulated authentication)
├── assets/
│   ├── css/saso-theme.css         CSPC institutional layer over AdminLTE
│   └── js/
│       ├── core/
│       │   ├── config.js          all statuses, labels, badge colours, rules
│       │   ├── storage.js         localStorage wrapper, seed and reset
│       │   ├── model.js           lookups, derived stage, statistics
│       │   ├── events.js          status changes → history + notifications
│       │   ├── auth.js            simulated session and route guarding
│       │   └── layout.js          navbar, sidebar, toasts, confirm dialogs
│       └── pages/                 one controller per screen
├── data/seed.js                   5 sample organizations, 11 activities
├── pages/
│   ├── saso/dashboard.html
│   ├── org/dashboard.html
│   └── coming-soon.html           placeholder for later-phase modules
└── documents/                     printable layouts (phase 11)
```

**Rules the codebase follows.** No screen hard-codes a status string — every
one comes from `config.js`. No screen stores a count — every figure is derived
in `model.js`. No screen writes a status directly — everything goes through
`events.changeStatus()`, which writes the status history entry and queues the
notification in the same call. That last rule is why the notification centre
will not need retrofitting in phase 7.

---

## The terminal report rule

Business Rules 7 and 9 live in one function, `model.stageOf()`.

An activity whose event date has passed reads **Awaiting Terminal Report**, not
Completed. Only `terminalReportStatus === ACCEPTED` produces **Completed**.
Nothing else in the system can set that stage. Dashboards, tiles, charts and the
non-compliance table all read from `stageOf()`, so the rule holds everywhere at
once.

---

## What's built, and what isn't

Built now: project structure, AdminLTE integration and CSPC theme, shared
layout and navigation, simulated authentication with role guarding, the client
data model with seed and reset, the SASO dashboard, and the organization
dashboard.

Not built yet: everything from phase 3 onward. Sidebar items for those modules
render greyed with a phase tag, and any link pointing at them resolves to
`pages/coming-soon.html` instead of a broken URL. As each phase lands, add its
page to the `BUILT` map in `layout.js` and set `built: true` on the matching
menu item.

---

## Before the defense

The CDN links for AdminLTE, Bootstrap, jQuery, Font Awesome and Chart.js
require internet access. If the defense room has none, download those five
files into `assets/vendor/` and change the five `<link>`/`<script>` URLs in
each HTML file. Do this before defense day, not on it.

---

Sample organizations are demonstration data. They are not a claim about the
official roster of student organizations at CSPC.
