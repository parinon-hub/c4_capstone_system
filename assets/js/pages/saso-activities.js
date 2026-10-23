/* =========================================================================
   saso-activities.js  —  The master activity list.

   Where the proposals queue shows what is moving toward approval, this shows
   everything, at every stage. It is the screen that replaces scrolling the
   consolidated workbook.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var L = SASO.listview;
  var PAGE_SIZE = 12;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'activities',
    title: 'Activities',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' }, { label: 'Activities' }]
  });
  if (!session) { return; }

  var state = { search: '', org: '', stage: '', category: '', venue: '',
                from: '', to: '', sort: 'eventDate', dir: 'desc', group: '', dateField: 'start', page: 1 };
  var STAGE_ORDER = Object.keys(C.STAGE);

  var qs = new URLSearchParams(window.location.search);
  var presetStage = qs.get('stage');
  if (presetStage && C.STAGE[presetStage]) { state.stage = presetStage; }
  var presetOrg = qs.get('org');
  if (presetOrg && M.orgById(presetOrg)) { state.org = presetOrg; }

  document.getElementById('pageRoot').innerHTML =
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">All activities</h3>' +
        '<div class="card-tools"><span class="card-subtitle" id="resultCount"></span></div>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        L.toolbarHtml('Search activity, organization or venue') +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="pager"></div>' +
    '</div>';

  /* ---- sort and filter menus --------------------------------------------------- */

  var tb = L.toolbar({
    state: state,
    onChange: render,
    sorts: [
      { key: 'org',          label: 'Organization' },
      { key: 'title',        label: 'Activity' },
      { key: 'category',     label: 'Category' },
      { key: 'eventDate',    label: 'Event date' },
      { key: 'participants', label: 'Participants' },
      { key: 'stage',        label: 'Stage' }
    ],
    groups: [
      { key: '',         label: 'None' },
      { key: 'org',      label: 'Organization', of: function (a) { return M.orgAcronym(a.organizationId); } },
      { key: 'stage',    label: 'Stage', of: function (a) { return C.LABEL[M.stageOf(a)]; },
        rank: function (a) { return STAGE_ORDER.indexOf(M.stageOf(a)); } },
      { key: 'category', label: 'Category', of: function (a) { return a.category || 'No category'; } }
    ],
    filters: [
      { key: 'org', label: 'Organization', all: 'All organizations',
        options: M.db().organizations.map(function (o) { return { value: o.id, label: o.acronym }; }) },
      { key: 'stage', label: 'Stage', all: 'All stages',
        /* Drafts never reach SASO, so there is nothing to filter for. */
        options: STAGE_ORDER.filter(function (k) { return k !== C.STAGE.DRAFT; })
          .map(function (k) { return { value: k, label: C.LABEL[k] }; }) },
      { key: 'category', label: 'Category', all: 'All categories',
        options: C.ACTIVITY_CATEGORIES.map(function (c) { return { value: c, label: c }; }) },
      { key: 'venue', label: 'Venue', all: 'All venue types',
        options: Object.keys(C.VENUE).map(function (k) {
          return { value: C.VENUE[k], label: C.LABEL[C.VENUE[k]] };
        }) }
    ],
    /* Filters on the start date, as the old "Event date from / to" fields did. */
    range: { from: 'from', to: 'to', label: 'Event date' }
  });

  function rows() {
    var q = state.search.toLowerCase();

    var list = M.allActivities().filter(function (a) {
      if (a.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
      if (state.org && a.organizationId !== state.org) { return false; }
      if (state.stage && M.stageOf(a) !== state.stage) { return false; }
      if (state.category && a.category !== state.category) { return false; }
      if (state.venue && a.venueType !== state.venue) { return false; }
      if (state.from && a.dateStart && a.dateStart < state.from) { return false; }
      if (state.to && a.dateStart && a.dateStart > state.to) { return false; }
      if (q) {
        var hay = ((a.title || '') + ' ' + (a.venue || '') + ' ' +
                   M.orgAcronym(a.organizationId)).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    return tb.order(list, function (a, key) {
      if (key === 'org') { return M.orgAcronym(a.organizationId); }
      if (key === 'title') { return a.title || ''; }
      if (key === 'category') { return a.category || ''; }
      if (key === 'participants') { return a.expectedParticipants || 0; }
      if (key === 'stage') { return STAGE_ORDER.indexOf(M.stageOf(a)); }
      return new Date(L.pickedDate(a, state) || 0).getTime();
    });
  }

  function render() {
    tb.refresh();
    var list = rows();
    var paged = L.paginate(list, state, PAGE_SIZE);
    var host = document.getElementById('tableHost');

    document.getElementById('resultCount').textContent =
      list.length + ' activit' + (list.length === 1 ? 'y' : 'ies');

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-folder-open"></i>' +
        '<h6>No activities match these filters</h6>' +
        '<p>Try a wider date range or clear the filters.</p>' +
        '<button type="button" class="btn btn-sm btn-light" id="btnClearInline">Clear filters</button>' +
      '</div>';
      document.getElementById('btnClearInline').addEventListener('click', clearFilters);
      L.renderPager('pager', 0, 1, state, PAGE_SIZE, render);
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        L.header('Organization') +
        L.header('Activity') +
        L.header('Category') +
        L.dateHeader(state, 'Event Date') +
        L.header('Participants', 'text-center') +
        '<th>Proposal</th><th>Event</th><th>Reports</th><th>Stage</th><th></th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (a, i) {
        var ts = M.terminalStatus(a);
        var overdue = ts === C.TERMINAL.OVERDUE;

        return tb.groupRow(paged.slice, i, list, 10) + '<tr class="' + (overdue ? 'row-overdue' : '') + '">' +
          '<td>' + M.escapeHtml(M.orgAcronym(a.organizationId)) + '</td>' +
          '<td><a href="activity-details.html?id=' + a.id + '" class="cell-primary">' +
            M.escapeHtml(a.title) + '</a>' +
            '<span class="cell-sub">' + M.label(a.venueType) + ' · ' +
            M.escapeHtml(a.venue || '-') + '</span></td>' +
          '<td class="text-sm">' + M.escapeHtml(a.category || '-') + '</td>' +
          '<td class="text-nowrap">' + M.formatDate(L.pickedDate(a, state)) + '</td>' +
          '<td class="text-center">' + (a.expectedParticipants || '-') + '</td>' +
          '<td>' + M.badge(a.proposalStatus) + '</td>' +
          '<td>' + (a.eventStatus === C.EVENT.NOT_APPLICABLE ? '-' : M.badge(a.eventStatus)) + '</td>' +
          '<td>' + (ts === C.TERMINAL.NOT_APPLICABLE ? '-' : M.badge(ts)) +
            (overdue ? '<span class="cell-sub text-danger">' + M.daysPending(a) +
              ' days late</span>' : '') + '</td>' +
          '<td>' + M.badge(M.stageOf(a)) + '</td>' +
          '<td class="text-right"><a class="btn btn-sm btn-outline-primary" ' +
            'href="activity-details.html?id=' + a.id + '">Open</a></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    L.bindDatePick(host, state, render);
    L.renderPager('pager', list.length, paged.pages, state, PAGE_SIZE, render);
  }

  function clearFilters() { tb.clear(); }

  render();
})();
