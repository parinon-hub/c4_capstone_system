/* =========================================================================
   org-profile.js  —  The organization's own record.

   Read-only. The accreditation panel is the point of the page: an officer
   should be able to see the standing their compliance record feeds, and what
   is currently working against it.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'profile',
    title: 'Profile',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'Profile' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var acts = M.activitiesFor(org.id).filter(function (a) {
    return a.proposalStatus !== C.PROPOSAL.DRAFT;
  });
  var outstanding = M.outstandingRequirements(org.id);
  var overdue = acts.filter(function (a) {
    return M.terminalStatus(a) === C.TERMINAL.OVERDUE;
  });
  var completed = acts.filter(function (a) { return M.stageOf(a) === C.STAGE.COMPLETED; });
  var participants = acts.reduce(function (sum, a) {
    var o = a.outcome || {};
    return sum + (o.actualParticipants || a.expectedParticipants || 0);
  }, 0);

  var daysLeft = M.accreditationDaysLeft(org);
  var renewalSoon = daysLeft !== null && daysLeft <= M.settings().accreditationAlertDays;

  /* Category spread — the AACCUP record asks for the range of activities, not
     just the count. */
  var byCategory = C.ACTIVITY_CATEGORIES.map(function (cat) {
    return { cat: cat, n: acts.filter(function (a) { return a.category === cat; }).length };
  }).filter(function (r) { return r.n > 0; });

  document.getElementById('pageRoot').innerHTML =
    '<div class="row">' +
      '<div class="col-lg-7">' +

        '<div class="card">' +
          '<div class="card-header"><h3 class="card-title">Organization</h3></div>' +
          '<div class="card-body p-0"><table class="table table-sm detail-table mb-0"><tbody>' +
            '<tr><th>Name</th><td>' + M.escapeHtml(org.name) + '</td></tr>' +
            '<tr><th>Acronym</th><td>' + M.escapeHtml(org.acronym) + '</td></tr>' +
            '<tr><th>College</th><td>' + M.escapeHtml(org.college) + '</td></tr>' +
            '<tr><th>Adviser</th><td>' + M.escapeHtml(org.adviser) + '</td></tr>' +
            '<tr><th>Signed in as</th><td>' + M.escapeHtml(session.name) +
              '<span class="cell-sub">' + M.escapeHtml(session.position) + '</span></td></tr>' +
          '</tbody></table></div>' +
          '<div class="card-footer text-muted text-sm">' +
            'Organization details are maintained by SASO. Contact the office to correct them.' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header"><h3 class="card-title">Activity record</h3>' +
            '<div class="card-tools"><span class="card-subtitle">AY ' +
              M.escapeHtml(org.accreditationAY) + '</span></div></div>' +
          '<div class="card-body">' +
            '<div class="review-meta mb-0">' +
              '<div><span class="cell-sub">Activities submitted</span>' + acts.length + '</div>' +
              '<div><span class="cell-sub">Completed</span>' + completed.length + '</div>' +
              '<div><span class="cell-sub">Total participants</span>' + participants + '</div>' +
              '<div><span class="cell-sub">Documents outstanding</span>' + outstanding.length + '</div>' +
            '</div>' +
            (byCategory.length
              ? '<h6 class="doc-subhead mb-2">By category</h6>' +
                '<div>' + byCategory.map(function (r) {
                  return '<span class="badge badge-secondary status-badge mr-1 mb-1">' +
                    M.escapeHtml(r.cat) + ' · ' + r.n + '</span>';
                }).join('') + '</div>'
              : '') +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="col-lg-5">' +

        '<div class="card">' +
          '<div class="card-header"><h3 class="card-title">Accreditation</h3></div>' +
          '<div class="card-body">' +
            '<div class="accred-badge">' + M.accreditationBadge(org) + '</div>' +
            '<table class="table table-sm detail-table mb-3"><tbody>' +
              '<tr><th>Academic year</th><td>' + M.escapeHtml(org.accreditationAY) + '</td></tr>' +
              '<tr><th>Granted</th><td>' + M.formatDate(org.accreditedOn) + '</td></tr>' +
              '<tr><th>Valid until</th><td>' + M.formatDate(org.accreditationExpires) +
                (renewalSoon
                  ? '<span class="cell-sub text-danger">Renewal due in ' + daysLeft + ' days</span>'
                  : '') + '</td></tr>' +
            '</tbody></table>' +
            '<p class="text-muted text-sm mb-0">Your accreditation level is scored from the ' +
              'reports you file after each activity. Activities left without accepted reports ' +
              'count against that record and against eligibility for the Most Outstanding ' +
              'Student Organization Award.</p>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header"><h3 class="card-title">Standing</h3></div>' +
          '<div class="card-body">' +
            (overdue.length
              ? '<div class="callout callout-danger mb-2"><h5 class="mb-1">' +
                  overdue.length + ' activit' + (overdue.length === 1 ? 'y' : 'ies') +
                  ' with overdue reports</h5>' +
                  '<p class="mb-2 text-sm">' + overdue.map(function (a) {
                    return M.escapeHtml(a.title) + ' — ' + M.daysPending(a) + ' days late';
                  }).join('<br>') + '</p>' +
                  '<a class="btn btn-sm btn-danger" href="terminal-reports.html">Submit reports</a>' +
                '</div>'
              : outstanding.length
                ? '<div class="callout mb-2"><h5 class="mb-1">' + outstanding.length +
                    ' document' + (outstanding.length === 1 ? '' : 's') + ' outstanding</h5>' +
                    '<p class="mb-2 text-sm">SASO is waiting on these before your activities ' +
                    'can move forward.</p>' +
                    '<a class="btn btn-sm btn-primary" href="requirements.html">See requirements</a>' +
                  '</div>'
                : '<div class="empty-state py-3"><i class="fa-regular fa-circle-check"></i>' +
                  '<h6>Fully compliant</h6>' +
                  '<p class="mb-0">Nothing is outstanding with SASO.</p></div>') +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';
})();
