/* =========================================================================
   trash.js  —  The trash bin for deleted activity proposals.

   One controller, both portals. A deleted proposal waits here for
   TRASH_RETENTION_DAYS (30). From here it can be restored — returning to
   SASO review with its documents, comments and history intact — or deleted
   permanently with Confirm deletion. Anything left past the retention period
   is removed automatically on the next page load (see layout.init).

   SASO's Head, Administrative Aide and Coordinator see every deleted
   proposal; an organization sees only its own.

   Pages set window.SASO_ROLE before loading this file.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;
  var L = SASO.listview;
  var role = window.SASO_ROLE;
  var isSaso = role === C.ROLE.SASO;
  var PAGE_SIZE = 10;
  var SOON_DAYS = 7;

  var listPage = isSaso ? 'proposals.html' : 'activities.html';

  var session = SASO.layout.init({
    role: role,
    page: isSaso ? 'proposals' : 'activities',
    title: 'Trash Bin',
    breadcrumb: [
      { label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
      { label: isSaso ? 'Activity Proposals' : 'My Activities',
        href: isSaso ? 'pages/saso/proposals.html' : 'pages/org/activities.html' },
      { label: 'Trash Bin' }
    ]
  });
  if (!session) { return; }

  var root = document.getElementById('pageRoot');

  /* The Records Officer has view-only access to proposals. */
  if (!M.canManageProposals(session)) {
    root.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state">' +
      '<i class="fa-solid fa-lock"></i>' +
      '<h6>The trash bin is not available to this account</h6>' +
      '<p>Only the SASO Head, Administrative Aide and Student Activities Coordinator can ' +
        'delete, restore or permanently delete activity proposals.</p>' +
      '<a class="btn btn-sm btn-primary" href="' + listPage + '">Back to proposals</a>' +
    '</div></div></div>';
    return;
  }

  var state = { search: '', org: '', by: '', sort: 'deletedAt', dir: 'desc', page: 1 };

  /* ---- shell -------------------------------------------------------------------- */

  root.innerHTML =
    '<div class="callout callout-info trash-note">' +
      '<i class="fa-solid fa-circle-info mr-2"></i>' +
      'Deleted activity proposals stay here for <strong>' + C.TRASH_RETENTION_DAYS +
      ' days</strong>, then they are permanently deleted automatically. ' +
      '<strong>Restore</strong> returns a proposal to SASO review with its documents, comments ' +
      'and history intact. <strong>Confirm deletion</strong> removes it for good right away. ' +
      (isSaso ? 'The submitting organization and the SASO Head, Administrative Aide and ' +
                'Coordinator are notified either way.'
              : 'SASO is notified either way.') +
    '</div>' +
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title"><i class="fa-solid fa-trash-can mr-2 text-muted"></i>Deleted proposals</h3>' +
        '<div class="card-tools">' +
          '<a class="btn btn-sm btn-light" href="' + listPage + '">' +
            '<i class="fa-solid fa-arrow-left mr-1"></i>' +
            (isSaso ? 'Back to proposals' : 'Back to my activities') + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-' + (isSaso ? '4' : '6') + ' mb-2">' +
            '<label for="fSearch" class="text-sm">Search</label>' +
            '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
              'placeholder="Activity title, venue or reason"></div>' +
          (isSaso
            ? '<div class="form-group col-md-3 mb-2">' +
                '<label for="fOrg" class="text-sm">Organization</label>' +
                '<select class="form-control form-control-sm" id="fOrg"></select></div>'
            : '') +
          '<div class="form-group col-md-' + (isSaso ? '3' : '4') + ' mb-2">' +
            '<label for="fBy" class="text-sm">Deleted by</label>' +
            '<select class="form-control form-control-sm" id="fBy"></select></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<button type="button" class="btn btn-sm btn-light btn-block" id="btnClear">Clear</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="pager"></div>' +
    '</div>';

  if (isSaso) {
    L.fillSelect('fOrg', M.db().organizations.map(function (o) {
      return { value: o.id, label: o.acronym };
    }), 'All organizations');
  }
  L.fillSelect('fBy', [
    { value: C.ROLE.ORG, label: isSaso ? 'The organization' : 'My organization' },
    { value: C.ROLE.SASO, label: 'SASO' }
  ], 'Anyone');

  /* ---- data ----------------------------------------------------------------------- */

  function rows() {
    var q = state.search.toLowerCase();
    var list = M.trashFor(session).filter(function (t) {
      var a = t.activity;
      if (state.org && a.organizationId !== state.org) { return false; }
      if (state.by && t.deletedByRole !== state.by) { return false; }
      if (q) {
        var hay = ((a.title || '') + ' ' + (a.venue || '') + ' ' + (t.reason || '') + ' ' +
                   M.orgAcronym(a.organizationId)).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    return L.sort(list, state, function (t, key) {
      if (key === 'deletedAt') { return new Date(t.deletedAt); }
      if (key === 'daysLeft') { return M.trashDaysLeft(t); }
      if (key === 'org') { return M.orgAcronym(t.activity.organizationId); }
      if (key === 'title') { return t.activity.title; }
      if (key === 'eventDate') { return new Date(t.activity.dateStart || 0); }
      return t[key];
    });
  }

  /* ---- tiles ------------------------------------------------------------------------ */

  function renderTiles() {
    var all = M.trashFor(session);
    var soon = all.filter(function (t) { return M.trashDaysLeft(t) <= SOON_DAYS; });
    var byOrg = all.filter(function (t) { return t.deletedByRole === C.ROLE.ORG; });
    var bySaso = all.filter(function (t) { return t.deletedByRole === C.ROLE.SASO; });

    var tiles = [
      { value: all.length, label: 'In the trash bin', icon: 'fa-trash-can' },
      { value: soon.length, label: 'Permanently deleted within ' + SOON_DAYS + ' days',
        icon: 'fa-hourglass-end', mod: soon.length ? 'is-overdue' : '' },
      { value: byOrg.length, label: isSaso ? 'Deleted by organizations' : 'Deleted by you',
        icon: 'fa-people-group' },
      { value: bySaso.length, label: 'Deleted by SASO', icon: 'fa-building-columns' }
    ];

    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- render ------------------------------------------------------------------------- */

  function daysLeftCell(t) {
    var left = M.trashDaysLeft(t);
    var pct = Math.round((left / C.TRASH_RETENTION_DAYS) * 100);
    var urgent = left <= SOON_DAYS;
    return '<div class="trash-countdown' + (urgent ? ' is-soon' : '') + '">' +
      '<span class="trash-days">' + (left === 0 ? 'Today' : left + (left === 1 ? ' day' : ' days')) + '</span>' +
      '<div class="progress"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
      '<span class="cell-sub">on ' + M.formatDate(t.purgeAt) + '</span>' +
    '</div>';
  }

  function render() {
    renderTiles();

    var list = rows();
    var paged = L.paginate(list, state, PAGE_SIZE);
    var host = document.getElementById('tableHost');
    var filtering = state.search || state.org || state.by;

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-trash-can"></i>' +
        '<h6>' + (filtering ? 'Nothing in the trash bin matches these filters' : 'The trash bin is empty') + '</h6>' +
        '<p>' + (filtering
          ? 'Try clearing the filters.'
          : 'Proposals deleted while under SASO review appear here for ' +
            C.TRASH_RETENTION_DAYS + ' days.') + '</p>' +
        (filtering ? '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>' : '') +
      '</div>';
      var inline = document.getElementById('btnClearInline');
      if (inline) { inline.addEventListener('click', clearFilters); }
      L.renderPager('pager', 0, 1, state, PAGE_SIZE, render);
      return;
    }

    /* `top-scroll` puts the horizontal scrollbar above the table (layout.js). */
    host.innerHTML = '<div class="table-responsive top-scroll"><table class="table table-hover trash-table">' +
      '<thead><tr>' +
        (isSaso ? L.sortHeader(state, 'org', 'Organization') : '') +
        L.sortHeader(state, 'title', 'Activity') +
        L.sortHeader(state, 'eventDate', 'Event Date') +
        '<th>Status when deleted</th>' +
        L.sortHeader(state, 'deletedAt', 'Deleted') +
        '<th>Reason</th>' +
        L.sortHeader(state, 'daysLeft', 'Permanently deleted in') +
        '<th class="text-right">Actions</th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (t) {
        var a = t.activity;
        var docs = (t.requirements || []).length;
        var msgs = (t.comments || []).length;
        return '<tr class="' + (M.trashDaysLeft(t) <= SOON_DAYS ? 'row-overdue' : '') + '">' +
          (isSaso ? '<td><span class="cell-primary">' + M.escapeHtml(M.orgAcronym(a.organizationId)) + '</span></td>' : '') +
          '<td><span class="cell-primary">' + M.escapeHtml(a.title || 'Untitled') + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(a.category || '—') + ' · ' + M.label(a.venueType) +
              ' · ' + docs + ' document' + (docs === 1 ? '' : 's') +
              (msgs ? ', ' + msgs + ' message' + (msgs === 1 ? '' : 's') : '') + '</span></td>' +
          '<td class="text-nowrap">' + M.formatDateRange(a.dateStart, a.dateEnd) + '</td>' +
          '<td>' + M.badge(a.proposalStatus) + '</td>' +
          '<td class="text-nowrap"><span class="cell-primary">' + M.escapeHtml(t.deletedBy) + '</span>' +
            '<span class="cell-sub">' + (t.deletedByRole === C.ROLE.SASO ? 'SASO' : 'Organization') +
              ' · ' + M.relativeTime(t.deletedAt) + '</span></td>' +
          '<td class="trash-reason">' + (t.reason ? M.escapeHtml(t.reason) : '<span class="text-muted">—</span>') + '</td>' +
          '<td>' + daysLeftCell(t) + '</td>' +
          '<td class="text-right text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-outline-success mr-1" data-restore="' + t.id + '">' +
              '<i class="fa-solid fa-trash-arrow-up mr-1"></i>Restore</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-purge="' + t.id + '">' +
              '<i class="fa-solid fa-circle-xmark mr-1"></i>Confirm deletion</button>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    L.bindSort(host, state, render);
    L.renderPager('pager', list.length, paged.pages, state, PAGE_SIZE, render);
    bindRows(host);
  }

  function find(id) {
    return M.trash().filter(function (t) { return t.id === id; })[0] || null;
  }

  function bindRows(host) {
    host.querySelectorAll('[data-restore]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = find(this.getAttribute('data-restore'));
        if (!t) { render(); return; }
        SASO.layout.confirmDialog({
          title: 'Restore this proposal?',
          body: '"' + t.activity.title + '" will return to SASO review as ' +
                M.label(t.activity.proposalStatus) + ', with its documents, comments and history. ' +
                (isSaso ? 'The organization and SASO staff will be notified.' : 'SASO will be notified.'),
          confirmLabel: 'Restore', variant: 'success'
        }, function () {
          var activity = E.restoreProposal(t.id);
          if (activity) {
            SASO.layout.toast('Restored — "' + activity.title + '" is back under SASO review.');
          } else {
            SASO.layout.toast('This proposal could not be restored.', 'danger');
          }
          render();
        });
      });
    });

    host.querySelectorAll('[data-purge]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = find(this.getAttribute('data-purge'));
        if (!t) { render(); return; }
        SASO.layout.confirmDialog({
          title: 'Permanently delete this proposal?',
          body: '"' + t.activity.title + '" and its documents, comments and history will be ' +
                'deleted for good. This cannot be undone.',
          confirmLabel: 'Delete permanently', variant: 'danger'
        }, function () {
          if (E.purgeProposal(t.id)) {
            SASO.layout.toast('Permanently deleted.', 'warning');
          } else {
            SASO.layout.toast('This proposal could not be deleted.', 'danger');
          }
          render();
        });
      });
    });
  }

  /* ---- controls --------------------------------------------------------------------------- */

  function clearFilters() {
    state.search = ''; state.org = ''; state.by = ''; state.page = 1;
    document.getElementById('fSearch').value = '';
    if (isSaso) { document.getElementById('fOrg').value = ''; }
    document.getElementById('fBy').value = '';
    render();
  }

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  if (isSaso) {
    document.getElementById('fOrg').addEventListener('change', function () {
      state.org = this.value; state.page = 1; render();
    });
  }
  document.getElementById('fBy').addEventListener('change', function () {
    state.by = this.value; state.page = 1; render();
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  render();
})();
