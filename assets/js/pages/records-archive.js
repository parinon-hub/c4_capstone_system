/* =========================================================================
   records-archive.js  -  Records Archive, one controller for both portals.

   Panel RSC: keep at least three years of organizational activity and
   accomplishment records to support accreditation. Every activity belongs
   to an academic year; this page lists the records of each year, shows how
   long each year must still be kept, and produces the CHED-format Annual
   Accomplishment Report (per organization) and, for SASO, the Report on
   Student Organizations and Activities (institution-wide).

   Records are never deleted automatically. A conducted activity cannot be
   deleted while its retention period runs; once the period has passed the
   year is only flagged as eligible for disposal by SASO.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var esc = function (v) { return M.escapeHtml(v); };

  var current = SASO.auth.current();
  var isSaso = !!current && current.role === C.ROLE.SASO;

  var session = SASO.layout.init({
    role: isSaso ? C.ROLE.SASO : C.ROLE.ORG,
    page: 'records',
    title: 'Records Archive',
    breadcrumb: [{ label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
                 { label: 'Records Archive' }]
  });
  if (!session) { return; }

  var params = new URLSearchParams(window.location.search);
  /* An organization sees only the years it has records in, plus the current one. */
  var years = M.academicYears().filter(function (ay) {
    return isSaso || ay === M.currentAcademicYear() ||
      M.activitiesInYear(ay, current && current.organizationId).length > 0;
  });
  var state = {
    ay: years.indexOf(params.get('ay')) !== -1 ? params.get('ay') : M.currentAcademicYear(),
    org: isSaso ? (params.get('org') || '') : session.organizationId,
    q: '',
    page: 1,
    report: null
  };
  var PAGE_SIZE = 25;

  document.getElementById('pageRoot').innerHTML =
    '<div class="callout callout-info text-sm py-2 no-print"><i class="fa-solid fa-box-archive mr-2"></i>' +
      'Activity and accomplishment records are kept for at least <strong>' + M.retentionYears() +
      ' academic years</strong> after the year they belong to, so the last ' + M.retentionYears() +
      ' years are always on file for accreditation and re-accreditation. A conducted activity ' +
      'cannot be deleted during that period, and no record is ever deleted automatically.</div>' +
    '<div class="card no-print">' +
      '<div class="card-header"><h3 class="card-title">Show records for</h3></div>' +
      '<div class="card-body py-2">' +
        '<div class="form-row align-items-start">' +
          '<div class="form-group col-md-4 mb-2"><label for="fAY" class="text-sm mb-1">Academic year</label>' +
            '<select class="form-control form-control-sm" id="fAY"></select>' +
            '<small class="form-text text-muted" id="ayRange"></small></div>' +
          (isSaso
            ? '<div class="form-group col-md-4 mb-2"><label for="fOrg" class="text-sm mb-1">Organization</label>' +
                '<select class="form-control form-control-sm" id="fOrg"></select></div>'
            : '') +
        '</div>' +
        '<div id="retentionLine" class="text-sm"></div>' +
      '</div>' +
    '</div>' +
    '<div class="row no-print" id="tiles"></div>' +
    '<div class="card no-print">' +
      '<div class="card-header"><h3 class="card-title" id="listTitle">Activities</h3>' +
        '<div class="card-tools" id="reportButtons"></div></div>' +
      '<div class="card-body border-bottom py-2">' +
        '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
          'placeholder="Search activity, organization or venue"></div>' +
      '<div class="card-body p-0" id="listHost"></div>' +
      '<div class="card-footer d-flex align-items-center" id="listPager"></div>' +
    '</div>' +
    '<div id="reportHost"></div>';

  function fillOrgs() {
    if (!isSaso) { return; }
    var orgs = M.organizationsForYear(state.ay).slice().sort(function (a, b) {
      return a.acronym.localeCompare(b.acronym);
    });
    if (state.org && !orgs.some(function (o) { return o.id === state.org; })) { state.org = ''; }
    SASO.listview.fillSelect('fOrg', orgs.map(function (o) {
      return { value: o.id, label: o.acronym + (o.archiveOnly ? ' (past records)' : '') };
    }), 'All organizations', state.org);
  }

  if (isSaso) {
    document.getElementById('fOrg').addEventListener('change', function () {
      state.org = this.value; state.page = 1; state.report = null; render();
    });
  }
  document.getElementById('fAY').addEventListener('change', function () {
    state.ay = this.value; state.page = 1; state.report = null; render();
  });
  document.getElementById('fSearch').addEventListener('input', function () {
    state.q = this.value.trim().toLowerCase(); state.page = 1; renderList(currentActs);
  });
  var currentActs = [];

  function retentionBadge(ay) {
    return M.isRetained(ay)
      ? '<span class="badge badge-success status-badge">Within retention period</span>'
      : '<span class="badge badge-secondary status-badge">Retention period met</span>';
  }

  function renderTabs() {
    var sel = document.getElementById('fAY');
    sel.innerHTML = years.map(function (ay) {
      return '<option value="' + ay + '"' + (state.ay === ay ? ' selected' : '') + '>AY ' + ay +
        (ay === M.currentAcademicYear() ? ' (current)' : '') + '</option>';
    }).join('');
    var range = M.academicYearRange(state.ay);
    document.getElementById('ayRange').textContent = M.formatDate(range.from) + ' to ' + M.formatDate(range.to);

    var until = M.retainUntil(state.ay);
    document.getElementById('retentionLine').innerHTML = retentionBadge(state.ay) + ' ' +
      (M.isRetained(state.ay)
        ? 'Records of AY ' + esc(state.ay) + ' must be kept until <strong>' + M.formatDate(until) + '</strong>.'
        : 'The records of AY ' + esc(state.ay) + ' were required until ' + M.formatDate(until) +
          '. They are still kept; SASO may decide to dispose of them under its records policy.');
  }

  function renderTiles(acts) {
    var conducted = SASO.ched.conducted(state.ay, state.org || null);
    var docs = 0, accepted = 0;
    conducted.forEach(function (a) {
      M.requirementsFor(a.id, C.PHASE.POST_ACTIVITY).forEach(function (r) {
        if (r.status !== C.REQUIREMENT.NOT_SUBMITTED) { docs += 1; }
        if (r.status === C.REQUIREMENT.APPROVED) { accepted += 1; }
      });
    });
    var tiles = [
      { v: acts.length, l: 'On record', i: 'fa-folder-open' },
      { v: conducted.length, l: 'Conducted', i: 'fa-flag-checkered' },
      { v: conducted.filter(SASO.ched.reportsComplete).length, l: 'Reports complete', i: 'fa-file-circle-check', mod: 'is-complete' },
      { v: accepted + ' / ' + docs, l: 'Documents accepted', i: 'fa-paperclip' },
      { v: conducted.reduce(function (s, a) { return s + SASO.ched.participants(a); }, 0), l: 'Participants', i: 'fa-users' }
    ];
    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.i + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.v + '</span>' +
        '<span class="stat-label">' + t.l + '</span></div></div>';
    }).join('');
  }

  function renderList(acts) {
    var base = isSaso ? 'pages/saso/' : 'pages/org/';
    document.getElementById('listTitle').textContent = 'Activities, AY ' + state.ay +
      (state.org ? ' · ' + M.orgAcronym(state.org) : '');

    var buttons = [];
    if (state.org) {
      buttons.push('<button type="button" class="btn btn-sm btn-primary mr-1" data-report="annual">' +
        '<i class="fa-solid fa-file-lines mr-1"></i>Annual Accomplishment Report</button>');
      buttons.push('<button type="button" class="btn btn-sm btn-outline-primary mr-1" data-report="accreditation">' +
        '<i class="fa-solid fa-award mr-1"></i>Accreditation and Leveling</button>');
    }
    buttons.push('<button type="button" class="btn btn-sm btn-outline-success mr-1" data-report="list">' +
      '<i class="fa-solid fa-file-excel mr-1"></i>List of Student Activities</button>');
    if (isSaso) {
      buttons.push('<button type="button" class="btn btn-sm btn-outline-primary" data-report="institutional">' +
        '<i class="fa-solid fa-landmark mr-1"></i>Report on Student Organizations and Activities</button>');
    }
    document.getElementById('reportButtons').innerHTML = buttons.join('');
    document.querySelectorAll('[data-report]').forEach(function (b) {
      b.addEventListener('click', function () { state.report = this.getAttribute('data-report'); renderReport(true); });
    });

    var host = document.getElementById('listHost');
    var pager = document.getElementById('listPager');
    if (state.q) {
      acts = acts.filter(function (a) {
        return [a.title, a.venue, a.category, M.orgAcronym(a.organizationId), (M.orgById(a.organizationId) || {}).name]
          .join(' ').toLowerCase().indexOf(state.q) !== -1;
      });
    }
    if (!acts.length) {
      pager.innerHTML = '';
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-folder-open"></i>' +
        '<h6>No records for AY ' + esc(state.ay) + (state.q ? ' match your search' : '') +
        '</h6><p>Choose another academic year' + (isSaso ? ' or organization' : '') + '.</p></div>';
      return;
    }
    var paged = SASO.listview.paginate(acts, state, PAGE_SIZE);
    SASO.listview.renderPager('listPager', acts.length, paged.pages, state, PAGE_SIZE, function () {
      renderList(currentActs);
      document.getElementById('listTitle').scrollIntoView({ block: 'start' });
    });
    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' + (isSaso ? '<th>Organization</th>' : '') +
        '<th>Activity</th><th>Date</th><th>Venue</th><th>Stage</th><th>Post-activity reports</th><th>Kept until</th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (a) {
        var imported = M.isImported(a);
        var reqs = M.requirementsFor(a.id, C.PHASE.POST_ACTIVITY);
        var mandatory = reqs.filter(function (r) { return r.mandatory; });
        var ok = mandatory.filter(function (r) { return r.status === C.REQUIREMENT.APPROVED; }).length;
        return '<tr>' +
          (isSaso ? '<td><span class="cell-primary">' + esc(M.orgAcronym(a.organizationId)) + '</span></td>' : '') +
          '<td><a class="cell-primary" href="' + SASO.layout.href(base + 'activity-details.html?id=' + a.id) + '">' +
            esc(a.title) + '</a><span class="cell-sub">' + esc(a.category) +
            (imported ? ' · <span class="badge badge-light border" title="' + esc(a.source || 'SASO list of student activities') +
              '">From SASO list</span>' : '') + '</span></td>' +
          '<td class="text-sm">' + esc(M.activityDateText(a)) + '</td>' +
          '<td class="text-sm">' + esc(a.venue) + '<span class="cell-sub">' + M.label(a.venueType) + '</span></td>' +
          '<td>' + (imported ? '<span class="badge badge-success status-badge">Conducted</span>' : M.badge(M.stageOf(a))) + '</td>' +
          '<td class="text-sm">' + (reqs.length ? ok + ' of ' + mandatory.length + ' accepted' : '<span class="text-muted">Not yet due</span>') + '</td>' +
          '<td class="text-sm text-nowrap">' + M.formatDate(M.retainUntil(state.ay)) +
            (M.isProtectedRecord(a) ? '<span class="cell-sub"><i class="fa-solid fa-lock mr-1"></i>Cannot be deleted</span>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderReport(scroll) {
    var host = document.getElementById('reportHost');
    var needsOrg = state.report === 'annual' || state.report === 'accreditation';
    if (!state.report || (needsOrg && !state.org)) { host.innerHTML = ''; return; }
    var rep = state.report === 'annual' ? SASO.ched.annual(state.org, state.ay)
      : state.report === 'accreditation' ? SASO.ched.accreditation(state.org, state.ay)
      : state.report === 'list' ? SASO.ched.studentActivities(state.ay, 'all', state.org || null)
      : SASO.ched.institutional(state.ay);
    var title = rep.title.charAt(0) + rep.title.slice(1).toLowerCase();
    SASO.ched.mount(host, rep, { title: title + ' (' + rep.subtitle + ')' });
    if (scroll) { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function render() {
    fillOrgs();
    var acts = M.activitiesInYear(state.ay, state.org || null);
    currentActs = acts;
    renderTabs();
    renderTiles(acts);
    renderList(acts);
    renderReport(false);
    var q = '?ay=' + state.ay + (isSaso && state.org ? '&org=' + state.org : '');
    window.history.replaceState({}, '', 'records.html' + q);
  }

  render();
})();
