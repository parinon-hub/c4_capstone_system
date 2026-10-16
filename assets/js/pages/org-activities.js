/* =========================================================================
   org-activities.js  —  The organization's own activity list.

   Search, filtering, sorting and pagination all operate on the simulated
   data. Each row carries one contextual action: the single next thing this
   organization has to do for that activity.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var PAGE_SIZE = 10;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'activities',
    title: 'My Activities',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'My Activities' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var P = SASO.proposalActions;
  var L = SASO.listview;
  var state = { search: '', stage: '', category: '', sort: 'updatedAt', dir: 'desc', page: 1,
                dateField: 'start' };

  /* Confirmation after returning from the wizard. */
  var submitted = new URLSearchParams(window.location.search).get('submitted');
  if (submitted) {
    var justSubmitted = M.activityById(submitted);
    if (justSubmitted) {
      SASO.layout.toast('Proposal submitted — SASO has been notified.');
      window.history.replaceState({}, '', 'activities.html');
    }
  }

  /* Confirmation after deleting from Activity Details. */
  if (new URLSearchParams(window.location.search).get('trashed')) {
    SASO.layout.toast('Moved to the trash bin. You can restore it within ' +
      C.TRASH_RETENTION_DAYS + ' days.', 'warning');
    window.history.replaceState({}, '', 'activities.html');
  }

  /* Trash bin button beside Submit activity. */
  var tools = document.querySelector('.card-tools');
  function renderTrashButton() {
    var slot = document.getElementById('trashSlot');
    if (!slot) {
      tools.insertAdjacentHTML('afterbegin', '<span id="trashSlot" class="mr-1"></span>');
      slot = document.getElementById('trashSlot');
    }
    slot.innerHTML = P.trashButton('trash.html');
  }

  /* ---- filter controls ------------------------------------------------------ */

  var stageSelect = document.getElementById('fStage');
  stageSelect.innerHTML = '<option value="">All stages</option>' +
    Object.keys(C.STAGE).map(function (k) {
      return '<option value="' + k + '">' + C.LABEL[k] + '</option>';
    }).join('');

  var categorySelect = document.getElementById('fCategoryFilter');
  categorySelect.innerHTML = '<option value="">All categories</option>' +
    C.ACTIVITY_CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

  /* ---- contextual next action ------------------------------------------------ */

  function nextAction(a) {
    var stage = M.stageOf(a);
    var unread = M.commentsFor(a.id).some(function (c) {
      return c.role === C.ROLE.SASO && !c.readByCounterpart;
    });

    if (a.proposalStatus === C.PROPOSAL.DRAFT) {
      return { label: 'Continue', href: 'submit-activity.html?id=' + a.id, variant: 'primary' };
    }
    if (stage === C.STAGE.AWAITING_TERMINAL_REPORT) {
      var overdue = M.terminalStatus(a) === C.TERMINAL.OVERDUE;
      return { label: 'Submit reports',
               href: 'terminal-reports.html?id=' + a.id,
               variant: overdue ? 'danger' : 'warning' };
    }
    if (a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED) {
      return { label: 'Submit requirement',
               href: 'activity-details.html?id=' + a.id,
               variant: 'warning' };
    }
    if (a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED) {
      return { label: 'Revise',
               href: 'activity-details.html?id=' + a.id,
               variant: 'warning' };
    }
    if (unread) {
      return { label: 'Respond',
               href: 'activity-details.html?id=' + a.id,
               variant: 'info' };
    }
    return { label: 'View',
             href: 'activity-details.html?id=' + a.id,
             variant: 'outline-primary' };
  }

  /* ---- filtering and sorting -------------------------------------------------- */

  function filtered() {
    var q = state.search.toLowerCase();

    var rows = M.activitiesFor(org.id).filter(function (a) {
      if (state.stage && M.stageOf(a) !== state.stage) { return false; }
      if (state.category && a.category !== state.category) { return false; }
      if (q) {
        var haystack = ((a.title || '') + ' ' + (a.venue || '') + ' ' + (a.category || '')).toLowerCase();
        if (haystack.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    rows.sort(function (x, y) {
      var a = x[state.sort], b = y[state.sort];
      if (state.sort === 'title') {
        a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
        return state.dir === 'asc' ? (a < b ? -1 : a > b ? 1 : 0) : (a > b ? -1 : a < b ? 1 : 0);
      }
      a = new Date(a || 0); b = new Date(b || 0);
      return state.dir === 'asc' ? a - b : b - a;
    });

    return rows;
  }

  function progressCell(activityId) {
    var p = M.requirementProgress(activityId, C.PHASE.PRE_APPROVAL);
    return '<div class="req-progress ' + (p.approved === p.mandatory ? 'is-complete' : '') + '">' +
      '<div class="progress"><div class="progress-bar" style="width:' + p.percent + '%"></div></div>' +
      '<span class="req-count">' + p.approved + '/' + p.mandatory + '</span>' +
    '</div>';
  }

  function sortHeader(key, label) {
    var active = state.sort === key;
    var icon = !active ? 'fa-sort'
      : state.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    return '<th><a href="#" class="sort-link' + (active ? ' is-active' : '') +
      '" data-sort="' + key + '">' + label +
      ' <i class="fa-solid ' + icon + '"></i></a></th>';
  }

  /* ---- render -------------------------------------------------------------------- */

  function render() {
    renderTrashButton();
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > pages) { state.page = pages; }
    var slice = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    var host = document.getElementById('activitiesTable');

    if (!rows.length) {
      var filtering = state.search || state.stage || state.category;
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-folder-open"></i>' +
        (filtering
          ? '<h6>No activities match these filters</h6>' +
            '<p>Try clearing the search or choosing a different stage.</p>' +
            '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>'
          : '<h6>You have not submitted any activities yet</h6>' +
            '<p>Start by creating an activity request for SASO to review.</p>' +
            '<a href="submit-activity.html" class="btn btn-sm btn-primary">Submit activity</a>') +
      '</div>';
      var inline = document.getElementById('btnClearInline');
      if (inline) { inline.addEventListener('click', clearFilters); }
      document.getElementById('pager').innerHTML = '';
      return;
    }

    /* `top-scroll` puts the horizontal scrollbar above the table (layout.js). */
    host.innerHTML = '<div class="table-responsive top-scroll"><table class="table table-hover">' +
      '<thead><tr>' +
        sortHeader('title', 'Activity') +
        L.dateHeader(state, 'Event Date') +
        '<th>Proposal</th><th>Requirements</th><th>Stage</th>' +
        sortHeader('updatedAt', 'Last Update') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      slice.map(function (a) {
        var action = nextAction(a);
        var stage = M.stageOf(a);
        var rowClass = M.terminalStatus(a) === C.TERMINAL.OVERDUE ? 'row-overdue'
          : (a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
             a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED) ? 'row-stale' : '';

        return '<tr class="' + rowClass + '">' +
          '<td><span class="cell-primary">' + M.escapeHtml(a.title || 'Untitled draft') + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(a.category || '—') + ' · ' +
              M.label(a.venueType) + ' · ' + M.escapeHtml(a.venue || '—') + '</span></td>' +
          '<td class="text-nowrap">' + M.formatDate(L.pickedDate(a, state)) + '</td>' +
          '<td>' + M.badge(a.proposalStatus) +
            (M.isInApprovalRoute(a)
              ? '<span class="cell-sub">' + M.daysWithCurrentOffice(a.id) + ' days with this office</span>'
              : '') + '</td>' +
          '<td>' + progressCell(a.id) + '</td>' +
          '<td>' + M.badge(stage) + '</td>' +
          '<td class="text-nowrap text-muted">' + M.relativeTime(a.updatedAt) + '</td>' +
          '<td class="text-right text-nowrap"><a class="btn btn-sm btn-' + action.variant + '" href="' +
            action.href + '">' + action.label + '</a>' + P.rowButtons(a) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    host.querySelectorAll('.sort-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var key = this.getAttribute('data-sort');
        if (state.sort === key) {
          state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = key;
          state.dir = key === 'title' ? 'asc' : 'desc';
        }
        render();
      });
    });

    L.bindDatePick(host, state, render);
    renderPager(rows.length, pages);
    P.bind(host, render, render);
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
      (pages > 1
        ? '<ul class="pagination pagination-sm mb-0 ml-auto">' +
            '<li class="page-item' + (state.page === 1 ? ' disabled' : '') + '">' +
              '<a class="page-link" href="#" data-page="' + (state.page - 1) + '">&laquo;</a></li>' +
            buttons +
            '<li class="page-item' + (state.page === pages ? ' disabled' : '') + '">' +
              '<a class="page-link" href="#" data-page="' + (state.page + 1) + '">&raquo;</a></li>' +
          '</ul>'
        : '');

    document.querySelectorAll('#pager .page-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var p = Number(this.getAttribute('data-page'));
        if (p >= 1 && p <= pages) { state.page = p; render(); }
      });
    });
  }

  /* ---- controls -------------------------------------------------------------------- */

  function clearFilters() {
    state.search = ''; state.stage = ''; state.category = ''; state.page = 1;
    document.getElementById('fSearch').value = '';
    stageSelect.value = '';
    categorySelect.value = '';
    render();
  }

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  stageSelect.addEventListener('change', function () {
    state.stage = this.value; state.page = 1; render();
  });
  categorySelect.addEventListener('change', function () {
    state.category = this.value; state.page = 1; render();
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  render();
})();
