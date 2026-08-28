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
          item(u.requirementsToReview, 'Requirements to review', 'pages/saso/requirements.html', 'is-warning') +
          item(u.proposalsWaiting, 'Proposals awaiting a decision', 'pages/saso/proposals.html', 'is-warning') +
          item(u.overdueTerminalReports, 'Overdue terminal reports', 'pages/saso/terminal-reports.html', 'is-critical') +
          item(u.unansweredQueries, 'Unanswered organization queries', 'pages/saso/activities.html', 'is-warning') +
        '</ul>' +
      '</div>';
  }

  /* ---- Summary tiles ------------------------------------------------------ */

  function renderTiles() {
    var s = M.sasoStats();

    var tiles = [
      { value: s.organizations,   label: 'Organizations',       icon: 'fa-people-group',      href: 'pages/saso/organizations.html' },
      { value: s.pendingProposals,label: 'Pending Proposals',   icon: 'fa-file-pen',          href: 'pages/saso/proposals.html', mod: s.pendingProposals ? 'is-attention' : '' },
      { value: s.forReview,       label: 'For Review',          icon: 'fa-magnifying-glass',  href: 'pages/saso/proposals.html', mod: s.forReview ? 'is-attention' : '' },
      { value: s.approved,        label: 'Approved Activities', icon: 'fa-stamp',             href: 'pages/saso/activities.html' },
      { value: s.ongoing,         label: 'Ongoing',             icon: 'fa-play',              href: 'pages/saso/activities.html' },
      { value: s.postponed,       label: 'Postponed',           icon: 'fa-calendar-xmark',    href: 'pages/saso/activities.html', mod: s.postponed ? 'is-attention' : '' },
      { value: s.finished,        label: 'Finished Events',     icon: 'fa-flag-checkered',    href: 'pages/saso/activities.html' },
      { value: s.terminalPending, label: 'Terminal Reports Pending', icon: 'fa-hourglass-half', href: 'pages/saso/terminal-reports.html', mod: s.terminalPending ? 'is-overdue' : '' },
      { value: s.completed,       label: 'Completed',           icon: 'fa-circle-check',      href: 'pages/saso/activities.html', mod: 'is-complete' }
    ];

    document.getElementById('statTiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-4 col-xl-3">' +
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
    UNDER_APPROVAL: '#60a5fa',
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
            backgroundColor: PALETTE.UNDER_APPROVAL,
            data: orgs.map(function (o) {
              return countWhere(o.id, function (a) { return M.stageOf(a) === C.STAGE.UNDER_APPROVAL; });
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
          '<h6>Every finished activity has an accepted terminal report</h6>' +
          '<p>Nothing to follow up right now.</p>' +
        '</div>';
      return;
    }

    var body = rows.map(function (r) {
      var overdue = r.activity.terminalReportStatus === C.TERMINAL.OVERDUE;
      return '<tr class="' + (overdue ? 'row-overdue' : '') + '">' +
        '<td><span class="cell-primary">' + M.escapeHtml(r.organization.acronym) + '</span>' +
          '<span class="cell-sub">' + M.escapeHtml(r.organization.college) + '</span></td>' +
        '<td>' + M.escapeHtml(r.activity.title) + '</td>' +
        '<td class="text-nowrap">' + M.formatDate(r.activity.dateEnd) + '</td>' +
        '<td>' + M.badge(r.activity.terminalReportStatus) + '</td>' +
        '<td class="text-center">' + (overdue ? r.daysPending : '—') + '</td>' +
        '<td class="text-right"><a class="btn btn-sm btn-outline-primary" href="' +
          SASO.layout.href('pages/saso/activity-details.html?id=' + r.activity.id, 'Activity Details') +
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
    eventStatus: 'Event',
    terminalReportStatus: 'Terminal report'
  };

  function renderRecent() {
    var events = M.recentEvents(8);
    var host = document.getElementById('recentFeed');

    if (!events.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-clock"></i>' +
        '<h6>No activity yet</h6><p>Workflow changes will appear here.</p></div>';
      return;
    }

    host.innerHTML = '<div class="timeline timeline-inverse mb-0">' +
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
      }).join('') + '</div>';
  }

  /* ---- go ------------------------------------------------------------------------ */

  /* RSC: SASO must see at a glance which organizations are accredited and
     which have renewed. Levels and the new/re-accredited distinction are
     CSPC's own vocabulary, taken from the published roster. */
  function renderAccreditation() {
    var a = M.accreditationSummary();
    var orgs = M.db().organizations;

    var chips = orgs.map(function (o) {
      return '<span class="mr-1 mb-1 d-inline-block">' + M.accreditationBadge(o) +
        ' <span class="cell-sub d-inline">' + M.escapeHtml(o.acronym) + '</span></span>';
    }).join('');

    document.getElementById('accreditationStrip').innerHTML =
      '<div class="card mb-3"><div class="card-body py-2">' +
        '<div class="d-flex flex-wrap align-items-center">' +
          '<span class="text-muted mr-3 text-sm">Accreditation</span>' +
          '<span class="mr-3 text-sm"><strong>' + a.accredited + '</strong> of ' + a.total +
            ' accredited</span>' +
          '<span class="mr-3 text-sm"><strong>' + a.reAccredited + '</strong> re-accredited</span>' +
          '<span class="mr-3 text-sm"><strong>' + a.recognizedOnly + '</strong> recognized only</span>' +
          (a.dueSoon.length
            ? '<span class="ml-auto text-sm"><i class="fa-solid fa-clock text-warning mr-1"></i>' +
              a.dueSoon.map(function (o) { return M.escapeHtml(o.acronym); }).join(', ') +
              ' due within 60 days</span>'
            : '') +
        '</div>' +
        '<div class="mt-2">' + chips + '</div>' +
      '</div></div>';
  }

  renderUrgent();
  renderAccreditation();
  renderTiles();
  renderStageChart();
  renderOrgChart();
  renderNonCompliance();
  renderRecent();
})();
