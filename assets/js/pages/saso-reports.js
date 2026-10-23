/* =========================================================================
   saso-reports.js  —  Automated report generation.

   The column sets below follow the workbooks SASO actually maintains: one
   consolidated list of student activities, and a separate list per activity
   category. Reproducing those structures is the point — the module exists to
   remove the re-typing that produces them, not to invent a new format.

   Every report is computed from current state at the moment it is generated.
   Nothing is stored, so a report can never disagree with the dashboards.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'reports',
    title: 'Reports',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' }, { label: 'Reports' }]
  });
  if (!session) { return; }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  var state = {
    type: 'consolidated',
    period: 'custom',
    from: '', to: '',
    org: '', category: '', stage: '',
    generated: null
  };

  /* ---- helpers ---------------------------------------------------------------- */

  function inRange(dateStr) {
    if (!dateStr) { return false; }
    if (state.from && dateStr < state.from) { return false; }
    if (state.to && dateStr > state.to) { return false; }
    return true;
  }

  function baseActivities() {
    return M.allActivities().filter(function (a) {
      if (a.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
      if (state.org && a.organizationId !== state.org) { return false; }
      if (state.category && a.category !== state.category) { return false; }
      if (state.stage && M.stageOf(a) !== state.stage) { return false; }
      if ((state.from || state.to) && !inRange(a.dateStart)) { return false; }
      return true;
    }).sort(function (x, y) {
      return new Date(x.dateStart || 0) - new Date(y.dateStart || 0);
    });
  }

  function docDate(r, name) {
    var doc = M.requirementsFor(r.id, C.PHASE.POST_ACTIVITY).filter(function (x) {
      return x.name === name;
    })[0];
    if (!doc || doc.status === C.REQUIREMENT.NOT_SUBMITTED) { return ''; }
    return M.formatDate(doc.submittedAt);
  }

  function monthKey(dateStr) {
    if (!dateStr) { return 'Undated'; }
    var d = new Date(dateStr);
    return MONTHS[d.getMonth()].toUpperCase() + ' ' + d.getFullYear();
  }

  /* ---- report definitions --------------------------------------------------------
     Each returns { columns, rows, grouped, note, totals }.
     -------------------------------------------------------------------------------- */

  var REPORTS = {

    /* Mirrors SASO's consolidated LIST OF STUDENT ACTIVITIES workbook. */
    consolidated: {
      label: 'Consolidated Activity Report',
      hint: 'Every activity in the period, with the post-activity documents received. ' +
            'Follows the columns of the consolidated workbook.',
      build: function () {
        var acts = baseActivities();
        return {
          grouped: true,
          columns: ['No.', 'Organization', 'On/Off', 'Activity', 'Date Conducted', 'Venue',
                    'Time Started', 'Participants', 'Narrative Report', 'Evaluation',
                    'Financial Report', 'Budget (Source of Fund)'],
          rows: acts.map(function (a, i) {
            var o = a.outcome || {};
            return {
              group: monthKey(a.dateStart),
              cells: [
                i + 1,
                M.orgAcronym(a.organizationId),
                M.label(a.venueType).replace(' Campus', ''),
                a.title,
                M.formatDateRange(a.dateStart, a.dateEnd),
                a.venue || '',
                a.timeStart || '',
                o.actualParticipants || a.expectedParticipants || '',
                docDate(a, 'Narrative Report with Documentation'),
                docDate(a, 'Evaluation'),
                docDate(a, 'Financial Report'),
                a.budget ? a.budget + (a.fundSource ? ' (' + a.fundSource + ')' : '') : ''
              ]
            };
          })
        };
      }
    },

    /* Mirrors the per-category workbooks. */
    category: {
      label: 'Category Activity Report',
      hint: 'One activity category at a time, in the layout of the per-category workbooks. ' +
            'Choose a category below.',
      build: function () {
        var acts = baseActivities();
        return {
          grouped: true,
          columns: ['No.', 'Organization', 'On/Off', 'Activity', 'Date Conducted',
                    'Venue', 'Time Started', 'Participants'],
          rows: acts.map(function (a, i) {
            var o = a.outcome || {};
            return {
              group: monthKey(a.dateStart),
              cells: [
                i + 1,
                M.orgAcronym(a.organizationId),
                M.label(a.venueType).replace(' Campus', ''),
                a.title,
                M.formatDateRange(a.dateStart, a.dateEnd),
                a.venue || '',
                a.timeStart || '',
                o.actualParticipants || a.expectedParticipants || ''
              ]
            };
          })
        };
      }
    },

    /* The monthly / quarterly / annual accomplishment summary. */
    accomplishment: {
      label: 'Accomplishment Summary',
      hint: 'Counts per organization for the period: the monthly, quarterly and annual ' +
            'summary required by the administration.',
      build: function () {
        var acts = baseActivities();
        var orgs = M.db().organizations.filter(function (o) {
          return !state.org || o.id === state.org;
        });

        var rows = orgs.map(function (o, i) {
          var mine = acts.filter(function (a) { return a.organizationId === o.id; });
          var completed = mine.filter(function (a) { return M.stageOf(a) === C.STAGE.COMPLETED; });
          var pending = mine.filter(function (a) {
            return M.stageOf(a) === C.STAGE.AWAITING_TERMINAL_REPORT;
          });
          var participants = mine.reduce(function (sum, a) {
            var o2 = a.outcome || {};
            return sum + (o2.actualParticipants || a.expectedParticipants || 0);
          }, 0);

          return {
            cells: [
              i + 1, o.acronym, M.accreditationLabel(o), mine.length,
              completed.length, pending.length, participants
            ]
          };
        }).filter(function (r) { return r.cells[3] > 0; });

        var totals = ['', 'TOTAL', '',
          rows.reduce(function (s, r) { return s + r.cells[3]; }, 0),
          rows.reduce(function (s, r) { return s + r.cells[4]; }, 0),
          rows.reduce(function (s, r) { return s + r.cells[5]; }, 0),
          rows.reduce(function (s, r) { return s + r.cells[6]; }, 0)];

        return {
          columns: ['No.', 'Organization', 'Accreditation', 'Activities',
                    'Completed', 'Reports Pending', 'Participants'],
          rows: rows,
          totals: totals
        };
      }
    },

    /* By category, which is how the office files them. */
    categorySummary: {
      label: 'Activity Summary by Category',
      hint: 'How the period breaks down across the nine activity categories.',
      build: function () {
        var acts = baseActivities();
        var rows = C.ACTIVITY_CATEGORIES.map(function (cat, i) {
          var mine = acts.filter(function (a) { return a.category === cat; });
          var participants = mine.reduce(function (sum, a) {
            var o = a.outcome || {};
            return sum + (o.actualParticipants || a.expectedParticipants || 0);
          }, 0);
          var onCampus = mine.filter(function (a) { return a.venueType === C.VENUE.ON_CAMPUS; }).length;
          var offCampus = mine.filter(function (a) { return a.venueType === C.VENUE.OFF_CAMPUS; }).length;
          return { cells: [i + 1, cat, mine.length, onCampus, offCampus,
                           mine.length - onCampus - offCampus, participants] };
        });

        return {
          columns: ['No.', 'Category', 'Activities', 'On Campus', 'Off Campus', 'Online', 'Participants'],
          rows: rows,
          totals: ['', 'TOTAL',
            rows.reduce(function (s, r) { return s + r.cells[2]; }, 0),
            rows.reduce(function (s, r) { return s + r.cells[3]; }, 0),
            rows.reduce(function (s, r) { return s + r.cells[4]; }, 0),
            rows.reduce(function (s, r) { return s + r.cells[5]; }, 0),
            rows.reduce(function (s, r) { return s + r.cells[6]; }, 0)]
        };
      }
    },

    /* The panel's non-compliance request. */
    pendingRequirements: {
      label: 'Pending Requirements Report',
      hint: 'Documents that have not been submitted or that were returned for revision.',
      build: function () {
        var rows = M.allRequirements().filter(function (row) {
          if (row.activity.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
          if (state.org && row.organization.id !== state.org) { return false; }
          if ((state.from || state.to) && !inRange(row.activity.dateStart)) { return false; }
          return row.requirement.status === C.REQUIREMENT.NOT_SUBMITTED ||
                 row.requirement.status === C.REQUIREMENT.NEEDS_REVISION;
        }).filter(function (row) { return row.requirement.mandatory; });

        return {
          columns: ['No.', 'Organization', 'Activity', 'Document', 'Phase', 'Status'],
          rows: rows.map(function (row, i) {
            return { cells: [i + 1, row.organization.acronym, row.activity.title,
                             row.requirement.name, M.label(row.requirement.phase),
                             M.label(row.requirement.status)] };
          })
        };
      }
    },

    /* Finished activities whose reports have not been accepted. */
    compliance: {
      label: 'Terminal Report Compliance',
      hint: 'Finished activities that are not yet completed, with days outstanding. ' +
            'This is the list to follow up on.',
      build: function () {
        var rows = M.reportQueue(state.org || null).filter(function (r) {
          if (r.status === C.TERMINAL.ACCEPTED) { return false; }
          if ((state.from || state.to) && !inRange(r.activity.dateStart)) { return false; }
          return true;
        });

        return {
          columns: ['No.', 'Organization', 'Activity', 'Event Date', 'Due', 'Status',
                    'Days Pending', 'Outstanding Documents'],
          rows: rows.map(function (r, i) {
            return { cells: [
              i + 1, r.organization.acronym, r.activity.title,
              M.formatDateRange(r.activity.dateStart, r.activity.dateEnd),
              M.formatDate(r.activity.reportDeadline),
              M.label(r.status),
              r.daysLate || 0,
              r.missing.map(function (m) { return m.name; }).join('; ')
            ] };
          })
        };
      }
    },

    /* Every activity with all four status tracks. */
    status: {
      label: 'Activity Status Report',
      hint: 'Every activity in the period showing proposal, event, report and overall stage.',
      build: function () {
        var acts = baseActivities();
        return {
          columns: ['No.', 'Organization', 'Activity', 'Date', 'Proposal', 'Now With',
                    'Event', 'Reports', 'Stage'],
          rows: acts.map(function (a, i) {
            var office = M.currentOffice(a.id);
            var ts = M.terminalStatus(a);
            return { cells: [
              i + 1, M.orgAcronym(a.organizationId), a.title,
              M.formatDateRange(a.dateStart, a.dateEnd),
              M.label(a.proposalStatus),
              office ? C.LABEL[office.office] : '',
              a.eventStatus === C.EVENT.NOT_APPLICABLE ? '' : M.label(a.eventStatus),
              ts === C.TERMINAL.NOT_APPLICABLE ? '' : M.label(ts),
              M.label(M.stageOf(a))
            ] };
          })
        };
      }
    }
  };

  /* ---- control pane -------------------------------------------------------------- */

  function renderControls() {
    document.getElementById('controlPane').innerHTML =
      '<div class="card">' +
        '<div class="card-header"><h3 class="card-title">Generate a report</h3></div>' +
        '<div class="card-body">' +
          '<div class="form-group">' +
            '<label for="fType" class="text-sm">Report</label>' +
            '<select class="form-control form-control-sm" id="fType">' +
              Object.keys(REPORTS).map(function (k) {
                return '<option value="' + k + '"' + (state.type === k ? ' selected' : '') + '>' +
                  REPORTS[k].label + '</option>';
              }).join('') +
            '</select>' +
            '<small class="form-text text-muted" id="typeHint"></small>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="text-sm">Period</label>' +
            '<div class="btn-group btn-group-sm d-flex" id="periodBtns">' +
              ['month', 'quarter', 'year', 'custom'].map(function (p) {
                return '<button type="button" class="btn btn-outline-primary' +
                  (state.period === p ? ' active' : '') + '" data-period="' + p + '">' +
                  ({ month: 'Month', quarter: 'Quarter', year: 'Year', custom: 'Custom' })[p] +
                  '</button>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="form-row">' +
            '<div class="form-group col-6">' +
              '<label for="fFrom" class="text-sm">From</label>' +
              '<input type="date" class="form-control form-control-sm" id="fFrom" value="' +
                state.from + '"></div>' +
            '<div class="form-group col-6">' +
              '<label for="fTo" class="text-sm">To</label>' +
              '<input type="date" class="form-control form-control-sm" id="fTo" value="' +
                state.to + '"></div>' +
          '</div>' +

          '<div class="form-group">' +
            '<label for="fOrg" class="text-sm">Organization</label>' +
            '<select class="form-control form-control-sm" id="fOrg"></select></div>' +

          '<div class="form-group" id="categoryGroup">' +
            '<label for="fCategory" class="text-sm">Category</label>' +
            '<select class="form-control form-control-sm" id="fCategory"></select></div>' +

          '<div class="form-group">' +
            '<label for="fStage" class="text-sm">Stage</label>' +
            '<select class="form-control form-control-sm" id="fStage"></select></div>' +

          '<button type="button" class="btn btn-primary btn-block" id="btnGenerate">' +
            '<i class="fa-solid fa-file-lines mr-1"></i>Generate</button>' +
        '</div>' +
      '</div>';

    SASO.listview.fillSelect('fOrg', M.db().organizations.map(function (o) {
      return { value: o.id, label: o.acronym };
    }), 'All organizations', state.org);

    SASO.listview.fillSelect('fCategory', C.ACTIVITY_CATEGORIES.map(function (c) {
      return { value: c, label: c };
    }), 'All categories', state.category);

    SASO.listview.fillSelect('fStage', Object.keys(C.STAGE).map(function (k) {
      return { value: k, label: C.LABEL[k] };
    }), 'All stages', state.stage);

    document.getElementById('typeHint').textContent = REPORTS[state.type].hint;
    bindControls();
  }

  function applyPeriod(p) {
    var now = new Date();
    var y = now.getFullYear();
    if (p === 'month') {
      state.from = new Date(y, now.getMonth(), 1).toISOString().slice(0, 10);
      state.to = new Date(y, now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (p === 'quarter') {
      var q = Math.floor(now.getMonth() / 3);
      state.from = new Date(y, q * 3, 1).toISOString().slice(0, 10);
      state.to = new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10);
    } else if (p === 'year') {
      state.from = y + '-01-01';
      state.to = y + '-12-31';
    } else {
      state.from = ''; state.to = '';
    }
    state.period = p;
  }

  function bindControls() {
    document.getElementById('fType').addEventListener('change', function () {
      state.type = this.value;
      document.getElementById('typeHint').textContent = REPORTS[state.type].hint;
    });

    document.querySelectorAll('#periodBtns button').forEach(function (b) {
      b.addEventListener('click', function () {
        applyPeriod(this.getAttribute('data-period'));
        renderControls();
      });
    });

    [['fFrom', 'from'], ['fTo', 'to'], ['fOrg', 'org'],
     ['fCategory', 'category'], ['fStage', 'stage']].forEach(function (cfg) {
      document.getElementById(cfg[0]).addEventListener('change', function () {
        state[cfg[1]] = this.value;
        if (cfg[1] === 'from' || cfg[1] === 'to') { state.period = 'custom'; }
      });
    });

    document.getElementById('btnGenerate').addEventListener('click', function () {
      state.generated = { type: state.type, at: new Date().toISOString() };
      renderPreview();
    });
  }

  /* ---- preview ---------------------------------------------------------------------- */

  function periodLabel() {
    if (state.from && state.to) {
      return M.formatDate(state.from) + ' to ' + M.formatDate(state.to);
    }
    if (state.from) { return 'From ' + M.formatDate(state.from); }
    if (state.to) { return 'Up to ' + M.formatDate(state.to); }
    return 'All dates';
  }

  function scopeLine() {
    var bits = [];
    if (state.org) { bits.push(M.orgById(state.org).acronym); }
    if (state.category) { bits.push(state.category); }
    if (state.stage) { bits.push(C.LABEL[state.stage]); }
    return bits.length ? bits.join(' · ') : 'All organizations';
  }

  function renderPreview() {
    var host = document.getElementById('previewPane');

    if (!state.generated) {
      host.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state">' +
        '<i class="fa-regular fa-file-lines"></i>' +
        '<h6>No report generated yet</h6>' +
        '<p>Choose a report and a period, then select Generate.</p>' +
      '</div></div></div>';
      return;
    }

    var def = REPORTS[state.generated.type];
    var data = def.build();
    var head = M.db().users.filter(function (u) { return u.username === 'head'; })[0];

    var body;
    if (!data.rows.length) {
      body = '<div class="empty-state"><i class="fa-regular fa-folder-open"></i>' +
        '<h6>No records for this period</h6>' +
        '<p>Widen the date range or clear a filter.</p></div>';
    } else if (data.grouped) {
      var groups = [];
      data.rows.forEach(function (r) {
        var g = groups.filter(function (x) { return x.key === r.group; })[0];
        if (!g) { g = { key: r.group, rows: [] }; groups.push(g); }
        g.rows.push(r);
      });
      body = '<table class="report-table"><thead><tr>' +
        data.columns.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        groups.map(function (g) {
          return '<tr class="report-group"><td colspan="' + data.columns.length + '">MONTH: ' +
            g.key + '</td></tr>' +
            g.rows.map(function (r) {
              return '<tr>' + r.cells.map(function (c) {
                return '<td>' + M.escapeHtml(c === null || c === undefined ? '' : c) + '</td>';
              }).join('') + '</tr>';
            }).join('');
        }).join('') + '</tbody></table>';
    } else {
      body = '<table class="report-table"><thead><tr>' +
        data.columns.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        data.rows.map(function (r) {
          return '<tr>' + r.cells.map(function (c) {
            return '<td>' + M.escapeHtml(c === null || c === undefined ? '' : c) + '</td>';
          }).join('') + '</tr>';
        }).join('') +
        (data.totals
          ? '<tr class="report-total">' + data.totals.map(function (c) {
              return '<td>' + M.escapeHtml(c) + '</td>'; }).join('') + '</tr>'
          : '') +
        '</tbody></table>';
    }

    host.innerHTML =
      '<div class="card">' +
        '<div class="card-header no-print">' +
          '<h3 class="card-title">Preview</h3>' +
          '<div class="card-tools">' +
            '<button type="button" class="btn btn-sm btn-outline-primary mr-1" id="btnExport">' +
              '<i class="fa-solid fa-file-csv mr-1"></i>Export CSV</button>' +
            '<button type="button" class="btn btn-sm btn-primary" id="btnPrint">' +
              '<i class="fa-solid fa-print mr-1"></i>Print</button>' +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="report-doc" id="reportDoc">' +
            '<div class="report-letterhead">' +
        '<img src="../../assets/img/saso-logo-print.jpg" class="letterhead-seal" alt="">' +
              '<div class="report-institution">Republic of the Philippines</div>' +
              '<div class="report-college">CAMARINES SUR POLYTECHNIC COLLEGES</div>' +
              '<div class="report-institution">Nabua, Camarines Sur</div>' +
              '<div class="report-office">STUDENT AFFAIRS AND SERVICES OFFICE</div>' +
            '</div>' +
            '<h2 class="report-title">' + def.label.toUpperCase() + '</h2>' +
            '<div class="report-period">' + periodLabel() + '</div>' +
            '<div class="report-scope">' + M.escapeHtml(scopeLine()) + ' · ' +
              data.rows.length + ' record' + (data.rows.length === 1 ? '' : 's') + '</div>' +
            /* Wide reports scroll sideways on small screens, with the
               scrollbar on top (layout.js); print is unaffected. */
            '<div class="report-scroll top-scroll">' + body + '</div>' +
            '<div class="report-signatures">' +
              '<div><span class="cell-sub">Prepared by</span>' +
                '<div class="sig-name">' + M.escapeHtml(session.name) + '</div>' +
                '<div class="sig-role">' + M.escapeHtml(session.position) + '</div></div>' +
              '<div><span class="cell-sub">Noted by</span>' +
                '<div class="sig-name">' + M.escapeHtml(head ? head.name : '') + '</div>' +
                '<div class="sig-role">' + M.escapeHtml(head ? head.position : '') + '</div></div>' +
            '</div>' +
            '<div class="report-stamp">PROTOTYPE: NOT AN OFFICIAL INSTITUTIONAL DOCUMENT · ' +
              'Generated ' + M.formatDate(state.generated.at) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('btnPrint').addEventListener('click', function () {
      window.print();
    });
    document.getElementById('btnExport').addEventListener('click', function () {
      exportCsv(def, data);
    });
  }

  /* ---- CSV export ---------------------------------------------------------------------
     Written client-side with a Blob. No server is involved, which keeps this
     inside the prototype's architecture. */

  function exportCsv(def, data) {
    function cell(v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    var lines = [];
    lines.push([def.label].map(cell).join(','));
    lines.push([periodLabel()].map(cell).join(','));
    lines.push([scopeLine()].map(cell).join(','));
    lines.push('');
    lines.push(data.columns.map(cell).join(','));

    var lastGroup = null;
    data.rows.forEach(function (r) {
      if (data.grouped && r.group !== lastGroup) {
        lines.push(cell('MONTH: ' + r.group));
        lastGroup = r.group;
      }
      lines.push(r.cells.map(cell).join(','));
    });
    if (data.totals) { lines.push(data.totals.map(cell).join(',')); }
    lines.push('');
    lines.push(cell('PROTOTYPE: NOT AN OFFICIAL INSTITUTIONAL DOCUMENT'));

    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = def.label.replace(/[^A-Za-z0-9]+/g, '_') + '_' +
      new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    SASO.layout.toast('CSV exported.');
  }

  /* ---- go ------------------------------------------------------------------------------ */

  applyPeriod('year');
  renderControls();
  renderPreview();
})();
