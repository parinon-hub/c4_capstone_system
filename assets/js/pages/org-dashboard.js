/* =========================================================================
   org-dashboard.js  —  Student organization dashboard.

   Deliberately simpler than the SASO dashboard and organised around one
   idea: for each activity, what is the single next thing this organization
   has to do?
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'dashboard',
    title: 'Dashboard',
    breadcrumb: [{ label: 'Dashboard' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();

  /* ---- identity strip ------------------------------------------------------ */

  document.getElementById('orgIdentity').innerHTML =
    '<div class="d-flex align-items-center">' +
      '<div class="user-avatar mr-2" style="background:var(--cspc-navy);">' +
        SASO.layout.initials(org.acronym) + '</div>' +
      '<div>' +
        '<div class="cell-primary">' + M.escapeHtml(org.name) + '</div>' +
        '<span class="cell-sub">Adviser: ' + M.escapeHtml(org.adviser) +
          ' · Signed in as ' + M.escapeHtml(session.position) + '</span>' +
        '<div class="mt-1">' + M.accreditationBadge(org) +
          '<span class="cell-sub d-inline ml-2">AY ' + M.escapeHtml(org.accreditationAY) +
          ' · valid until ' + M.formatDate(org.accreditationExpires) + '</span></div>' +
      '</div>' +
    '</div>';

  /* ---- summary tiles -------------------------------------------------------- */

  function renderTiles() {
    var s = M.orgStats(org.id);

    var tiles = [
      { value: s.active,            label: 'Active Activities',   icon: 'fa-calendar-check', href: 'pages/org/activities.html' },
      { value: s.pendingProposals,  label: 'With SASO',           icon: 'fa-file-pen', href: 'pages/org/activities.html' },
      { value: s.inRoute,           label: 'In Approval Route',   icon: 'fa-arrow-right-arrow-left', href: 'pages/org/activities.html' },
      { value: s.requirementsNeeded,label: 'Requirements Needed', icon: 'fa-list-check', href: 'pages/org/requirements.html', mod: s.requirementsNeeded ? 'is-attention' : '' },
      { value: s.terminalPending,   label: 'Reports Pending',     icon: 'fa-hourglass-half', href: 'pages/org/terminal-reports.html', mod: s.terminalPending ? 'is-overdue' : '' },
      { value: s.completed,         label: 'Completed',           icon: 'fa-circle-check', href: 'pages/org/activities.html', mod: 'is-complete' }
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

  /* ---- contextual next action ------------------------------------------------
     One obvious next step per row, in priority order. This is what makes the
     org portal action-oriented rather than a second read-only dashboard.
     ---------------------------------------------------------------------------- */

  function nextAction(activity) {
    var stage = M.stageOf(activity);
    var unreadFromSaso = M.commentsFor(activity.id).some(function (c) {
      return c.role === C.ROLE.SASO && !c.readByCounterpart;
    });

    if (activity.proposalStatus === C.PROPOSAL.DRAFT) {
      return { label: 'Continue submission', href: SASO.layout.href('pages/org/submit-activity.html?id=' + activity.id, 'Submit Activity'), variant: 'primary' };
    }
    if (stage === C.STAGE.AWAITING_TERMINAL_REPORT) {
      var overdue = M.terminalStatus(activity) === C.TERMINAL.OVERDUE;
      return { label: 'Submit reports',
               href: 'terminal-reports.html?id=' + activity.id,
               variant: overdue ? 'danger' : 'warning' };
    }
    if (activity.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED) {
      return { label: 'Submit requirement', href: 'activity-details.html?id=' + activity.id, variant: 'warning' };
    }
    if (activity.proposalStatus === C.PROPOSAL.REVISION_REQUIRED) {
      return { label: 'Revise and resubmit', href: 'activity-details.html?id=' + activity.id, variant: 'warning' };
    }
    if (unreadFromSaso) {
      return { label: 'Respond', href: 'activity-details.html?id=' + activity.id, variant: 'info' };
    }
    return { label: 'View', href: 'activity-details.html?id=' + activity.id, variant: 'outline-primary' };
  }

  function progressCell(activityId) {
    var p = M.requirementProgress(activityId, C.PHASE.PRE_APPROVAL);
    return '<div class="req-progress ' + (p.approved === p.mandatory ? 'is-complete' : '') + '">' +
      '<div class="progress"><div class="progress-bar" style="width:' + p.percent + '%"></div></div>' +
      '<span class="req-count">' + p.approved + '/' + p.mandatory + '</span>' +
    '</div>';
  }

  function renderActivities() {
    var acts = M.activitiesFor(org.id).sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    var host = document.getElementById('activitiesTable');

    if (!acts.length) {
      host.innerHTML =
        '<div class="empty-state">' +
          '<i class="fa-regular fa-folder-open"></i>' +
          '<h6>You have not submitted any activities yet</h6>' +
          '<p>Start by creating an activity proposal for SASO to review.</p>' +
          '<a href="' + SASO.layout.href('pages/org/submit-activity.html', 'Submit Activity') +
            '" class="btn btn-primary btn-sm">Submit activity</a>' +
        '</div>';
      return;
    }

    var body = acts.slice(0, 8).map(function (a) {
      var action = nextAction(a);
      var stage = M.stageOf(a);
      var rowClass = M.terminalStatus(a) === C.TERMINAL.OVERDUE ? 'row-overdue'
        : (a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
           a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED) ? 'row-stale' : '';

      return '<tr class="' + rowClass + '">' +
        '<td><span class="cell-primary">' + M.escapeHtml(a.title) + '</span>' +
          '<span class="cell-sub">' + M.escapeHtml(a.type) + '</span></td>' +
        '<td class="text-nowrap">' + M.formatDateRange(a.dateStart, a.dateEnd) + '</td>' +
        '<td>' + M.badge(a.proposalStatus) +
          (M.isInApprovalRoute(a)
            ? '<span class="cell-sub">' + M.daysWithCurrentOffice(a.id) + ' days with this office</span>'
            : '') + '</td>' +
        '<td>' + progressCell(a.id) + '</td>' +
        '<td>' + M.badge(stage) + '</td>' +
        '<td class="text-nowrap text-muted">' + M.relativeTime(a.updatedAt) + '</td>' +
        '<td class="text-right"><a class="btn btn-sm btn-' + action.variant + '" href="' +
          action.href + '">' + action.label + '</a></td>' +
      '</tr>';
    }).join('');

    host.innerHTML =
      '<div class="table-responsive"><table class="table table-hover">' +
        '<thead><tr>' +
          '<th>Activity</th><th>Date</th><th>Proposal</th><th>Requirements</th>' +
          '<th>Stage</th><th>Last Update</th><th></th>' +
        '</tr></thead><tbody>' + body + '</tbody>' +
      '</table></div>';
  }

  /* ---- recent updates --------------------------------------------------------- */

  function renderNotifications() {
    var notes = M.notificationsFor(session).slice(0, 6);
    var host = document.getElementById('recentNotifications');

    if (!notes.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-bell"></i>' +
        '<h6>No updates yet</h6><p>SASO responses will appear here.</p></div>';
      return;
    }

    host.innerHTML = '<div class="scroll-pane scroll-pane-sm"><div class="list-group list-group-flush">' +
      notes.map(function (n) {
        var icon = C.NOTIF_ICON[n.type] || 'fa-circle-info';
        return '<a class="list-group-item list-group-item-action' + (n.read ? '' : ' notif-unread') +
          '" href="' + 'activity-details.html?id=' + n.activityId + '">' +
          '<i class="fa-solid ' + icon + ' mr-2 text-muted"></i>' +
          M.escapeHtml(n.message) +
          '<span class="float-right text-muted text-sm">' + M.relativeTime(n.timestamp) + '</span>' +
        '</a>';
      }).join('') + '</div></div>';
  }

  /* static call-to-action links resolved through the phase-aware router */
  document.getElementById('btnSubmitActivity').href =
    SASO.layout.href('pages/org/submit-activity.html', 'Submit Activity');
  document.getElementById('linkAllActivities').href =
    SASO.layout.href('pages/org/activities.html', 'Activities');

  renderTiles();
  renderActivities();
  renderNotifications();
})();
