/* =========================================================================
   saso-dashboard.js  —  SASO administrator dashboard.

   Every figure on this page is computed from current state by SASO.model.
   Nothing is stored or hard-coded, so the dashboard can never disagree with
   the list views or the reports module.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'dashboard',
    title: 'Dashboard',
    breadcrumb: [{ label: 'Dashboard' }]
  });
  if (!session) { return; }

  /* ---- Urgent actions ---------------------------------------------------- */

  function renderUrgent() {
    var u = M.urgentActions();

    function item(count, label, path, tone) {
      var cls = count === 0 ? 'is-clear' : tone;
      return '<li class="' + cls + '">' +
        '<a href="' + SASO.layout.href(path, label) + '" class="text-decoration-none">' +
          '<span class="urgent-count">' + count + '</span>' +
          '<span class="urgent-label">' + label + '</span>' +
        '</a></li>';
    }

    document.getElementById('urgentPanel').innerHTML =
      '<div class="urgent-panel">' +
        '<div class="urgent-head"><i class="fa-solid fa-circle-exclamation mr-2 text-warning"></i>Needs your attention</div>' +
        '<ul class="urgent-list">' +
          item(u.requirementsToReview, 'Requirements to review', 'pages/saso/requirements.html?status=UNDER_REVIEW', 'is-warning') +
          item(u.proposalsWaiting, 'Awaiting SASO action', 'pages/saso/proposals.html', 'is-warning') +
          item(u.longInRoute, 'Long in the approval route', 'pages/saso/proposals.html', 'is-warning') +
          item(u.overdueTerminalReports, 'Overdue post-activity reports', 'pages/saso/terminal-reports.html', 'is-critical') +
          item(u.unansweredQueries, 'Unanswered queries', 'pages/saso/activities.html', 'is-warning') +
        '</ul>' +
      '</div>';
  }

  /* ---- Summary tiles ------------------------------------------------------ */

  function renderTiles() {
    var s = M.sasoStats();

    var tiles = [
      { value: s.organizations,   label: 'Organizations',       icon: 'fa-people-group',      href: 'pages/saso/organizations.html' },
      { value: s.withSaso,        label: 'With SASO',           icon: 'fa-file-pen',          href: 'pages/saso/proposals.html', mod: s.withSaso ? 'is-attention' : '' },
      { value: s.inRoute,         label: 'In Approval Route',   icon: 'fa-arrow-right-arrow-left', href: 'pages/saso/proposals.html' },
      { value: s.approved,        label: 'Approved Activities', icon: 'fa-stamp',             href: 'pages/saso/activities.html?stage=APPROVED' },
      { value: s.ongoing,         label: 'Ongoing',             icon: 'fa-play',              href: 'pages/saso/activities.html?stage=ONGOING' },
      { value: s.postponed,       label: 'Postponed',           icon: 'fa-calendar-xmark',    href: 'pages/saso/activities.html?stage=POSTPONED', mod: s.postponed ? 'is-attention' : '' },
      { value: s.finished,        label: 'Finished Events',     icon: 'fa-flag-checkered',    href: 'pages/saso/activities.html?stage=AWAITING_TERMINAL_REPORT' },
      { value: s.terminalPending, label: 'Reports Pending',     icon: 'fa-hourglass-half',    href: 'pages/saso/terminal-reports.html', mod: s.terminalPending ? 'is-overdue' : '' },
      { value: s.completed,       label: 'Completed',           icon: 'fa-circle-check',      href: 'pages/saso/activities.html?stage=COMPLETED', mod: 'is-complete' }
    ];

    document.getElementById('statTiles').innerHTML = tiles.map(function (t) {
      return '<div class="stat-strip-item">' +
        '<a class="stat-tile ' + (t.mod || '') + '" href="' + SASO.layout.href(t.href, t.label) + '">' +
          '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
          '<span class="stat-value">' + t.value + '</span>' +
          '<span class="stat-label">' + t.label + '</span>' +
        '</a></div>';
    }).join('');
  }

  /* ---- Charts -------------------------------------------------------------- */

  var PALETTE = {
    DRAFT: '#cbd5e1',
    UNDER_SASO_REVIEW: '#60a5fa',
    IN_APPROVAL_ROUTE: '#7c9fd4',
    APPROVED: '#1d5089',
    ONGOING: '#38bdf8',
    POSTPONED: '#b7791f',
    AWAITING_TERMINAL_REPORT: '#d9a441',
    COMPLETED: '#2f855a',
    CLOSED: '#94a3b8'
  };

  function renderStageChart() {
    var stages = M.sasoStats().stages;
    var keys = Object.keys(stages).filter(function (k) { return stages[k] > 0; });

    new Chart(document.getElementById('stageChart'), {
      type: 'doughnut',
      data: {
        labels: keys.map(function (k) { return M.label(k); }),
        datasets: [{
          data: keys.map(function (k) { return stages[k]; }),
          backgroundColor: keys.map(function (k) { return PALETTE[k]; }),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        }
      }
    });
  }

  function renderOrgChart() {
    var orgs = M.db().organizations;

    function countWhere(orgId, predicate) {
      return M.activitiesFor(orgId).filter(predicate).length;
    }

    new Chart(document.getElementById('orgChart'), {
      type: 'bar',
      data: {
        labels: orgs.map(function (o) { return o.acronym; }),
        datasets: [
          {
            label: 'Completed',
            backgroundColor: PALETTE.COMPLETED,
            data: orgs.map(function (o) {
              return countWhere(o.id, function (a) { return M.stageOf(a) === C.STAGE.COMPLETED; });
            })
          },
          {
            label: 'Awaiting terminal report',
            backgroundColor: PALETTE.AWAITING_TERMINAL_REPORT,
            data: orgs.map(function (o) {
              return countWhere(o.id, function (a) { return M.stageOf(a) === C.STAGE.AWAITING_TERMINAL_REPORT; });
            })
          },
          {
            label: 'In progress',
            backgroundColor: PALETTE.APPROVED,
            data: orgs.map(function (o) {
              return countWhere(o.id, function (a) {
                var s = M.stageOf(a);
                return s === C.STAGE.APPROVED || s === C.STAGE.ONGOING;
              });
            })
          },
          {
            label: 'Under approval',
            backgroundColor: PALETTE.UNDER_SASO_REVIEW,
            data: orgs.map(function (o) {
              return countWhere(o.id, function (a) {
                var st = M.stageOf(a);
                return st === C.STAGE.UNDER_SASO_REVIEW || st === C.STAGE.IN_APPROVAL_ROUTE;
              });
            })
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { stacked: true, ticks: { precision: 0 }, grid: { color: '#eef2f7' } },
          y: { stacked: true, grid: { display: false } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        }
      }
    });
  }

  /* ---- Non-compliance table -------------------------------------------------- */

  function renderNonCompliance() {
    var rows = M.nonCompliance();
    var host = document.getElementById('nonComplianceTable');

    if (!rows.length) {
      host.innerHTML =
        '<div class="empty-state">' +
          '<i class="fa-solid fa-circle-check"></i>' +
          '<h6>Every finished activity has accepted post-activity reports</h6>' +
          '<p>Nothing to follow up right now.</p>' +
        '</div>';
      return;
    }

    var body = rows.map(function (r) {
      var overdue = r.terminalStatus === C.TERMINAL.OVERDUE;
      var missing = r.missing.map(function (m) { return M.escapeHtml(m.name); }).join(', ');
      return '<tr class="' + (overdue ? 'row-overdue' : '') + '">' +
        '<td><span class="cell-primary">' + M.escapeHtml(r.organization.acronym) + '</span>' +
          '<span class="cell-sub">' + M.escapeHtml(r.organization.college) + '</span></td>' +
        '<td>' + M.escapeHtml(r.activity.title) +
          (missing ? '<span class="cell-sub">Missing: ' + missing + '</span>' : '') + '</td>' +
        '<td class="text-nowrap">' + M.formatDate(r.activity.dateEnd) + '</td>' +
        '<td>' + M.badge(r.terminalStatus) + '</td>' +
        '<td class="text-center">' + (overdue ? r.daysPending : '—') + '</td>' +
        '<td class="text-right"><a class="btn btn-sm btn-outline-primary" href="' +
          'activity-details.html?id=' + r.activity.id +
          '">Open</a></td>' +
      '</tr>';
    }).join('');

    host.innerHTML =
      '<div class="table-responsive"><table class="table table-hover">' +
        '<thead><tr>' +
          '<th>Organization</th><th>Activity</th><th>Event Date</th>' +
          '<th>Status</th><th class="text-center">Days Overdue</th><th></th>' +
        '</tr></thead>' +
        '<tbody>' + body + '</tbody>' +
      '</table></div>';
  }

  /* ---- Recent activity feed ---------------------------------------------------- */

  var FIELD_LABEL = {
    proposalStatus: 'Proposal',
    eventStatus: 'Event'
  };

  function renderRecent() {
    var events = M.recentEvents(8);
    var host = document.getElementById('recentFeed');

    if (!events.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-clock"></i>' +
        '<h6>No activity yet</h6><p>Workflow changes will appear here.</p></div>';
      return;
    }

    host.innerHTML = '<div class="scroll-panel"><div class="timeline timeline-inverse mb-0 pr-2">' +
      events.map(function (e) {
        var toneClass = e.entry.toValue === C.PROPOSAL.APPROVED ||
                        e.entry.toValue === C.TERMINAL.ACCEPTED ? 'bg-success'
          : e.entry.toValue === C.TERMINAL.OVERDUE || e.entry.toValue === C.PROPOSAL.REJECTED ? 'bg-danger'
          : 'bg-info';
        return '<div><i class="fa-solid fa-circle ' + toneClass + '"></i>' +
          '<div class="timeline-item">' +
            '<span class="time text-muted"><i class="fa-regular fa-clock"></i> ' +
              M.relativeTime(e.entry.timestamp) + '</span>' +
            '<h3 class="timeline-header border-0 pb-1">' +
              (e.organization ? M.escapeHtml(e.organization.acronym) + ' · ' : '') +
              M.escapeHtml(e.activity ? e.activity.title : 'Activity') +
            '</h3>' +
            '<div class="timeline-body pt-0">' +
              (FIELD_LABEL[e.entry.field] || e.entry.field) + ' → ' +
              M.badge(e.entry.toValue) +
              '<span class="cell-sub">by ' + M.escapeHtml(e.entry.actorName) + '</span>' +
            '</div>' +
          '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---- go ------------------------------------------------------------------------ */

  /* RSC: SASO must be able to identify accredited organizations and those
     that have renewed. The strip carries the counts; the full roster opens in
     a dialog so it does not crowd the dashboard. */
  function renderAccreditation() {
    var a = M.accreditationSummary();

    document.getElementById('accreditationStrip').innerHTML =
      '<div class="card mb-3"><div class="card-body py-2 d-flex flex-wrap align-items-center">' +
        '<span class="text-muted mr-3 text-sm">Accreditation</span>' +
        '<span class="mr-3 text-sm"><strong>' + a.accredited + '</strong> of ' + a.total + ' accredited</span>' +
        '<span class="mr-3 text-sm"><strong>' + a.reAccredited + '</strong> re-accredited</span>' +
        '<span class="mr-3 text-sm"><strong>' + a.recognizedOnly + '</strong> recognized only</span>' +
        (a.dueSoon.length
          ? '<span class="mr-3 text-sm"><i class="fa-solid fa-clock text-warning mr-1"></i>' +
            a.dueSoon.length + ' due within 60 days</span>'
          : '') +
        '<button type="button" class="btn btn-sm btn-outline-primary ml-auto" id="btnViewRoster">' +
          '<i class="fa-solid fa-list mr-1"></i>View organizations</button>' +
      '</div></div>';

    document.getElementById('btnViewRoster').addEventListener('click', showRoster);
  }

  function showRoster() {
    var orgs = M.db().organizations.slice().sort(function (x, y) {
      return x.acronym.localeCompare(y.acronym);
    });

    var rows = orgs.map(function (o) {
      var left = M.accreditationDaysLeft(o);
      var due = left !== null && left <= 60;
      return '<tr>' +
        '<td><span class="cell-primary">' + M.escapeHtml(o.acronym) + '</span>' +
          '<span class="cell-sub">' + M.escapeHtml(o.name) + '</span></td>' +
        '<td>' + M.escapeHtml(o.college) + '</td>' +
        '<td>' + M.escapeHtml(o.adviser) + '</td>' +
        '<td>' + M.accreditationBadge(o) + '</td>' +
        '<td class="text-nowrap' + (due ? ' text-danger' : '') + '">' +
          M.formatDate(o.accreditationExpires) +
          (due ? '<span class="cell-sub text-danger">' + left + ' days left</span>' : '') + '</td>' +
        '<td class="text-center">' + M.activitiesFor(o.id).length + '</td>' +
      '</tr>';
    }).join('');

    var existing = document.getElementById('rosterModal');
    if (existing) { existing.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="rosterModal" tabindex="-1">' +
        '<div class="modal-dialog modal-xl modal-dialog-scrollable">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">Recognized and accredited student organizations</h5>' +
              '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '</div>' +
            '<div class="modal-body p-0">' +
              '<div class="table-responsive"><table class="table table-hover mb-0">' +
                '<thead><tr><th>Organization</th><th>College</th><th>Adviser</th>' +
                '<th>Accreditation</th><th>Valid Until</th><th class="text-center">Activities</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
              '</table></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<span class="text-muted text-sm mr-auto">Academic Year 2025\u20132026</span>' +
              '<button type="button" class="btn btn-light" data-dismiss="modal">Close</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>');

    var $m = window.jQuery('#rosterModal');
    $m.modal('show');
    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  renderUrgent();
  renderAccreditation();
  renderTiles();
  renderStageChart();
  renderOrgChart();
  renderNonCompliance();
  renderRecent();
})();
