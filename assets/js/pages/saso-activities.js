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
                from: '', to: '', sort: 'eventDate', dir: 'desc', dateField: 'start', page: 1 };

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
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-3 mb-2">' +
            '<label for="fSearch" class="text-sm">Search</label>' +
            '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
              'placeholder="Activity or venue"></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fOrg" class="text-sm">Organization</label>' +
            '<select class="form-control form-control-sm" id="fOrg"></select></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fStage" class="text-sm">Stage</label>' +
            '<select class="form-control form-control-sm" id="fStage"></select></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fCategory" class="text-sm">Category</label>' +
            '<select class="form-control form-control-sm" id="fCategory"></select></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fVenue" class="text-sm">Venue</label>' +
            '<select class="form-control form-control-sm" id="fVenue"></select></div>' +
          '<div class="form-group col-md-1 mb-2">' +
            '<button type="button" class="btn btn-sm btn-light btn-block" id="btnClear">Clear</button></div>' +
        '</div>' +
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fFrom" class="text-sm">Event date from</label>' +
            '<input type="date" class="form-control form-control-sm" id="fFrom"></div>' +
          '<div class="form-group col-md-2 mb-2">' +
            '<label for="fTo" class="text-sm">to</label>' +
            '<input type="date" class="form-control form-control-sm" id="fTo"></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="pager"></div>' +
    '</div>';

  L.fillSelect('fOrg', M.db().organizations.map(function (o) {
    return { value: o.id, label: o.acronym };
  }), 'All organizations', state.org);

  L.fillSelect('fStage', Object.keys(C.STAGE).map(function (k) {
    return { value: k, label: C.LABEL[k] };
  }), 'All stages', state.stage);

  L.fillSelect('fCategory', C.ACTIVITY_CATEGORIES.map(function (c) {
    return { value: c, label: c };
  }), 'All categories');

  L.fillSelect('fVenue', Object.keys(C.VENUE).map(function (k) {
    return { value: C.VENUE[k], label: C.LABEL[C.VENUE[k]] };
  }), 'All venue types');

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

    return L.sort(list, state, function (a, key) {
      if (key === 'org') { return M.orgAcronym(a.organizationId); }
      if (key === 'eventDate') { return new Date(L.pickedDate(a, state) || 0); }
      if (key === 'updated') { return new Date(a.updatedAt || 0); }
      if (key === 'participants') { return a.expectedParticipants || 0; }
      return a[key];
    });
  }

  function render() {
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
      paged.slice.map(function (a) {
        var ts = M.terminalStatus(a);
        var overdue = ts === C.TERMINAL.OVERDUE;

        return '<tr class="' + (overdue ? 'row-overdue' : '') + '">' +
          '<td>' + M.escapeHtml(M.orgAcronym(a.organizationId)) + '</td>' +
          '<td><a href="activity-details.html?id=' + a.id + '" class="cell-primary">' +
            M.escapeHtml(a.title) + '</a>' +
            '<span class="cell-sub">' + M.label(a.venueType) + ' · ' +
            M.escapeHtml(a.venue || '—') + '</span></td>' +
          '<td class="text-sm">' + M.escapeHtml(a.category || '—') + '</td>' +
          '<td class="text-nowrap">' + M.formatDate(L.pickedDate(a, state)) + '</td>' +
          '<td class="text-center">' + (a.expectedParticipants || '—') + '</td>' +
          '<td>' + M.badge(a.proposalStatus) + '</td>' +
          '<td>' + (a.eventStatus === C.EVENT.NOT_APPLICABLE ? '—' : M.badge(a.eventStatus)) + '</td>' +
          '<td>' + (ts === C.TERMINAL.NOT_APPLICABLE ? '—' : M.badge(ts)) +
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

  function clearFilters() {
    state.search = ''; state.org = ''; state.stage = '';
    state.category = ''; state.venue = ''; state.from = ''; state.to = ''; state.page = 1;
    ['fSearch', 'fOrg', 'fStage', 'fCategory', 'fVenue', 'fFrom', 'fTo'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    render();
  }

  [['fSearch', 'search', 'input'], ['fOrg', 'org', 'change'], ['fStage', 'stage', 'change'],
   ['fCategory', 'category', 'change'], ['fVenue', 'venue', 'change'],
   ['fFrom', 'from', 'change'], ['fTo', 'to', 'change']].forEach(function (cfg) {
    document.getElementById(cfg[0]).addEventListener(cfg[2], function () {
      state[cfg[1]] = this.value; state.page = 1; render();
    });
  });
  document.getElementById('btnClear').addEventListener('click', clearFilters);

  render();
})();
