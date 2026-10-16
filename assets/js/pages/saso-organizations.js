/* =========================================================================
   saso-organizations.js  —  The roster, with compliance attached.

   This is also the AACCUP record: recognized organizations with their
   advisers and accreditation levels. What it adds beyond a list is the
   compliance column, so SASO can see at a glance which organizations are
   carrying outstanding documents or overdue reports.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var L = SASO.listview;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'organizations',
    title: 'Organizations',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' }, { label: 'Organizations' }]
  });
  if (!session) { return; }

  var state = { search: '', level: '', compliance: '', sort: 'acronym', dir: 'asc', group: '', page: 1 };
  var LEVELS = Object.keys(C.ACCREDITATION_LEVEL).map(function (k) { return C.ACCREDITATION_LEVEL[k]; });

  document.getElementById('pageRoot').innerHTML =
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">Recognized and accredited student organizations</h3>' +
        '<div class="card-tools d-flex align-items-center flex-wrap">' +
          '<span class="card-subtitle mr-2" id="ayLabel"></span>' +
          '<a class="btn btn-sm btn-outline-secondary mr-1" href="account-requests.html">' +
            '<i class="fa-solid fa-users-gear mr-1"></i>Manage accounts' +
            (M.pendingAccountRequests().length
              ? ' <span class="badge badge-warning ml-1">' + M.pendingAccountRequests().length + '</span>' : '') +
          '</a>' +
          (M.canManageAccounts(session)
            ? '<button type="button" class="btn btn-sm btn-primary" id="btnAddOrg">' +
                '<i class="fa-solid fa-user-plus mr-1"></i>Add organization</button>'
            : '') +
        '</div>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        L.toolbarHtml('Search name, acronym, college or adviser') +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
    '</div>';

  var ay = M.db().organizations[0];
  document.getElementById('ayLabel').textContent =
    'Academic Year ' + (ay ? ay.accreditationAY : '');

  /* ---- per-organization compliance ------------------------------------------- */

  function profile(o) {
    var acts = M.activitiesFor(o.id).filter(function (a) {
      return a.proposalStatus !== C.PROPOSAL.DRAFT;
    });
    var stages = {};
    acts.forEach(function (a) {
      var s = M.stageOf(a);
      stages[s] = (stages[s] || 0) + 1;
    });

    var outstanding = M.outstandingRequirements(o.id).length;
    var overdue = acts.filter(function (a) {
      return M.terminalStatus(a) === C.TERMINAL.OVERDUE;
    });

    return {
      org: o,
      activities: acts,
      total: acts.length,
      stages: stages,
      outstanding: outstanding,
      overdue: overdue.length,
      maxDaysLate: overdue.reduce(function (m, a) {
        return Math.max(m, M.daysPending(a));
      }, 0),
      completed: stages[C.STAGE.COMPLETED] || 0
    };
  }

  /* ---- sort and filter menus --------------------------------------------------- */

  var COMPLIANCE = [
    { value: 'overdue',     label: 'With overdue reports' },
    { value: 'outstanding', label: 'With outstanding documents' },
    { value: 'clear',       label: 'Fully compliant' }
  ];

  /* Worst first: overdue reports, then outstanding documents. */
  function complianceRank(p) {
    if (p.overdue) { return 0; }
    if (p.outstanding) { return 1; }
    return p.total ? 2 : 3;
  }

  function complianceGroup(p) {
    return ['Overdue reports', 'Outstanding documents', 'Compliant', 'No activities yet'][complianceRank(p)];
  }

  var tb = L.toolbar({
    state: state,
    onChange: render,
    sorts: [
      { key: 'acronym',     label: 'Organization' },
      { key: 'college',     label: 'College' },
      { key: 'adviser',     label: 'Adviser' },
      { key: 'level',       label: 'Accreditation' },
      { key: 'activities',  label: 'Activities' },
      { key: 'outstanding', label: 'Compliance' }
    ],
    groups: [
      { key: '',           label: 'None' },
      { key: 'college',    label: 'College', of: function (p) { return p.org.college || 'No college'; } },
      { key: 'level',      label: 'Accreditation', of: function (p) { return C.LABEL[p.org.accreditationLevel]; },
        rank: function (p) { return LEVELS.indexOf(p.org.accreditationLevel); } },
      { key: 'compliance', label: 'Compliance', of: complianceGroup, rank: complianceRank }
    ],
    filters: [
      { key: 'level', label: 'Accreditation', all: 'All levels',
        options: LEVELS.map(function (l) { return { value: l, label: C.LABEL[l] }; }) },
      { key: 'compliance', label: 'Compliance', all: 'All organizations', options: COMPLIANCE }
    ]
  });

  /* ---- tiles ------------------------------------------------------------------- */

  function renderTiles() {
    var a = M.accreditationSummary();
    var profiles = M.db().organizations.map(profile);
    var withOutstanding = profiles.filter(function (p) { return p.outstanding > 0; }).length;
    var withOverdue = profiles.filter(function (p) { return p.overdue > 0; }).length;

    var tiles = [
      { value: a.total, label: 'Organizations', icon: 'fa-people-group' },
      { value: a.accredited, label: 'Accredited', icon: 'fa-certificate', mod: 'is-complete' },
      { value: withOutstanding, label: 'With outstanding documents',
        icon: 'fa-circle-exclamation', mod: withOutstanding ? 'is-attention' : '' },
      { value: withOverdue, label: 'With overdue reports',
        icon: 'fa-triangle-exclamation', mod: withOverdue ? 'is-overdue' : '' }
    ];

    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- table --------------------------------------------------------------------- */

  function rows() {
    var q = state.search.toLowerCase();

    var list = M.db().organizations.map(profile).filter(function (p) {
      var o = p.org;
      if (state.level && o.accreditationLevel !== state.level) { return false; }
      if (state.compliance === 'outstanding' && !p.outstanding) { return false; }
      if (state.compliance === 'overdue' && !p.overdue) { return false; }
      if (state.compliance === 'clear' && (p.outstanding || p.overdue)) { return false; }
      if (q) {
        var hay = (o.name + ' ' + o.acronym + ' ' + o.college + ' ' + o.adviser).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    return tb.order(list, function (p, key) {
      if (key === 'college') { return p.org.college || ''; }
      if (key === 'adviser') { return p.org.adviser || ''; }
      if (key === 'level') { return LEVELS.indexOf(p.org.accreditationLevel); }
      if (key === 'activities') { return p.total; }
      if (key === 'outstanding') { return p.outstanding + p.overdue * 100; }
      return p.org.acronym;
    });
  }

  function complianceCell(p) {
    if (p.overdue) {
      return '<span class="badge badge-danger status-badge">' + p.overdue +
        ' overdue report' + (p.overdue === 1 ? '' : 's') + '</span>' +
        '<span class="cell-sub text-danger">up to ' + p.maxDaysLate + ' days late</span>';
    }
    if (p.outstanding) {
      return '<span class="badge badge-warning status-badge">' + p.outstanding +
        ' document' + (p.outstanding === 1 ? '' : 's') + ' outstanding</span>';
    }
    if (!p.total) { return '<span class="text-muted text-sm">No activities yet</span>'; }
    return '<span class="badge badge-success status-badge">Compliant</span>';
  }

  function render() {
    tb.refresh();
    renderTiles();
    var list = rows();
    var host = document.getElementById('tableHost');

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-folder-open"></i>' +
        '<h6>No organizations match these filters</h6>' +
        '<p>Try clearing the search or choosing a different level.</p>' +
        '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>' +
      '</div>';
      document.getElementById('btnClearInline').addEventListener('click', clearFilters);
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        L.header('Organization') +
        L.header('College') +
        '<th>Adviser</th>' +
        L.header('Accreditation') +
        L.header('Activities', 'text-center') +
        L.header('Compliance') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      list.map(function (p, i) {
        var o = p.org;
        var left = M.accreditationDaysLeft(o);
        var due = left !== null && left <= 60;

        return tb.groupRow(list, i, list, 7) + '<tr class="' + (p.overdue ? 'row-overdue' : '') + '">' +
          '<td><span class="cell-primary">' + M.escapeHtml(o.acronym) + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(o.name) + '</span></td>' +
          '<td class="text-sm">' + M.escapeHtml(o.college) + '</td>' +
          '<td class="text-sm">' + M.escapeHtml(o.adviser) + '</td>' +
          '<td>' + M.accreditationBadge(o) +
            (due ? '<span class="cell-sub text-danger">Renewal in ' + left + ' days</span>'
                 : '<span class="cell-sub">Valid to ' + M.formatDate(o.accreditationExpires) + '</span>') +
            '</td>' +
          '<td class="text-center">' + p.total +
            (p.completed ? '<span class="cell-sub">' + p.completed + ' completed</span>' : '') + '</td>' +
          '<td>' + complianceCell(p) + '</td>' +
          '<td class="text-right"><button type="button" class="btn btn-sm btn-outline-primary" ' +
            'data-org="' + o.id + '">View</button></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';


    host.querySelectorAll('[data-org]').forEach(function (b) {
      b.addEventListener('click', function () { openProfile(this.getAttribute('data-org')); });
    });
  }

  /* ---- profile dialog -------------------------------------------------------------- */

  function openProfile(orgId) {
    var p = profile(M.orgById(orgId));
    var o = p.org;

    var old = document.getElementById('orgModal');
    if (old) { old.remove(); }

    var activityRows = p.activities.length
      ? p.activities.sort(function (x, y) {
          return new Date(y.dateStart || 0) - new Date(x.dateStart || 0);
        }).map(function (a) {
          var ts = M.terminalStatus(a);
          return '<tr>' +
            '<td><a href="activity-details.html?id=' + a.id + '">' +
              M.escapeHtml(a.title) + '</a>' +
              '<span class="cell-sub">' + M.escapeHtml(a.category || '—') + ' · ' +
              M.label(a.venueType) + '</span></td>' +
            '<td class="text-nowrap text-sm">' + M.formatDateRange(a.dateStart, a.dateEnd) + '</td>' +
            '<td>' + M.badge(M.stageOf(a)) + '</td>' +
            '<td>' + (ts === C.TERMINAL.NOT_APPLICABLE ? '—' : M.badge(ts)) + '</td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="4" class="text-muted text-center py-3">No activities submitted yet.</td></tr>';

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="orgModal" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<div>' +
                '<h5 class="modal-title">' + M.escapeHtml(o.acronym) + '</h5>' +
                '<div class="cell-sub">' + M.escapeHtml(o.name) + '</div>' +
              '</div>' +
              '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="review-meta">' +
                '<div><span class="cell-sub">College</span>' + M.escapeHtml(o.college) + '</div>' +
                '<div><span class="cell-sub">Adviser</span>' + M.escapeHtml(o.adviser) + '</div>' +
                '<div><span class="cell-sub">Accreditation</span>' + M.accreditationLabel(o) + '</div>' +
                '<div><span class="cell-sub">Valid until</span>' +
                  M.formatDate(o.accreditationExpires) + '</div>' +
                '<div><span class="cell-sub">Activities</span>' + p.total + '</div>' +
                '<div><span class="cell-sub">Completed</span>' + p.completed + '</div>' +
                '<div><span class="cell-sub">Outstanding documents</span>' + p.outstanding + '</div>' +
                '<div><span class="cell-sub">Overdue reports</span>' + p.overdue + '</div>' +
              '</div>' +
              '<h6 class="mt-3 mb-2">Activities</h6>' +
              '<div class="table-responsive"><table class="table table-sm mb-0">' +
                '<thead><tr><th>Activity</th><th>Date</th><th>Stage</th><th>Reports</th></tr></thead>' +
                '<tbody>' + activityRows + '</tbody>' +
              '</table></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<a class="btn btn-outline-primary btn-sm mr-auto" ' +
                'href="activities.html?org=' + o.id + '">See in activity list</a>' +
              '<button type="button" class="btn btn-light" data-dismiss="modal">Close</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>');

    var $m = window.jQuery('#orgModal');
    $m.modal('show');
    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  /* ---- controls --------------------------------------------------------------------- */

  function clearFilters() { tb.clear(); }

  var addOrg = document.getElementById('btnAddOrg');
  if (addOrg) {
    addOrg.addEventListener('click', function () { SASO.orgAccountForm.openAddDialog(render); });
  }

  render();
})();
