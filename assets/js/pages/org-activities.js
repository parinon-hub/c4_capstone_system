/* =========================================================================
   org-activities.js  —  The organization's own activity list.

   Search, the Sort and Filter menus and pagination all operate on the
   simulated data. The Sort menu works like a file manager's: pick what to
   sort by, ascending or descending, and optionally group the rows. Each row carries one contextual action: the single next thing this
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
    title: 'Activities',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'Activities' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var P = SASO.proposalActions;
  var L = SASO.listview;
  var state = { search: '', stage: '', category: '', page: 1, dateField: 'start',
                sort: 'updatedAt', dir: 'desc', group: '' };

  var STAGE_ORDER = Object.keys(C.STAGE);
  var SORTS = [
    { key: 'title',     label: 'Activity name' },
    { key: 'eventDate', label: 'Event date' },
    { key: 'stage',     label: 'Stage' },
    { key: 'category',  label: 'Category' },
    { key: 'updatedAt', label: 'Last update' }
  ];
  var GROUPS = [
    { key: '',         label: 'None' },
    { key: 'stage',    label: 'Stage' },
    { key: 'category', label: 'Category' }
  ];

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

  /* ---- sort and filter menus --------------------------------------------------- */

  function menuItem(attrs, label, selected) {
    return '<a href="#" class="dropdown-item' + (selected ? ' is-selected' : '') + '" ' + attrs + '>' +
      label + '</a>';
  }

  function renderMenus() {
    document.getElementById('sortMenu').innerHTML =
      '<h6 class="dropdown-header">Sort by</h6>' +
      SORTS.map(function (o) {
        return menuItem('data-sort="' + o.key + '"', o.label, state.sort === o.key);
      }).join('') +
      '<div class="dropdown-divider"></div>' +
      menuItem('data-dir="asc"', 'Ascending', state.dir === 'asc') +
      menuItem('data-dir="desc"', 'Descending', state.dir === 'desc') +
      '<div class="dropdown-divider"></div>' +
      '<h6 class="dropdown-header">Group by</h6>' +
      GROUPS.map(function (o) {
        return menuItem('data-group="' + o.key + '"', o.label, state.group === o.key);
      }).join('');

    document.getElementById('filterMenu').innerHTML =
      '<div class="list-menu-cols">' +
        '<div><h6 class="dropdown-header">Stage</h6>' +
          menuItem('data-stage=""', 'All stages', !state.stage) +
          STAGE_ORDER.map(function (k) {
            return menuItem('data-stage="' + k + '"', C.LABEL[k], state.stage === k);
          }).join('') + '</div>' +
        '<div><h6 class="dropdown-header">Category</h6>' +
          menuItem('data-category=""', 'All categories', !state.category) +
          C.ACTIVITY_CATEGORIES.map(function (c) {
            return menuItem('data-category="' + M.escapeHtml(c) + '"', M.escapeHtml(c), state.category === c);
          }).join('') + '</div>' +
      '</div>';

    var active = (state.stage ? 1 : 0) + (state.category ? 1 : 0);
    document.getElementById('filterCount').innerHTML = active
      ? ' <span class="badge badge-primary ml-1">' + active + '</span>' : '';
    document.getElementById('btnFilter').classList.toggle('is-active', !!active);

    /* Active filters also show as removable chips under the toolbar. */
    var chips = [];
    if (state.stage) { chips.push({ key: 'stage', label: 'Stage: ' + C.LABEL[state.stage] }); }
    if (state.category) { chips.push({ key: 'category', label: 'Category: ' + M.escapeHtml(state.category) }); }
    document.getElementById('activeChips').innerHTML = chips.map(function (c) {
      return '<span class="list-chip">' + c.label +
        '<button type="button" data-unfilter="' + c.key + '" aria-label="Remove filter">' +
        '<i class="fa-solid fa-xmark"></i></button></span>';
    }).join('');
  }

  function onMenuClick(e) {
    var item = e.target.closest('[data-sort],[data-dir],[data-group],[data-stage],[data-category]');
    if (!item) { return; }
    e.preventDefault();
    if (item.hasAttribute('data-sort')) { state.sort = item.getAttribute('data-sort'); }
    if (item.hasAttribute('data-dir')) { state.dir = item.getAttribute('data-dir'); }
    if (item.hasAttribute('data-group')) { state.group = item.getAttribute('data-group'); }
    if (item.hasAttribute('data-stage')) { state.stage = item.getAttribute('data-stage'); state.page = 1; }
    if (item.hasAttribute('data-category')) { state.category = item.getAttribute('data-category'); state.page = 1; }
    render();
  }
  document.getElementById('sortMenu').addEventListener('click', onMenuClick);
  document.getElementById('filterMenu').addEventListener('click', onMenuClick);
  document.getElementById('activeChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-unfilter]');
    if (!b) { return; }
    state[b.getAttribute('data-unfilter')] = ''; state.page = 1;
    render();
  });

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

  /* ---- filtering ------------------------------------------------------------------ */

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
      var g = state.group ? compare(groupValue(x), groupValue(y)) : 0;
      if (g) { return g; }
      var c = compare(sortValue(x, state.sort), sortValue(y, state.sort));
      return state.dir === 'asc' ? c : -c;
    });

    return rows;
  }

  function sortValue(a, key) {
    if (key === 'title') { return (a.title || '').toLowerCase(); }
    if (key === 'eventDate') { return new Date(L.pickedDate(a, state) || 0).getTime(); }
    if (key === 'stage') { return STAGE_ORDER.indexOf(M.stageOf(a)); }
    if (key === 'category') { return (a.category || '').toLowerCase(); }
    return new Date(a.updatedAt || 0).getTime();
  }

  /* Groups follow the lifecycle for stages and A–Z for categories. */
  function groupValue(a) {
    return state.group === 'stage' ? STAGE_ORDER.indexOf(M.stageOf(a)) : (a.category || '').toLowerCase();
  }

  function groupLabel(a) {
    return state.group === 'stage' ? C.LABEL[M.stageOf(a)] : (a.category || 'No category');
  }

  function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function progressCell(activityId) {
    var p = M.requirementProgress(activityId, C.PHASE.PRE_APPROVAL);
    return '<div class="req-progress ' + (p.approved === p.mandatory ? 'is-complete' : '') + '">' +
      '<div class="progress"><div class="progress-bar" style="width:' + p.percent + '%"></div></div>' +
      '<span class="req-count">' + p.approved + '/' + p.mandatory + '</span>' +
    '</div>';
  }

  /* ---- render -------------------------------------------------------------------- */

  function render() {
    renderTrashButton();
    renderMenus();
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
            '<p>Try clearing the search or choosing different filters.</p>' +
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
        L.header('Activity') +
        L.dateHeader(state, 'Event Date') +
        '<th>Proposal</th><th>Requirements</th><th>Stage</th>' +
        L.header('Last Update') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      slice.map(function (a, i) {
        var groupRow = '';
        if (state.group && (i === 0 || groupLabel(slice[i - 1]) !== groupLabel(a))) {
          var label = groupLabel(a);
          var count = rows.filter(function (r) { return groupLabel(r) === label; }).length;
          groupRow = '<tr class="group-row"><td colspan="7">' + M.escapeHtml(label) +
            '<span class="group-count">' + count + '</span></td></tr>';
        }
        var action = nextAction(a);
        var stage = M.stageOf(a);
        var rowClass = M.terminalStatus(a) === C.TERMINAL.OVERDUE ? 'row-overdue'
          : (a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
             a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED) ? 'row-stale' : '';

        return groupRow + '<tr class="' + rowClass + '">' +
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
    render();
  }

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  render();
})();
