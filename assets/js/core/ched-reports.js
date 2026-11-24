/* =========================================================================
   ched-reports.js  -  Report formats aligned with CHED requirements.

   Panel RSC: system-generated reports must contain the information CHED
   requires and follow its prescribed formats. Two reports are built here,
   once, and used by both the Reports module and the Records Archive:

     annual(orgId, ay)     ANNUAL ACCOMPLISHMENT REPORT of one organization
                           for one academic year: the record an organization
                           submits for accreditation and re-accreditation.
     institutional(ay)     REPORT ON STUDENT ORGANIZATIONS AND ACTIVITIES:
                           SASO's institution-wide account of its recognized
                           and accredited organizations and what they did.
     studentActivities(ay, half, orgId)
                           LIST OF STUDENT ACTIVITIES in SASO's own workbook
                           layout (the lists SASO keeps per semester): the
                           same header and columns, grouped by month, with a
                           sheet per category. Downloads as Excel.
     accreditation(orgId, ay)
                           ACCREDITATION AND LEVELING RECORD of one
                           organization: the documentary requirements for
                           accreditation and leveling under CMO No. 9, s. 2013,
                           with what the system already holds for each.

   Basis: CMO No. 9, s. 2013 (Enhanced Policies and Guidelines on Student
   Affairs and Services) requires a system of accreditation, monitoring and
   evaluation of student organizations and their activities; CMO No. 63,
   s. 2017 governs local off-campus activities. The column sets carry the
   items those issuances ask HEIs to keep on record for each activity:
   title, nature, date, venue, objectives, participants, budget and source of
   fund, outcome, and the post-activity documents filed.

   PROTOTYPE NOTE: these are the researchers' layouts built from the CHED
   issuances above. When SASO provides the exact template it submits to the
   CHED Regional Office, match the columns to it here; every screen that
   prints these reports reads them from this one file.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.ched = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var esc = function (v) { return M.escapeHtml(v); };

  var POST = C.REQUIREMENT_TEMPLATES.POST_ACTIVITY;

  function head() {
    return M.db().users.filter(function (u) { return u.username === 'head'; })[0] || null;
  }

  /* Activities that were actually conducted in the academic year. */
  function conducted(ay, orgId) {
    return M.activitiesInYear(ay, orgId).filter(function (a) {
      return a.eventStatus === C.EVENT.FINISHED || a.eventStatus === C.EVENT.ONGOING;
    });
  }

  function participants(a) {
    var o = a.outcome || {};
    return o.actualParticipants || a.expectedParticipants || 0;
  }

  /* "Complete" once every mandatory post-activity document is accepted;
     otherwise names what is still missing. */
  function reportsCell(a) {
    var reqs = M.requirementsFor(a.id, C.PHASE.POST_ACTIVITY);
    if (!reqs.length) { return 'Not yet due'; }
    var mandatory = reqs.filter(function (r) { return r.mandatory; });
    var missing = mandatory.filter(function (r) { return r.status !== C.REQUIREMENT.APPROVED; });
    if (!missing.length) {
      return 'Complete: ' + mandatory.map(function (r) { return shortName(r.name); }).join(', ') + ' accepted';
    }
    return 'Incomplete: ' + missing.map(function (r) {
      return shortName(r.name) + ' (' + M.label(r.status).toLowerCase() + ')';
    }).join(', ');
  }

  function reportsComplete(a) {
    return M.terminalStatus(a) === C.TERMINAL.ACCEPTED;
  }

  function shortName(name) {
    return name.replace(' with Documentation', '');
  }

  /* Off-campus activities show whether the CMO 63 documents were accepted. */
  function venueCell(a) {
    var note = '';
    if (a.venueType === C.VENUE.OFF_CAMPUS) {
      var cmo = M.requirementsFor(a.id, C.PHASE.PRE_APPROVAL).filter(function (r) {
        return /CMO 63/.test(r.name);
      })[0];
      note = cmo && cmo.status === C.REQUIREMENT.APPROVED
        ? '; CMO 63 requirements accepted' : '; CMO 63 requirements not yet accepted';
    }
    return (a.venue || '') + ' (' + M.label(a.venueType) + note + ')';
  }

  function budgetCell(a) {
    if (!a.budget) { return 'None'; }
    return 'PHP ' + a.budget + (a.fundSource ? ' (' + a.fundSource + ')' : '');
  }

  function periodOf(ay) {
    var r = M.academicYearRange(ay);
    return M.formatDate(r.from) + ' to ' + M.formatDate(r.to);
  }

  function preparer(orgId) {
    var accounts = M.accountsForOrg(orgId);
    var pres = accounts.filter(function (u) { return /^President/i.test(u.position || ''); })[0];
    var officer = pres || accounts.filter(function (u) { return !/^Adviser/i.test(u.position || ''); })[0] || accounts[0];
    return officer || null;
  }

  /* ---- 1. Annual Accomplishment Report (one organization, one year) ----------- */

  function annual(orgId, ay) {
    var org = M.orgById(orgId);
    if (!org) { return null; }
    var acts = conducted(ay, orgId);
    var h = head();
    var prep = preparer(orgId);
    var total = acts.reduce(function (s, a) { return s + participants(a); }, 0);
    var complete = acts.filter(reportsComplete).length;
    var offCampus = acts.filter(function (a) { return a.venueType === C.VENUE.OFF_CAMPUS; }).length;

    var cats = {};
    acts.forEach(function (a) { cats[a.category] = (cats[a.category] || 0) + 1; });

    return {
      key: 'annual',
      title: 'ANNUAL ACCOMPLISHMENT REPORT',
      subtitle: ayText(ay),
      reference: C.CHED_REFERENCE.SAS + ' (accreditation, monitoring and evaluation of student ' +
        'organizations); ' + C.CHED_REFERENCE.OFF_CAMPUS + ' for off-campus activities',
      fileName: 'Annual_Accomplishment_Report_' + org.acronym + '_AY' + ay,
      header: [
        ['Name of Organization', org.name],
        ['Acronym', org.acronym],
        ['Type', M.label(org.entityType)],
        ['College / Unit', org.college],
        ['Recognition / Accreditation Status', M.accreditationLabel(org)],
        ['Adviser', org.adviser],
        ['Academic Year', ay],
        ['Period Covered', periodOf(ay)]
      ],
      sections: [{
        heading: 'I. Activities Conducted',
        columns: ['No.', 'Title of Activity', 'Nature / Category', 'Date Conducted', 'Venue',
                  'Objectives', 'No. of Participants', 'Budget and Source of Fund',
                  'Accomplishment / Outcome', 'Post-Activity Reports'],
        rows: acts.map(function (a, i) {
          var o = a.outcome || {};
          return [i + 1, a.title, a.category, M.activityDateText(a), venueCell(a),
            (a.objectives || []).join('; '), participants(a), budgetCell(a),
            o.summary || 'Outcome not yet recorded', reportsCell(a)];
        }),
        totals: acts.length ? ['', 'Total: ' + acts.length + ' activit' + (acts.length === 1 ? 'y' : 'ies'),
          '', '', '', '', total, '', '', complete + ' of ' + acts.length + ' complete'] : null,
        empty: 'No activities were conducted in this academic year.'
      }, {
        heading: 'II. Summary',
        columns: ['Item', 'Count'],
        rows: [
          ['Activities conducted', acts.length],
          ['On campus', acts.filter(function (a) { return a.venueType === C.VENUE.ON_CAMPUS; }).length],
          ['Off campus (' + C.CHED_REFERENCE.OFF_CAMPUS + ')', offCampus],
          ['Online', acts.filter(function (a) { return a.venueType === C.VENUE.ONLINE; }).length],
          ['Total participants', total],
          ['Activities with complete post-activity reports', complete + ' of ' + acts.length]
        ].concat(Object.keys(cats).sort().map(function (k) { return ['Category: ' + k, cats[k]]; }))
      }],
      signatories: [
        { caption: 'Prepared by:', name: prep ? prep.name : '', role: prep ? prep.position : 'Organization Officer' },
        { caption: 'Noted by:', name: org.adviser, role: 'Organization Adviser' },
        { caption: 'Approved by:', name: h ? h.name : '', role: 'Head, Student Affairs and Services Office' }
      ]
    };
  }

  /* ---- 2. Report on Student Organizations and Activities (institution) --------- */

  function institutional(ay) {
    var orgs = M.organizationsForYear(ay).slice().sort(function (a, b) { return a.acronym.localeCompare(b.acronym); });
    var acts = conducted(ay);
    var session = SASO.auth.current();
    var h = head();

    var orgRows = orgs.map(function (o, i) {
      var mine = acts.filter(function (a) { return a.organizationId === o.id; });
      return [i + 1, o.name + ' (' + o.acronym + ')', M.label(o.entityType), o.college,
        M.accreditationLabel(o), o.adviser, mine.length, mine.filter(reportsComplete).length];
    });

    var catRows = C.ACTIVITY_CATEGORIES.map(function (cat) {
      var mine = acts.filter(function (a) { return a.category === cat; });
      function n(v) { return mine.filter(function (a) { return a.venueType === v; }).length; }
      return [cat, n(C.VENUE.ON_CAMPUS), n(C.VENUE.OFF_CAMPUS), n(C.VENUE.ONLINE), mine.length,
        mine.reduce(function (s, a) { return s + participants(a); }, 0)];
    });
    function col(rows, i) { return rows.reduce(function (s, r) { return s + r[i]; }, 0); }

    return {
      key: 'institutional',
      title: 'REPORT ON STUDENT ORGANIZATIONS AND ACTIVITIES',
      subtitle: ayText(ay),
      reference: C.CHED_REFERENCE.SAS + ', Student Development Services: Student Organizations ' +
        'and Activities; ' + C.CHED_REFERENCE.OFF_CAMPUS + ' for off-campus activities',
      fileName: 'Report_on_Student_Organizations_and_Activities_AY' + ay,
      header: [
        ['Higher Education Institution', 'Camarines Sur Polytechnic Colleges, Nabua, Camarines Sur'],
        ['Office', 'Student Affairs and Services Office'],
        ['Academic Year', ay],
        ['Period Covered', periodOf(ay)],
        ['Organizations on record', orgs.length + ' (' +
          orgs.filter(function (o) { return M.isAccredited(o); }).length + ' accredited, ' +
          orgs.filter(function (o) { return !M.isAccredited(o); }).length + ' recognized or on past records only)'],
        ['Activities conducted', acts.length]
      ],
      sections: [{
        heading: 'I. Recognized and Accredited Student Organizations',
        columns: ['No.', 'Organization', 'Type', 'College / Unit', 'Recognition / Accreditation Status',
                  'Adviser', 'Activities Conducted', 'With Complete Post-Activity Reports'],
        rows: orgRows,
        totals: ['', 'Total', '', '', '', '', col(orgRows, 6), col(orgRows, 7)]
      }, {
        heading: 'II. Activities Conducted by Category',
        columns: ['Category', 'On Campus', 'Off Campus (CMO 63)', 'Online', 'Total', 'Participants'],
        rows: catRows,
        totals: ['Total', col(catRows, 1), col(catRows, 2), col(catRows, 3), col(catRows, 4), col(catRows, 5)]
      }, {
        heading: 'III. List of Activities Conducted',
        columns: ['No.', 'Organization', 'Title of Activity', 'Nature / Category', 'Date Conducted',
                  'Venue', 'No. of Participants', 'Budget and Source of Fund', 'Post-Activity Reports'],
        rows: acts.map(function (a, i) {
          return [i + 1, M.orgAcronym(a.organizationId), a.title, a.category,
            M.activityDateText(a), venueCell(a), participants(a), budgetCell(a), reportsCell(a)];
        }),
        empty: 'No activities were conducted in this academic year.'
      }],
      signatories: [
        { caption: 'Prepared by:', name: session ? session.name : '', role: session ? session.position : '' },
        { caption: 'Noted by:', name: h ? h.name : '', role: 'Head, Student Affairs and Services Office' },
        { caption: 'Approved by:', name: '', role: 'College President' }
      ]
    };
  }

  /* ---- 3. List of Student Activities (SASO's workbook layout) ------------------- */

  var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST',
                'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var REPORT_COLS = ['Narrative Report with Documentation', 'Evaluation', 'Financial Report'];
  var LIST_COLUMNS = ['No.', 'Name of Student Organization', 'On/Off', 'Name of Activity', 'Date Conducted',
    'Venue', 'Time Started', 'No. of Participants'].concat(REPORT_COLS)
    .concat(['Budgetary Requirements (Source of Fund)', 'Liquidation / Remarks']);

  /* "/" received, "N/A" not required, blank not received. When none of the
     required reports came in after the deadline, the row reads
     "* NO REPORTS SUBMITTED", as in SASO's list. */
  function reportMarks(a) {
    var reqs = M.requirementsFor(a.id, C.PHASE.POST_ACTIVITY);
    var marks = REPORT_COLS.map(function (name) {
      var r = reqs.filter(function (x) { return x.name === name; })[0];
      if (!r) { return 'N/A'; }
      return r.status === C.REQUIREMENT.NOT_SUBMITTED ? '' : '/';
    });
    var required = marks.filter(function (m) { return m !== 'N/A'; });
    var due = a.reportDeadline && a.reportDeadline < new Date().toISOString().slice(0, 10);
    if (required.length && due && required.every(function (m) { return m === ''; })) {
      marks = marks.map(function (m, i) { return i === 0 ? '* NO REPORTS SUBMITTED' : (m === 'N/A' ? 'N/A' : ''); });
    }
    return marks;
  }

  function liquidationCell(a) {
    if (a.sasoRemarks) { return a.sasoRemarks; }
    var liq = M.requirementsFor(a.id, C.PHASE.POST_ACTIVITY).filter(function (r) { return r.name === 'Liquidation'; })[0];
    if (!liq || !a.budget) { return ''; }
    if (liq.status === C.REQUIREMENT.APPROVED) { return 'Liquidated'; }
    return liq.status === C.REQUIREMENT.NOT_SUBMITTED ? 'For liquidation' : 'Liquidation submitted';
  }

  function time12(t) {
    if (!t) { return ''; }
    var p = String(t).split(':'), h = Number(p[0]);
    if (isNaN(h)) { return t; }
    return (h % 12 || 12) + ':' + (p[1] || '00') + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function listRow(a) {
    var org = M.orgById(a.organizationId) || {};
    var name = (org.name || '') + (org.acronym ? ' (' + org.acronym + ')' : '');
    if (a.sponsor && org.archiveOnly && a.sponsor !== org.name) { name = a.sponsor; }
    var where = a.venueType === C.VENUE.OFF_CAMPUS ? 'Off' : a.venueType === C.VENUE.ONLINE ? 'Online' : 'On';
    var budget = a.budget ? 'PHP ' + a.budget + (a.fundSource ? ' (' + a.fundSource + ')' : '') : (a.fundSource || 'None');
    return [null, name, where, a.title, M.activityDateText(a), a.venue || '', time12(a.timeStart),
      participants(a) || ''].concat(reportMarks(a)).concat([budget, liquidationCell(a)]);
  }

  /* '2023-2024' -> 'AY 2023 - 2024', as on the printed SASO reports. */
  function ayText(ay) { return 'AY ' + String(ay).replace('-', ' - '); }

  function halfRange(ay, half) {
    var r = M.academicYearRange(ay);
    var startYear = Number(String(ay).slice(0, 4));
    if (half === 'first') { return { from: r.from, to: startYear + '-12-31', label: '(July - December)', year: startYear }; }
    if (half === 'second') { return { from: (startYear + 1) + '-01-01', to: r.to, label: '(January - June)', year: startYear + 1 }; }
    return { from: r.from, to: r.to, label: '(July ' + startYear + ' - June ' + (startYear + 1) + ')', year: 'AY ' + ay };
  }

  function months(acts) {
    var groups = [];
    acts.forEach(function (a) {
      var d = new Date(a.dateStart + 'T00:00:00');
      var key = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      var g = groups[groups.length - 1];
      if (!g || g.label !== key) { g = { label: key, rows: [] }; groups.push(g); }
      var row = listRow(a);
      g.rows.push(row);
    });
    var n = 0;
    groups.forEach(function (g) { g.rows.forEach(function (r) { n += 1; r[0] = n; }); });
    return groups;
  }

  function studentActivities(ay, half, orgId) {
    var range = halfRange(ay, half);
    var acts = conducted(ay, orgId || null).filter(function (a) {
      return a.dateStart >= range.from && a.dateStart <= range.to;
    });
    var sheets = [{ name: 'All Activities', groups: months(acts), count: acts.length }];
    C.ACTIVITY_CATEGORIES.forEach(function (cat) {
      var mine = acts.filter(function (a) { return a.category === cat; });
      if (mine.length) { sheets.push({ name: cat, groups: months(mine), count: mine.length }); }
    });
    var off = acts.filter(function (a) { return a.venueType === C.VENUE.OFF_CAMPUS; });
    if (off.length) { sheets.push({ name: 'Off-Campus (CMO 63)', groups: months(off), count: off.length }); }
    var org = orgId ? M.orgById(orgId) : null;
    return {
      key: 'list',
      kind: 'sheets',
      title: 'LIST OF STUDENT ACTIVITIES',
      subtitle: ayText(ay) + (half === 'first' || half === 'second' ? ' ' + range.label : ''),
      lines: ['Republic of the Philippines', 'CAMARINES SUR POLYTECHNIC COLLEGES', 'Nabua, Camarines Sur',
        'STUDENT AFFAIRS AND SERVICES OFFICE', 'Tel no.: (054) 288-4421 to 23 (loc.122)'],
      scope: org ? org.name + ' (' + org.acronym + ')' : 'All student organizations',
      reference: 'SASO list of student activities; ' + C.CHED_REFERENCE.SAS + '; ' + C.CHED_REFERENCE.OFF_CAMPUS,
      fileName: 'List_of_Student_Activities_' + String(range.year).replace(/\s+/g, '') +
        (half === 'first' ? '_Jul-Dec' : half === 'second' ? '_Jan-Jun' : '') + (org ? '_' + org.acronym : ''),
      columns: LIST_COLUMNS,
      sheets: sheets,
      legend: '/ received · N/A not required · * NO REPORTS SUBMITTED: none of the required reports was received after the deadline',
      header: [], sections: [],
      signatories: [
        { caption: 'Prepared by:', name: (SASO.auth.current() || {}).name || '', role: (SASO.auth.current() || {}).position || '' },
        { caption: 'Noted by:', name: (head() || {}).name || '', role: 'Head, Student Affairs and Services Office' }
      ]
    };
  }

  /* ---- 4. Accreditation and leveling record (CMO No. 9, s. 2013) ---------------- */

  function accreditation(orgId, ay) {
    var org = M.orgById(orgId);
    if (!org) { return null; }
    var acts = conducted(ay, orgId);
    var accounts = M.accountsForOrg(orgId);
    var today = new Date().toISOString().slice(0, 10);
    var upcoming = M.everyActivity().filter(function (a) {
      return a.organizationId === orgId && !a.imported && a.proposalStatus !== C.PROPOSAL.DRAFT &&
        a.eventStatus !== C.EVENT.FINISHED && (a.dateStart || '') >= today;
    }).sort(function (x, y) { return (x.dateStart || '').localeCompare(y.dateStart || ''); });
    var complete = acts.filter(reportsComplete).length;
    var withBudget = acts.filter(function (a) { return a.budget; });
    var off = acts.filter(function (a) { return a.venueType === C.VENUE.OFF_CAMPUS; });
    var offOk = off.filter(function (a) {
      if (a.imported) { return true; }
      return M.requirementsFor(a.id, C.PHASE.PRE_APPROVAL).some(function (r) {
        return /CMO 63/.test(r.name) && r.status === C.REQUIREMENT.APPROVED;
      });
    });
    var cats = {};
    acts.forEach(function (a) { cats[a.category] = (cats[a.category] || 0) + 1; });
    var adviserAcc = accounts.filter(function (u) { return /^Adviser/i.test(M.positionTitle(u, orgId)); });
    var officers = accounts.filter(function (u) { return !/^(Member|Adviser)$/i.test(M.positionTitle(u, orgId)); });
    var pct = acts.length ? Math.round(complete / acts.length * 100) : 0;
    var h = head(), prep = preparer(orgId);

    function onFile(ok, how) { return ok ? 'In the system: ' + how : 'To submit to SASO'; }

    return {
      key: 'accreditation',
      title: 'ACCREDITATION AND LEVELING RECORD',
      subtitle: ayText(ay),
      reference: C.CHED_REFERENCE.SAS + ', accreditation, monitoring and evaluation of student organizations ' +
        '(documentary requirements for accreditation and leveling); ' + C.CHED_REFERENCE.OFF_CAMPUS,
      fileName: 'Accreditation_and_Leveling_' + org.acronym + '_AY' + ay,
      header: [
        ['Name of Organization', org.name],
        ['Acronym', org.acronym],
        ['Type', M.label(org.entityType)],
        ['College / Unit', org.college],
        ['Current Accreditation / Level', M.accreditationLabel(org)],
        ['Adviser', org.adviser],
        ['Academic Year', ay],
        ['Period Covered', periodOf(ay)]
      ],
      sections: [{
        heading: 'I. Documentary Requirements for Accreditation',
        columns: ['No.', 'Requirement', 'Status', 'Source'],
        rows: [
          [1, 'Letter of application for accreditation / re-accreditation', 'To submit to SASO', 'Signed by the president and adviser'],
          [2, 'Constitution and By-Laws', 'To submit to SASO', 'Ratified copy'],
          [3, 'List of officers and members with program and college', onFile(accounts.length, accounts.length + ' personal accounts'), 'Section II'],
          [4, 'Letter of acceptance of the adviser', onFile(false), adviserAcc.length ? 'Adviser account: ' + adviserAcc.map(function (u) { return u.name; }).join(', ') : 'No adviser account yet'],
          [5, 'Accomplishment report of the previous academic year', onFile(acts.length, acts.length + ' activities conducted'), 'Section III'],
          [6, 'Financial statement / liquidation of funds', onFile(withBudget.length, withBudget.length + ' activities with a budget'), 'Section IV'],
          [7, 'Plan of activities for the coming academic year', onFile(upcoming.length, upcoming.length + ' activities filed'), 'Section V'],
          [8, 'Post-activity reports of every activity conducted', complete + ' of ' + acts.length + ' complete', 'Section III']
        ]
      }, {
        heading: 'II. Officers and Members',
        columns: ['No.', 'Name', 'Position', 'Program', 'College', 'Email address'],
        rows: accounts.map(function (u, i) {
          return [i + 1, u.name, M.positionTitle(u, orgId), u.program || '', u.college || '', u.email || ''];
        }),
        empty: 'No member accounts yet.'
      }, {
        heading: 'III. Accomplishments (activities conducted)',
        columns: ['No.', 'Title of Activity', 'Category', 'Date Conducted', 'Venue', 'No. of Participants', 'Post-Activity Reports'],
        rows: acts.map(function (a, i) {
          return [i + 1, a.title, a.category, M.activityDateText(a), venueCell(a), participants(a), reportsCell(a)];
        }),
        empty: 'No activities were conducted in this academic year.'
      }, {
        heading: 'IV. Financial Statement',
        columns: ['No.', 'Activity', 'Budget (PHP)', 'Source of Fund', 'Financial Report', 'Liquidation / Remarks'],
        rows: withBudget.map(function (a, i) {
          return [i + 1, a.title, a.budget, a.fundSource || '', reportMarks(a)[2] === '/' ? 'Received' : 'Not received', liquidationCell(a)];
        }),
        empty: 'No activity in this academic year carried a budget.'
      }, {
        heading: 'V. Plan of Activities',
        columns: ['No.', 'Activity', 'Category', 'Target Date', 'Venue', 'Status'],
        rows: upcoming.map(function (a, i) {
          return [i + 1, a.title, a.category, M.activityDateText(a), venueCell(a), M.label(a.proposalStatus)];
        }),
        empty: 'No upcoming activities are filed yet.'
      }, {
        heading: 'VI. Leveling Indicators',
        columns: ['Indicator', 'Value'],
        rows: [
          ['Activities conducted', acts.length],
          ['Categories covered', Object.keys(cats).length + (Object.keys(cats).length ? ' (' + Object.keys(cats).sort().map(function (k) { return k + ' ' + cats[k]; }).join(', ') + ')' : '')],
          ['Total participants', acts.reduce(function (s, a) { return s + participants(a); }, 0)],
          ['Post-activity report compliance', complete + ' of ' + acts.length + ' (' + pct + '%)'],
          ['Off-campus activities with CMO 63 requirements', offOk.length + ' of ' + off.length],
          ['Officers with personal accounts', officers.length],
          ['Members with personal accounts', accounts.length - officers.length - adviserAcc.length]
        ],
        note: 'SASO assigns the level from these indicators and the documents in Section I.'
      }],
      signatories: [
        { caption: 'Prepared by:', name: prep ? prep.name : '', role: prep ? M.positionTitle(prep, orgId) : 'Organization Officer' },
        { caption: 'Noted by:', name: org.adviser, role: 'Organization Adviser' },
        { caption: 'Evaluated by:', name: h ? h.name : '', role: 'Head, Student Affairs and Services Office' }
      ]
    };
  }

  /* ---- rendering ----------------------------------------------------------------- */

  function cellText(v) { return v === null || v === undefined ? '' : String(v); }

  function table(sec) {
    if (!sec.rows.length) {
      return '<p class="text-sm doc-muted">' + esc(sec.empty || 'No records.') + '</p>';
    }
    return '<table class="report-table"><thead><tr>' +
      sec.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      sec.rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + esc(cellText(c)) + '</td>'; }).join('') + '</tr>';
      }).join('') +
      (sec.totals ? '<tr class="report-total">' + sec.totals.map(function (c) {
        return '<td>' + esc(cellText(c)) + '</td>'; }).join('') + '</tr>' : '') +
      '</tbody></table>';
  }

  /* CSPC seal, institution lines and SASO logo, shared by every report. */
  function letterhead() {
    var img = (window.SASO_BASE || '../../') + 'assets/img/';
    return '<div class="report-letterhead">' +
        '<img src="' + img + 'cspc-seal.png" class="letterhead-logo" alt="CSPC seal">' +
        '<div class="letterhead-text">' +
          '<div class="report-institution">Republic of the Philippines</div>' +
          '<div class="report-college">CAMARINES SUR POLYTECHNIC COLLEGES</div>' +
          '<div class="report-institution">Nabua, Camarines Sur</div>' +
          '<div class="report-office">STUDENT AFFAIRS AND SERVICES OFFICE</div>' +
        '</div>' +
        '<img src="' + img + 'saso-logo-print.jpg" class="letterhead-logo" alt="SASO logo">' +
      '</div>';
  }

  function renderSheet(rep, idx) {
    var sh = rep.sheets[idx || 0];
    var body = !sh.count
      ? '<p class="text-sm doc-muted">No activities were conducted in this period.</p>'
      : '<table class="report-table sal-table"><thead><tr>' +
          rep.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          sh.groups.map(function (g) {
            return '<tr class="report-group"><td colspan="' + rep.columns.length + '">MONTH: ' + esc(g.label) + '</td></tr>' +
              g.rows.map(function (r) {
                return '<tr>' + r.map(function (c, i) {
                  var cls = i >= 8 && i <= 10 ? ' class="text-center' + (/NO REPORTS/.test(c) ? ' text-danger font-weight-bold' : '') + '"' : '';
                  return '<td' + cls + '>' + esc(cellText(c)) + '</td>';
                }).join('') + '</tr>';
              }).join('');
          }).join('') + '</tbody></table>';
    return letterhead() +
      '<h2 class="report-title">' + esc(rep.title) + '</h2>' +
      '<div class="report-period">' + esc(rep.subtitle) + '</div>' +
      '<div class="report-scope">' + esc(rep.scope) + ' · Sheet: ' + esc(sh.name) + ' · ' + sh.count +
        ' activit' + (sh.count === 1 ? 'y' : 'ies') + '</div>' +
      '<div class="report-scroll top-scroll">' + body + '</div>' +
      '<div class="text-sm doc-muted mt-2">' + esc(rep.legend) + '</div>' +
      '<div class="sig-grid sig-grid-2">' + rep.signatories.map(function (s) {
        return '<div class="sig-block"><span class="sig-caption">' + esc(s.caption) + '</span>' +
          '<div class="sig-name">' + esc(s.name || '') + '</div>' +
          '<div class="sig-role">' + esc(s.role || '') + '</div></div>';
      }).join('') + '</div>';
  }

  function render(rep, idx) {
    if (rep.kind === 'sheets') { return renderSheet(rep, idx); }
    return letterhead() +
      '<h2 class="report-title">' + esc(rep.title) + '</h2>' +
      '<div class="report-period">' + esc(rep.subtitle) + '</div>' +
      '<div class="report-scope">Format basis: ' + esc(rep.reference) + '</div>' +
      '<table class="doc-table">' + rep.header.map(function (f) {
        return '<tr><th>' + esc(f[0]) + '</th><td>' + esc(cellText(f[1])) + '</td></tr>';
      }).join('') + '</table>' +
      rep.sections.map(function (sec) {
        return '<h3 class="doc-subhead">' + esc(sec.heading) + '</h3>' +
          '<div class="report-scroll top-scroll">' + table(sec) + '</div>' +
          (sec.note ? '<p class="text-sm doc-muted">' + esc(sec.note) + '</p>' : '');
      }).join('') +
      '<div class="sig-grid sig-grid-3">' + rep.signatories.map(function (s) {
        return '<div class="sig-block"><span class="sig-caption">' + esc(s.caption) + '</span>' +
          '<div class="sig-name">' + esc(s.name || '') + '</div>' +
          '<div class="sig-role">' + esc(s.role || '') + '</div>' +
          '<div class="sig-date">Date: ______________</div></div>';
      }).join('') + '</div>' +
      '<div class="report-stamp">Format basis: ' + esc(C.CHED_REFERENCE.SAS) + ' · ' +
        'Generated ' + M.formatDate(new Date()) + '</div>';
  }

  function saveBlob(blob, name) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  /* Rows of one worksheet, as arrays, with the merges and widths to apply. */
  function sheetAoa(rep, sh) {
    var aoa = [], merges = [], cols = rep.columns ? rep.columns.length : 4;
    function title(text) { merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: cols - 1 } }); aoa.push([text]); }
    if (rep.kind === 'sheets') {
      rep.lines.forEach(title);
      aoa.push([]);
      title(rep.title); title(rep.subtitle); title(rep.scope);
      aoa.push([]);
      aoa.push(rep.columns.slice());
      sh.groups.forEach(function (g) {
        title('MONTH: ' + g.label);
        g.rows.forEach(function (r) { aoa.push(r.map(function (c) { return c === null ? '' : c; })); });
      });
      if (!sh.count) { aoa.push(['No activities were conducted in this period.']); }
      aoa.push([]);
      aoa.push(['Legend: ' + rep.legend]);
    } else {
      cols = Math.max.apply(null, rep.sections.map(function (s) { return s.columns.length; }).concat([2]));
      ['Republic of the Philippines', 'CAMARINES SUR POLYTECHNIC COLLEGES', 'Nabua, Camarines Sur',
       'STUDENT AFFAIRS AND SERVICES OFFICE'].forEach(title);
      aoa.push([]);
      title(rep.title); title(rep.subtitle); title('Format basis: ' + rep.reference);
      aoa.push([]);
      rep.header.forEach(function (f) { aoa.push([f[0], cellText(f[1])]); });
      rep.sections.forEach(function (sec) {
        aoa.push([]);
        title(sec.heading);
        aoa.push(sec.columns.slice());
        sec.rows.forEach(function (r) { aoa.push(r.slice()); });
        if (!sec.rows.length && sec.empty) { aoa.push([sec.empty]); }
        if (sec.totals) { aoa.push(sec.totals.slice()); }
        if (sec.note) { aoa.push([sec.note]); }
      });
    }
    aoa.push([]);
    rep.signatories.forEach(function (s) { aoa.push([s.caption, s.name || '', s.role || '']); });
    var widths = [];
    for (var c = 0; c < cols; c += 1) { widths.push({ wch: c === 0 ? 6 : 22 }); }
    if (rep.kind === 'sheets') { widths = [6, 36, 7, 40, 18, 28, 11, 12, 14, 11, 11, 30, 30].map(function (w) { return { wch: w }; }); }
    return { aoa: aoa, merges: merges, widths: widths };
  }

  /* Excel workbook (SheetJS). The list of student activities gets one sheet
     per category, like SASO's own workbook. */
  function downloadXlsx(rep) {
    if (!window.XLSX) { downloadCsv(rep); return false; }
    var wb = window.XLSX.utils.book_new();
    var sheets = rep.kind === 'sheets' ? rep.sheets : [{ name: rep.key === 'accreditation' ? 'Accreditation' : 'Report' }];
    var used = {};
    sheets.forEach(function (sh) {
      var built = sheetAoa(rep, sh);
      var ws = window.XLSX.utils.aoa_to_sheet(built.aoa);
      ws['!merges'] = built.merges;
      ws['!cols'] = built.widths;
      var name = sh.name.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31);
      while (used[name]) { name = name.slice(0, 28) + ' ' + (Object.keys(used).length + 1); }
      used[name] = true;
      window.XLSX.utils.book_append_sheet(wb, ws, name);
    });
    window.XLSX.writeFile(wb, rep.fileName.replace(/[^A-Za-z0-9_-]+/g, '_') + '.xlsx');
    return true;
  }

  /* Puts a report in a card with Excel, CSV and Print, and sheet tabs when
     the report has sheets. Used by the Reports page and the Records Archive. */
  function mount(host, rep, opts) {
    opts = opts || {};
    var idx = 0;
    var tabs = rep.kind === 'sheets'
      ? '<div class="card-body border-bottom py-2 no-print"><div class="btn-group btn-group-sm flex-wrap" id="sheetTabs">' +
          rep.sheets.map(function (s, i) {
            return '<button type="button" class="btn btn-outline-primary' + (i === 0 ? ' active' : '') + '" data-sheet="' + i + '">' +
              esc(s.name) + ' <span class="badge badge-light ml-1">' + s.count + '</span></button>';
          }).join('') + '</div></div>'
      : '';
    host.innerHTML = '<div class="card">' +
      '<div class="card-header no-print"><h3 class="card-title">' + esc(opts.title || 'Preview') + '</h3>' +
        '<div class="card-tools">' +
          '<button type="button" class="btn btn-sm btn-success mr-1" data-rep="xlsx"><i class="fa-solid fa-file-excel mr-1"></i>Download Excel</button>' +
          '<button type="button" class="btn btn-sm btn-outline-primary mr-1" data-rep="csv"><i class="fa-solid fa-file-csv mr-1"></i>CSV</button>' +
          '<button type="button" class="btn btn-sm btn-primary" data-rep="print"><i class="fa-solid fa-print mr-1"></i>Print</button>' +
        '</div></div>' + tabs +
      '<div class="card-body"><div class="report-doc doc-sheet' + (rep.kind === 'sheets' ? ' is-wide' : '') + '" id="reportDoc">' +
        render(rep, 0) + '</div></div></div>';
    function enhance() { if (SASO.layout.enhanceTopScroll) { SASO.layout.enhanceTopScroll(host); } }
    enhance();
    host.querySelectorAll('[data-sheet]').forEach(function (b) {
      b.addEventListener('click', function () {
        idx = Number(this.getAttribute('data-sheet'));
        host.querySelectorAll('[data-sheet]').forEach(function (x) { x.classList.toggle('active', x === b); });
        host.querySelector('#reportDoc').innerHTML = render(rep, idx);
        enhance();
      });
    });
    host.querySelector('[data-rep="print"]').addEventListener('click', function () {
      document.body.classList.add('printing-report');
      window.print();
      document.body.classList.remove('printing-report');
    });
    host.querySelector('[data-rep="csv"]').addEventListener('click', function () {
      downloadCsv(rep, idx); SASO.layout.toast('CSV exported.');
    });
    host.querySelector('[data-rep="xlsx"]').addEventListener('click', function () {
      SASO.layout.toast(downloadXlsx(rep) ? 'Excel workbook downloaded.' : 'Excel is unavailable offline, so a CSV was saved instead.');
    });
  }

  /* CSV written in the browser with a Blob; no server involved. */
  function downloadCsv(rep, sheetIdx) {
    function cell(v) {
      var s = cellText(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    if (rep.kind === 'sheets') {
      var sh = rep.sheets[sheetIdx || 0];
      var out = sheetAoa(rep, sh).aoa.map(function (r) { return r.map(cell).join(','); });
      saveBlob(new Blob([out.join('\n')], { type: 'text/csv;charset=utf-8;' }),
        rep.fileName.replace(/[^A-Za-z0-9_-]+/g, '_') + (sheetIdx ? '_' + sh.name.replace(/[^A-Za-z0-9]+/g, '_') : '') + '.csv');
      return;
    }
    var lines = [cell('CAMARINES SUR POLYTECHNIC COLLEGES - STUDENT AFFAIRS AND SERVICES OFFICE'),
      cell(rep.title), cell(rep.subtitle), cell('Format basis: ' + rep.reference), ''];
    rep.header.forEach(function (f) { lines.push([f[0], f[1]].map(cell).join(',')); });
    rep.sections.forEach(function (sec) {
      lines.push('');
      lines.push(cell(sec.heading));
      lines.push(sec.columns.map(cell).join(','));
      sec.rows.forEach(function (r) { lines.push(r.map(cell).join(',')); });
      if (sec.totals) { lines.push(sec.totals.map(cell).join(',')); }
    });
    lines.push('');
    rep.signatories.forEach(function (s) { lines.push([s.caption, s.name, s.role].map(cell).join(',')); });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = rep.fileName.replace(/[^A-Za-z0-9_-]+/g, '_') + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  return {
    annual: annual,
    institutional: institutional,
    studentActivities: studentActivities,
    accreditation: accreditation,
    downloadXlsx: downloadXlsx,
    mount: mount,
    render: render,
    downloadCsv: downloadCsv,
    conducted: conducted,
    reportsComplete: reportsComplete,
    participants: participants
  };
})();
