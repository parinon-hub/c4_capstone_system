/* =========================================================================
   saso-proposals.js  —  The approval pipeline.

   Everything currently moving toward approval, in one queue. The column that
   matters is Days Waiting: it separates a proposal SASO is sitting on from one
   that has been with the VPAA for a fortnight, which the paper process cannot
   distinguish at all.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var L = SASO.listview;
  var PAGE_SIZE = 12;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'proposals',
    title: 'Activity Proposals',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' },
                 { label: 'Activity Proposals' }]
  });
  if (!session) { return; }

  var P = SASO.proposalActions;

  /* Confirmation after deleting from Activity Details. */
  if (new URLSearchParams(window.location.search).get('trashed')) {
    SASO.layout.toast('Moved to the trash bin. You can restore it within ' +
      C.TRASH_RETENTION_DAYS + ' days.', 'warning');
    window.history.replaceState({}, '', 'proposals.html');
  }

  var state = { search: '', org: '', status: '', scope: 'pipeline',
                sort: 'waiting', dir: 'desc', dateField: 'start', page: 1 };

  var PIPELINE = [C.PROPOSAL.SUBMITTED, C.PROPOSAL.FOR_REVIEW,
                  C.PROPOSAL.REQUIREMENTS_NEEDED, C.PROPOSAL.REVISION_REQUIRED,
                  C.PROPOSAL.SASO_ENDORSED, C.PROPOSAL.WITH_VPAA,
                  C.PROPOSAL.WITH_PRESIDENT];

  document.getElementById('pageRoot').innerHTML =
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">Proposal queue</h3>' +
        '<div class="card-tools">' +
          '<span id="trashSlot" class="mr-2"></span>' +
          '<div class="btn-group btn-group-sm" id="scopeToggle">' +
            '<button type="button" class="btn btn-outline-primary active" data-scope="pipeline">In pipeline</button>' +
            '<button type="button" class="btn btn-outline-primary" data-scope="all">All proposals</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-4 mb-2">' +
            '<label for="fSearch" class="text-sm">Search</label>' +
            '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
              'placeholder="Activity, organization or venue"></div>' +
          '<div class="form-group col-md-3 mb-2">' +
            '<label for="fOrg" class="text-sm">Organization</label>' +
            '<select class="form-control form-control-sm" id="fOrg"></select></div>' +
          '<div class="form-group col-md-3 mb-2">' +
            '<label for="fStatus" class="text-sm">Status</label>' +
            '<select class="form-control form-control-sm" id="fStatus"></select></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<button type="button" class="btn btn-sm btn-light btn-block" id="btnClear">Clear</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="pager"></div>' +
    '</div>';

  L.fillSelect('fOrg', M.db().organizations.map(function (o) {
    return { value: o.id, label: o.acronym };
  }), 'All organizations');

  L.fillSelect('fStatus', PIPELINE.map(function (s) {
    return { value: s, label: C.LABEL[s] };
  }), 'All statuses');

  /* Days the proposal has been sitting with whichever office holds it. */
  function waiting(a) {
    if (M.isInApprovalRoute(a)) { return M.daysWithCurrentOffice(a.id); }
    if (a.submittedAt) { return M.daysWaiting(a); }
    return 0;
  }

  function holder(a) {
    var office = M.currentOffice(a.id);
    return office ? C.LABEL[office.office] : '—';
  }

  /* ---- tiles ------------------------------------------------------------------ */

  function renderTiles() {
    var acts = M.allActivities();
    var withSaso = acts.filter(M.isWithSaso);
    var inRoute = acts.filter(M.isInApprovalRoute);
    var stale = withSaso.concat(inRoute).filter(function (a) {
      return waiting(a) > M.settings().proposalAlertDays;
    });
    var needsDoc = acts.filter(function (a) {
      return a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
             a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED;
    });

    var tiles = [
      { value: withSaso.length, label: 'With SASO', icon: 'fa-file-pen',
        mod: withSaso.length ? 'is-attention' : '', status: '' },
      { value: needsDoc.length, label: 'Awaiting the organization', icon: 'fa-circle-exclamation',
        mod: '', status: C.PROPOSAL.REQUIREMENTS_NEEDED },
      { value: inRoute.length, label: 'In approval route', icon: 'fa-arrow-right-arrow-left',
        mod: '', status: '' },
      { value: stale.length, label: 'Waiting over ' + M.settings().proposalAlertDays + ' days',
        icon: 'fa-hourglass-half', mod: stale.length ? 'is-overdue' : '', status: '' }
    ];

    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- data -------------------------------------------------------------------- */

  function rows() {
    var q = state.search.toLowerCase();

    var list = M.allActivities().filter(function (a) {
      if (a.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
      if (state.scope === 'pipeline' && PIPELINE.indexOf(a.proposalStatus) === -1) { return false; }
      if (state.org && a.organizationId !== state.org) { return false; }
      if (state.status && a.proposalStatus !== state.status) { return false; }
      if (q) {
        var hay = ((a.title || '') + ' ' + (a.venue || '') + ' ' +
                   M.orgAcronym(a.organizationId)).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    return L.sort(list, state, function (a, key) {
      if (key === 'waiting') { return waiting(a); }
      if (key === 'org') { return M.orgAcronym(a.organizationId); }
      if (key === 'submitted') { return new Date(a.submittedAt || 0); }
      if (key === 'eventDate') { return new Date(L.pickedDate(a, state) || 0); }
      return a[key];
    });
  }

  /* ---- render ------------------------------------------------------------------- */

  function render() {
    renderTiles();
    document.getElementById('trashSlot').innerHTML = P.trashButton('trash.html');

    var list = rows();
    var paged = L.paginate(list, state, PAGE_SIZE);
    var host = document.getElementById('tableHost');

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-circle-check"></i>' +
        '<h6>' + (state.scope === 'pipeline'
          ? 'No proposals are waiting'
          : 'No proposals match these filters') + '</h6>' +
        '<p>' + (state.scope === 'pipeline'
          ? 'Everything submitted has been approved, returned or rejected.'
          : 'Try clearing the filters.') + '</p>' +
        '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>' +
      '</div>';
      document.getElementById('btnClearInline').addEventListener('click', clearFilters);
      L.renderPager('pager', 0, 1, state, PAGE_SIZE, render);
      return;
    }

    /* `top-scroll` puts the horizontal scrollbar above the table (layout.js). */
    host.innerHTML = '<div class="table-responsive top-scroll"><table class="table table-hover">' +
      '<thead><tr>' +
        L.header('Organization') +
        L.header('Activity') +
        L.header('Submitted') +
        L.dateHeader(state, 'Event Date') +
        '<th>Requirements</th><th>Status</th><th>Now With</th>' +
        L.header('Days Waiting', 'text-center') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (a) {
        var d = waiting(a);
        var p = M.requirementProgress(a.id, C.PHASE.PRE_APPROVAL);
        var complete = p.approved === p.mandatory;

        return '<tr class="' + (d > M.settings().proposalAlertDays ? 'row-stale' : '') + '">' +
          '<td><span class="cell-primary">' + M.escapeHtml(M.orgAcronym(a.organizationId)) + '</span></td>' +
          '<td><a href="activity-details.html?id=' + a.id + '" class="cell-primary">' +
            M.escapeHtml(a.title) + '</a>' +
            '<span class="cell-sub">' + M.escapeHtml(a.category || '—') + ' · ' +
            M.label(a.venueType) + '</span></td>' +
          '<td class="text-nowrap text-muted text-sm">' +
            (a.submittedAt ? M.formatDate(a.submittedAt) : '—') + '</td>' +
          '<td class="text-nowrap">' + M.formatDate(L.pickedDate(a, state)) + '</td>' +
          '<td><div class="req-progress ' + (complete ? 'is-complete' : '') + '">' +
            '<div class="progress"><div class="progress-bar" style="width:' + p.percent + '%"></div></div>' +
            '<span class="req-count">' + p.approved + '/' + p.mandatory + '</span></div></td>' +
          '<td>' + M.badge(a.proposalStatus) + '</td>' +
          '<td class="text-sm">' + holder(a) + '</td>' +
          '<td class="text-center' + (d > M.settings().proposalAlertDays ? ' text-danger font-weight-bold' : '') +
            '">' + (d || '—') + '</td>' +
          '<td class="text-right text-nowrap"><a class="btn btn-sm btn-outline-primary" ' +
            'href="activity-details.html?id=' + a.id + '">Review</a>' + P.rowButtons(a) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    L.bindDatePick(host, state, render);
    L.renderPager('pager', list.length, paged.pages, state, PAGE_SIZE, render);
    P.bind(host, render, render);
  }

  /* ---- controls -------------------------------------------------------------------- */

  function clearFilters() {
    state.search = ''; state.org = ''; state.status = ''; state.page = 1;
    document.getElementById('fSearch').value = '';
    document.getElementById('fOrg').value = '';
    document.getElementById('fStatus').value = '';
    render();
  }

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  document.getElementById('fOrg').addEventListener('change', function () {
    state.org = this.value; state.page = 1; render();
  });
  document.getElementById('fStatus').addEventListener('change', function () {
    state.status = this.value; state.page = 1; render();
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  document.querySelectorAll('#scopeToggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#scopeToggle button').forEach(function (x) {
        x.classList.remove('active');
      });
      this.classList.add('active');
      state.scope = this.getAttribute('data-scope');
      state.page = 1;
      render();
    });
  });

  render();
})();
