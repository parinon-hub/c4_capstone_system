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
data and compared in the browser. Type a username and password from the table
below on the login screen.

| Username | Password  | Role | Organization |
|---|---|---|---|
| `admin`   | `admin123`   | SASO Administrator | — |
| `aide`    | `aide123`    | SASO Administrator | — |
| `coord`   | `coord123`   | SASO Administrator | — |
| `records` | `records123` | SASO Administrator | — |
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
├── request-account.html           public "Request an account" form (no open sign-up)
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
├── data/seed.js                   5 sample organizations, 11 activities, 2 proposals in the trash bin
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

## Organization accreditation

CSPC records accreditation as a ladder, not a flag: an organization is
**Recognized**, or accredited at **Level I** through **Level IV**, and each
level distinguishes a newly **Accredited** organization from one that has been
**Re-Accredited**. The re-accreditation is the annual renewal the panel asked
us to surface, so the model carries two fields — `accreditationLevel` and
`accreditationType` — plus the academic year and validity date.

The seed carries four accredited organizations (three of them re-accredited),
one recognized-only, and one falling due within 60 days.

## Data provenance

Organization names, acronyms and accreditation levels are taken from the list
of recognized and accredited student organizations published by CSPC for
academic year 2025–2026.

**Everything else is fictional.** Advisers, officers, activities,
requirements, comments, terminal reports and compliance records are invented
for demonstration. No real person is named anywhere in the prototype, and no
real organization's compliance record is represented. The footer on every page
states this, and it is worth saying aloud during the defense before anyone
asks — a panel member seeing a real organization flagged for an overdue
terminal report should know immediately that the record is simulated.

## The approval route

Approval does not end at SASO. On-campus activities are endorsed by SASO to
the VPAA and then to the President; off-campus activities likewise conclude
at the President's office and additionally require the CMO 63 documentation.

SASO is the only office that acts inside this system. The later offices do
not. The prototype therefore **records** the routing — when the papers were
transmitted, to whom, when a decision came back — rather than enacting it.
That is what gives an organization something it currently has no way to see:
where its proposal actually is, and how long it has been there.

`proposalStatus` runs Draft → Submitted → For Review → (Requirements Needed /
Revision Required) → Endorsed by SASO → With VPAA → With President's Office →
Approved.

## Requirements come in two phases

Pre-approval requirements gate SASO's endorsement; post-activity requirements
gate completion. Both use one model with a `phase` field.

Pre-approval, on campus: Permission to Conduct (PTC), Activity Proposal, List
of Participants, Communication Letter, plus optional supporting and excuse
letters. Off campus adds the CMO 63 documentary requirements.

Post-activity: Narrative Report with Documentation, Evaluation, Financial
Report, plus Liquidation where funds were disbursed. These are the three
columns SASO tracks per activity in its master workbook.

## Who may request an activity

Any entity on the SASO roster for the current academic year, whatever its
accreditation level. **Recognized organizations conduct activities too** —
SASO's own January–June activity lists show them doing so, and CSPC-SSC is
seeded as Recognized with two activities to keep that visible.

The accreditation level is not a permission. It records standing, and it is
scored from the reports an organization files *after* its activities. That is
the incentive the compliance workflow rests on: an organization that does not
submit its post-activity reports loses the score that determines its level and
its eligibility for the Most Outstanding Student Organization Award.

## The terminal report rule

Business Rules 7 and 9 live in one function, `model.stageOf()`.

An activity whose event date has passed reads **Awaiting Reports**, not
Completed. **Completed** is produced only when every mandatory post-activity
requirement has been approved — the status is derived from those documents on
every read, never stored, so nothing in the system can set it directly.

SASO policy allows five days after the event. In practice submissions run late
where receipts, class conflicts, or off-campus learning journals intervene, so
overdue is a flag rather than a bar.

---

## What's built, and what isn't

Built now: project structure, AdminLTE integration and CSPC theme, shared
layout and navigation, simulated authentication with role guarding, the client
data model with seed and reset, both dashboards, and — from phase 3 — the
Submit Activity wizard and the organization's My Activities list.

Phase 4 adds Activity Details — one role-aware controller shared by both
portals, carrying the workflow timeline, both requirement checklists, the
approval route record, the query thread and the status history. SASO reviews,
requests documents, endorses and records routing from here; the organization
attaches documents, responds and files its reports.

Phase 5 adds the Requirements module. SASO gets every document in the system
in one filterable queue — by organization, activity, phase and status — with a
review dialog and a reminder action for documents that were never submitted.
The organization gets the same data grouped by activity, outstanding first.

Phase 6 completes the SASO portal: the proposal queue, the master activity
list, and the organizations directory. A shared `listview.js` helper carries
sorting, paging and filter-select population for all of them.

Phase 9 adds the Terminal Reports module. SASO gets a tabbed compliance queue
— Overdue, Not submitted, Under review, Accepted — with per-document review
and a follow-up action. The organization gets a deadline countdown, the three
documents to file, and a place to record the activity outcome (actual
participants, summary, issues) that the accomplishment reports are built from.

Phase 10 adds the Reports module — seven report types generated from live
state, with month/quarter/year presets, an institutional print layout and a
real client-side CSV export. The Consolidated Activity Report and the Category
Activity Report follow the column sets of the workbooks SASO actually keeps,
including the `MONTH:` group rows.

Phase 11 adds the printable documents: Activity Proposal, Permission to
Conduct (R5) and the Terminal Report cover sheet, reachable from any activity.
The R5 carries the full approval route as signature blocks, with the recorded
dates filled in for offices that have already decided and blank rules for those
that have not.

**These layouts are reconstructions, not the official CSPC forms.** Every sheet
says so in print. Obtain the blank R5 from SASO and match the layout to it
before final defense.

Phase 7 adds the notification centre — one role-aware controller for both
portals, grouping notifications by recency (Today / Yesterday / Earlier this
week / Older) with filters by type and unread state, per-item mark-as-read and
dismiss, and mark-all-as-read.

Phase 13 completes the build: a Settings page carrying the office policy
values, the SASO staff accounts, the read-only approval route and requirement
checklists, and the demonstration-data controls; an organization Profile page
showing its own record and accreditation standing; and a responsive pass for
phone-width screens.

Three policy values are editable in Settings and genuinely drive behaviour —
the reporting deadline applied when an activity is marked finished, the number
of days before a proposal is flagged as waiting too long, and the accreditation
renewal warning window.

**Every route in the navigation now resolves to a real page.**

### Editing, deleting and the trash bin

While a proposal is still **under SASO review** (Submitted, For Review,
Requirements Needed, Revision Required), it can be edited or deleted by the
organization that sent it, or by the SASO Head (`admin`), Administrative Aide
(`aide`) and Student Activities Coordinator (`coord`). The Records Officer
keeps view-only access. Once SASO endorses a proposal, it can no longer be
edited or deleted. *This is a prototype assumption made by the researchers,
not a stated SASO rule.* It is declared once, as `PROPOSAL_MANAGERS` in
`config.js`.

- **Edit** appears on the SASO proposal queue, the organization's My
  Activities list and Activity Details. A SASO user must give a reason; for an
  organization the reason is optional. Changing the venue type to or from
  off-campus adds or removes the CMO 63 requirement.
- **Delete** moves the proposal, with its documents, comments, routing and
  history, into the **Trash bin** (button in the list header, with a count).
- In the trash bin, **Restore** returns the proposal to SASO review unchanged.
  **Confirm deletion** removes it permanently. Anything left for **30 days**
  (`TRASH_RETENTION_DAYS`) is permanently deleted automatically the next time
  any page loads.
- Every edit, delete, restore and permanent deletion notifies the
  organization **and** the Head, Aide and Coordinator individually, under a
  new *Proposal edits and deletions* filter in Notifications.

### Organization accounts — no open sign-up

An organization gets an account in one of two ways, and SASO controls both:

1. **Request an account.** From the sign-in screen, a newly recognized
   organization fills in its details (organization, adviser, requesting
   officer, chosen username and password) and attaches its certificate of
   recognition. It receives a reference number (`AR-2026-0004`) and can check
   the request's status on the same page. Signing in before approval says the
   request is still pending; after a decline, it shows SASO's reason.
2. **Add organization.** SASO creates the organization and its account
   directly, from Organizations or Account Requests.

**Account Requests** (SASO sidebar, with a badge for pending requests) is where
the Head (`admin`), Administrative Aide (`aide`) and Coordinator (`coord`)
review each request. Approving records the organization's standing
(Recognized, or Level I–IV and accredited/re-accredited, with its validity
date) and creates the organization and its account in one step. Declining
requires a reason. A request whose acronym or username is already in use
cannot be approved. The Records Officer sees the queue read-only. *Prototype
assumption: the same three staff who manage proposals manage accounts
(`ACCOUNT_MANAGERS` in `config.js`).*

Every request, approval, decline and direct addition notifies the Head, Aide
and Coordinator individually, under a new *Organization accounts* filter in
Notifications. A new organization finds a welcome notification when it first
signs in. The seed includes two pending requests and one declined duplicate.
The requesting organizations are fictional.

The storage key moved to `v4`, so the new sample data loads automatically.

### Scrollbars

Every wide table in the system — Activities, My Activities, Activity
Proposals, Requirements, Terminal Reports, Organizations, the trash bin,
Activity Details, both dashboards and the Reports preview — shows a
**horizontal scrollbar at the top** as well as the bottom, so the user does not
have to scroll to the end of a long list to move sideways. `layout.js` adds it
automatically to every `.table-responsive` (and any `.top-scroll`), keeps it in
sync, and shows it only when the table is wider than the screen.

All scrollbars share **one design** — the page, the tables (top and bottom),
the activity feed, comment thread and status history, and modals — defined
once under *Scrollbars* in `saso-theme.css` (`--sb-*` variables). The navy
sidebar uses the same shape in lighter-on-dark colours. The comment thread and
status history now actually scroll; their `scroll-pane` class had no styles
before.

The **summary tiles** on both dashboards sit in one row that scrolls sideways
instead of wrapping onto several rows. The tiles stretch to fill the row when
they fit; when they do not, the shared scrollbar appears above them and the
edges fade on whichever side has more tiles. Overflow of a few pixels is
ignored, so a bar never appears for nothing.

The storage key moved to `v3`, so the new sample data loads automatically the
first time the updated prototype is opened.

The wizard's requirement checklist is conditional on venue type: choosing
off-campus adds the CMO 63 requirements, and switching back removes them
without discarding attachments already made to the other documents.

Requirement names, activity categories, venue types, the approval route and
the five-day deadline now come from documents and interview answers supplied
by SASO. Each requirement carries a `source` field recording that.

Not built yet: everything from phase 3 onward. Sidebar items for those modules
render greyed with a phase tag, and any link pointing at them resolves to
`pages/coming-soon.html` instead of a broken URL. As each phase lands, set its entry to `0` in the
`PAGES` map in `layout.js` — sidebar rendering and link resolution both read
from that one map.

---

## Before the defense

The CDN links for AdminLTE, Bootstrap, jQuery, Font Awesome and Chart.js
require internet access. If the defense room has none, download those five
files into `assets/vendor/` and change the five `<link>`/`<script>` URLs in
each HTML file. Do this before defense day, not on it.

---

Sample organizations are demonstration data. They are not a claim about the
official roster of student organizations at CSPC.
