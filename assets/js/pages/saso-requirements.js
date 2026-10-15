/* =========================================================================
   saso-requirements.js  —  Cross-activity requirements review.

   Activity Details reviews one activity's documents. This module inverts the
   view: every document in the system, filterable by organization, activity,
   phase and status, so SASO can work through a review queue rather than
   opening activities one at a time.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;
  var PAGE_SIZE = 12;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'requirements',
    title: 'Requirements',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' }, { label: 'Requirements' }]
  });
  if (!session) { return; }

  var state = { search: '', org: '', activity: '', phase: '', status: '', page: 1 };

  /* Arriving from a dashboard tile lands on the review queue. */
  var preset = new URLSearchParams(window.location.search).get('status');
  if (preset) { state.status = preset; }

  /* ---- filter controls ------------------------------------------------------ */

  function fillSelect(id, options, allLabel) {
    document.getElementById(id).innerHTML =
      '<option value="">' + allLabel + '</option>' +
      options.map(function (o) {
        return '<option value="' + M.escapeHtml(o.value) + '">' + M.escapeHtml(o.label) + '</option>';
      }).join('');
  }

  fillSelect('fOrg', M.db().organizations.map(function (o) {
    return { value: o.id, label: o.acronym };
  }), 'All organizations');

  fillSelect('fPhase', Object.keys(C.PHASE).map(function (k) {
    return { value: C.PHASE[k], label: C.LABEL[C.PHASE[k]] };
  }), 'Both phases');

  fillSelect('fStatus', Object.keys(C.REQUIREMENT).map(function (k) {
    return { value: C.REQUIREMENT[k], label: C.LABEL[C.REQUIREMENT[k]] };
  }), 'All statuses');

  /* The activity list narrows to the chosen organization. */
  function refreshActivityFilter() {
    var acts = state.org ? M.activitiesFor(state.org) : M.allActivities();
    fillSelect('fActivity', acts
      .filter(function (a) { return a.proposalStatus !== C.PROPOSAL.DRAFT; })
      .map(function (a) { return { value: a.id, label: a.title }; }), 'All activities');
    document.getElementById('fActivity').value = state.activity;
  }

  document.getElementById('fStatus').value = state.status;

  /* ---- summary tiles --------------------------------------------------------- */

  function renderTiles() {
    var rows = M.allRequirements().filter(function (r) {
      return r.activity.proposalStatus !== C.PROPOSAL.DRAFT;
    });

    function count(status) {
      return rows.filter(function (r) { return r.requirement.status === status; }).length;
    }

    var tiles = [
      { value: count(C.REQUIREMENT.UNDER_REVIEW), label: 'Awaiting review',
        icon: 'fa-magnifying-glass', status: C.REQUIREMENT.UNDER_REVIEW, mod: 'is-attention' },
      { value: count(C.REQUIREMENT.NOT_SUBMITTED), label: 'Not submitted',
        icon: 'fa-circle-exclamation', status: C.REQUIREMENT.NOT_SUBMITTED, mod: 'is-overdue' },
      { value: count(C.REQUIREMENT.NEEDS_REVISION), label: 'Needs revision',
        icon: 'fa-rotate-left', status: C.REQUIREMENT.NEEDS_REVISION, mod: 'is-attention' },
      { value: count(C.REQUIREMENT.APPROVED), label: 'Approved',
        icon: 'fa-circle-check', status: C.REQUIREMENT.APPROVED, mod: 'is-complete' }
    ];

    document.getElementById('reqTiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3">' +
        '<a class="stat-tile ' + t.mod + '" href="#" data-status="' + t.status + '">' +
          '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
          '<span class="stat-value">' + t.value + '</span>' +
          '<span class="stat-label">' + t.label + '</span>' +
        '</a></div>';
    }).join('');

    document.querySelectorAll('#reqTiles [data-status]').forEach(function (tile) {
      tile.addEventListener('click', function (e) {
        e.preventDefault();
        state.status = this.getAttribute('data-status');
        state.page = 1;
        document.getElementById('fStatus').value = state.status;
        render();
      });
    });
  }

  /* ---- filtering -------------------------------------------------------------- */

  var STATUS_ORDER = {};
  STATUS_ORDER[C.REQUIREMENT.UNDER_REVIEW] = 0;
  STATUS_ORDER[C.REQUIREMENT.NEEDS_REVISION] = 1;
  STATUS_ORDER[C.REQUIREMENT.NOT_SUBMITTED] = 2;
  STATUS_ORDER[C.REQUIREMENT.APPROVED] = 3;

  function filtered() {
    var q = state.search.toLowerCase();

    var rows = M.allRequirements().filter(function (row) {
      /* Drafts have not reached SASO yet. */
      if (row.activity.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
      if (state.org && row.organization.id !== state.org) { return false; }
      if (state.activity && row.activity.id !== state.activity) { return false; }
      if (state.phase && row.requirement.phase !== state.phase) { return false; }
      if (state.status && row.requirement.status !== state.status) { return false; }
      if (q) {
        var hay = (row.requirement.name + ' ' + row.activity.title + ' ' +
                   row.organization.acronym).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    /* Work waiting on SASO sorts to the top. */
    rows.sort(function (a, b) {
      var d = STATUS_ORDER[a.requirement.status] - STATUS_ORDER[b.requirement.status];
      if (d !== 0) { return d; }
      return new Date(b.requirement.submittedAt || 0) - new Date(a.requirement.submittedAt || 0);
    });

    return rows;
  }

  /* ---- render ------------------------------------------------------------------ */

  function render() {
    refreshActivityFilter();
    renderTiles();

    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > pages) { state.page = pages; }
    var slice = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    document.getElementById('resultCount').textContent =
      rows.length + ' document' + (rows.length === 1 ? '' : 's');

    var host = document.getElementById('reqTable');

    if (!rows.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-circle-check"></i>' +
        '<h6>Nothing matches these filters</h6>' +
        '<p>Try a different status, or clear the filters to see everything.</p>' +
        '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>' +
      '</div>';
      document.getElementById('btnClearInline').addEventListener('click', clearFilters);
      document.getElementById('pager').innerHTML = '';
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        '<th>Document</th><th>Organization</th><th>Activity</th>' +
        '<th>Phase</th><th>Status</th><th>Submitted</th><th></th>' +
      '</tr></thead><tbody>' +
      slice.map(function (row) {
        var r = row.requirement;
        var cls = r.status === C.REQUIREMENT.UNDER_REVIEW ? 'row-stale'
          : r.status === C.REQUIREMENT.NOT_SUBMITTED && !r.mandatory ? '' : '';
        return '<tr class="' + cls + '">' +
          '<td><span class="cell-primary">' + M.escapeHtml(r.name) +
            (r.requestedBySaso ? ' <span class="badge badge-info status-badge">Requested</span>' : '') +
            '</span><span class="cell-sub">' + (r.mandatory ? 'Required' : 'Optional') +
            (r.fileName ? ' · ' + M.escapeHtml(r.fileName) : '') + '</span></td>' +
          '<td>' + M.escapeHtml(row.organization.acronym) + '</td>' +
          '<td><a href="activity-details.html?id=' + row.activity.id + '">' +
            M.escapeHtml(row.activity.title) + '</a></td>' +
          '<td>' + M.badge(r.phase) + '</td>' +
          '<td>' + M.badge(r.status) + '</td>' +
          '<td class="text-nowrap text-muted text-sm">' +
            (r.submittedAt ? M.relativeTime(r.submittedAt) : '—') + '</td>' +
          '<td class="text-right text-nowrap">' + rowActions(r) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    bind();
    renderPager(rows.length, pages);
  }

  function rowActions(r) {
    if (r.status === C.REQUIREMENT.UNDER_REVIEW) {
      return '<button type="button" class="btn btn-sm btn-primary" data-review="' + r.id + '">' +
        'Review</button>';
    }
    if (r.status === C.REQUIREMENT.NOT_SUBMITTED && r.mandatory) {
      return '<button type="button" class="btn btn-sm btn-outline-warning" data-remind="' + r.id + '">' +
        '<i class="fa-solid fa-bell mr-1"></i>Remind</button>';
    }
    if (r.status === C.REQUIREMENT.NEEDS_REVISION) {
      return '<span class="text-muted text-sm">Awaiting resubmission</span>';
    }
    return '<span class="text-muted text-sm">' +
      (r.reviewedAt ? 'Reviewed ' + M.relativeTime(r.reviewedAt) : '—') + '</span>';
  }

  function renderPager(total, pages) {
    var from = (state.page - 1) * PAGE_SIZE + 1;
    var to = Math.min(state.page * PAGE_SIZE, total);
    var buttons = '';
    for (var i = 1; i <= pages; i += 1) {
      buttons += '<li class="page-item' + (i === state.page ? ' active' : '') + '">' +
        '<a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
    }

    document.getElementById('pager').innerHTML =
      '<span class="text-muted text-sm">Showing ' + from + '–' + to + ' of ' + total + '</span>' +
      (pages > 1 ? '<ul class="pagination pagination-sm mb-0 ml-auto">' + buttons + '</ul>' : '');

    document.querySelectorAll('#pager .page-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        state.page = Number(this.getAttribute('data-page'));
        render();
      });
    });
  }

  /* ---- review dialog ------------------------------------------------------------
     The document itself is simulated. The panel is shown as a placeholder so the
     reviewer sees what a real preview would occupy, without the prototype
     claiming to render a file it does not have. */

  function openReview(requirementId) {
    var r = M.requirementById(requirementId);
    var activity = M.activityById(r.activityId);
    var org = M.orgById(activity.organizationId);

    var old = document.getElementById('reviewModal');
    if (old) { old.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="reviewModal" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">' + M.escapeHtml(r.name) + '</h5>' +
              '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="review-meta">' +
                '<div><span class="cell-sub">Organization</span>' + M.escapeHtml(org.acronym) + '</div>' +
                '<div><span class="cell-sub">Activity</span>' + M.escapeHtml(activity.title) + '</div>' +
                '<div><span class="cell-sub">Phase</span>' + M.label(r.phase) + '</div>' +
                '<div><span class="cell-sub">Submitted</span>' +
                  (r.submittedAt ? M.formatDate(r.submittedAt) : '—') + '</div>' +
              '</div>' +
              '<div class="doc-preview">' +
                '<i class="fa-regular fa-file-lines"></i>' +
                '<span class="doc-name">' + M.escapeHtml(r.fileName || 'document.pdf') + '</span>' +
                '<span class="cell-sub">Document preview is simulated in this prototype.</span>' +
              '</div>' +
              '<div class="form-group mb-0">' +
                '<label for="reviewRemarks">Remarks <span class="text-muted">' +
                  '(required when returning)</span></label>' +
                '<textarea class="form-control" id="reviewRemarks" rows="2" ' +
                  'placeholder="What needs to be corrected?"></textarea>' +
                '<div class="invalid-feedback">Say what needs correcting so the organization can fix it.</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-light mr-auto" data-dismiss="modal">Cancel</button>' +
              '<button type="button" class="btn btn-outline-warning" id="btnReturn">' +
                '<i class="fa-solid fa-rotate-left mr-1"></i>Return for revision</button>' +
              '<button type="button" class="btn btn-success" id="btnApprove">' +
                '<i class="fa-solid fa-check mr-1"></i>Approve</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>');

    var $m = window.jQuery('#reviewModal');
    $m.modal('show');

    document.getElementById('btnApprove').addEventListener('click', function () {
      E.reviewRequirement(requirementId, 'APPROVE',
        document.getElementById('reviewRemarks').value.trim() || null);
      $m.modal('hide');
      SASO.layout.toast(r.name + ' approved.');
      render();
    });

    document.getElementById('btnReturn').addEventListener('click', function () {
      var box = document.getElementById('reviewRemarks');
      var remarks = box.value.trim();
      if (!remarks) { box.classList.add('is-invalid'); return; }
      E.reviewRequirement(requirementId, 'RETURN', remarks);
      $m.modal('hide');
      SASO.layout.toast('Returned to ' + org.acronym + '.', 'warning');
      render();
    });

    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  /* ---- bindings -------------------------------------------------------------------- */

  function bind() {
    document.querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () { openReview(this.getAttribute('data-review')); });
    });

    document.querySelectorAll('[data-remind]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-remind');
        var r = M.requirementById(id);
        var activity = M.activityById(r.activityId);
        SASO.layout.confirmDialog({
          title: 'Send a reminder?',
          body: 'The organization will be notified that ' + r.name + ' is still outstanding for ' +
                activity.title + '.',
          remarks: true,
          remarksPlaceholder: 'Optional message to post in the activity thread',
          confirmLabel: 'Send reminder', variant: 'warning'
        }, function (message) {
          E.sendReminder(id, message);
          SASO.layout.toast('Reminder sent.');
          render();
        });
      });
    });
  }

  function clearFilters() {
    state = { search: '', org: '', activity: '', phase: '', status: '', page: 1 };
    document.getElementById('fSearch').value = '';
    ['fOrg', 'fActivity', 'fPhase', 'fStatus'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    render();
  }

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  document.getElementById('fOrg').addEventListener('change', function () {
    state.org = this.value; state.activity = ''; state.page = 1; render();
  });
  document.getElementById('fActivity').addEventListener('change', function () {
    state.activity = this.value; state.page = 1; render();
  });
  document.getElementById('fPhase').addEventListener('change', function () {
    state.phase = this.value; state.page = 1; render();
  });
  document.getElementById('fStatus').addEventListener('change', function () {
    state.status = this.value; state.page = 1; render();
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  render();
})();
