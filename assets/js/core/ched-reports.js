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
      subtitle: 'Academic Year ' + ay,
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
          return [i + 1, a.title, a.category, M.formatDateRange(a.dateStart, a.dateEnd), venueCell(a),
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
    var orgs = M.db().organizations.slice().sort(function (a, b) { return a.acronym.localeCompare(b.acronym); });
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
      subtitle: 'Academic Year ' + ay,
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
          orgs.filter(function (o) { return !M.isAccredited(o); }).length + ' recognized only)'],
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
            M.formatDateRange(a.dateStart, a.dateEnd), venueCell(a), participants(a), budgetCell(a), reportsCell(a)];
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

  function render(rep) {
    return '<div class="report-letterhead">' +
        '<img src="' + (window.SASO_BASE || '../../') + 'assets/img/saso-logo-print.jpg" class="letterhead-seal" alt="">' +
        '<div class="report-institution">Republic of the Philippines</div>' +
        '<div class="report-college">CAMARINES SUR POLYTECHNIC COLLEGES</div>' +
        '<div class="report-institution">Nabua, Camarines Sur</div>' +
        '<div class="report-office">STUDENT AFFAIRS AND SERVICES OFFICE</div>' +
      '</div>' +
      '<h2 class="report-title">' + esc(rep.title) + '</h2>' +
      '<div class="report-period">' + esc(rep.subtitle) + '</div>' +
      '<div class="report-scope">Format basis: ' + esc(rep.reference) + '</div>' +
      '<table class="doc-table">' + rep.header.map(function (f) {
        return '<tr><th>' + esc(f[0]) + '</th><td>' + esc(cellText(f[1])) + '</td></tr>';
      }).join('') + '</table>' +
      rep.sections.map(function (sec) {
        return '<h3 class="doc-subhead">' + esc(sec.heading) + '</h3>' +
          '<div class="report-scroll top-scroll">' + table(sec) + '</div>';
      }).join('') +
      '<div class="sig-grid sig-grid-3">' + rep.signatories.map(function (s) {
        return '<div class="sig-block"><span class="sig-caption">' + esc(s.caption) + '</span>' +
          '<div class="sig-name">' + esc(s.name || '') + '</div>' +
          '<div class="sig-role">' + esc(s.role || '') + '</div>' +
          '<div class="sig-date">Date: ______________</div></div>';
      }).join('') + '</div>' +
      '<div class="report-stamp">PROTOTYPE: NOT AN OFFICIAL INSTITUTIONAL DOCUMENT · ' +
        'Layout follows ' + esc(C.CHED_REFERENCE.SAS) + '; match to the template SASO submits to CHED · ' +
        'Generated ' + M.formatDate(new Date()) + '</div>';
  }

  /* CSV written in the browser with a Blob; no server involved. */
  function downloadCsv(rep) {
    function cell(v) {
      var s = cellText(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
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
    lines.push('');
    lines.push(cell('PROTOTYPE: NOT AN OFFICIAL INSTITUTIONAL DOCUMENT'));

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
    render: render,
    downloadCsv: downloadCsv,
    conducted: conducted,
    reportsComplete: reportsComplete,
    participants: participants
  };
})();
