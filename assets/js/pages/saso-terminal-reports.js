/* =========================================================================
   saso-terminal-reports.js  —  Post-activity compliance.

   The rule this screen exists to enforce: an activity whose date has passed
   is Finished, not Completed. It becomes Completed only when SASO accepts the
   Narrative Report, the Evaluation and the Financial Report.

   The Overdue tab is the panel's request to be able to call out organizations
   whose activities have concluded but whose paperwork has not arrived.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'terminal',
    title: 'Terminal Reports',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' },
                 { label: 'Terminal Reports' }]
  });
  if (!session) { return; }

  var TABS = [
    { key: 'overdue',  label: 'Overdue',      statuses: [C.TERMINAL.OVERDUE], tone: 'danger' },
    { key: 'pending',  label: 'Not submitted', statuses: [C.TERMINAL.REQUIRED, C.TERMINAL.PARTIAL], tone: 'warning' },
    { key: 'review',   label: 'Under review', statuses: [C.TERMINAL.UNDER_REVIEW, C.TERMINAL.NEEDS_REVISION], tone: 'info' },
    { key: 'accepted', label: 'Accepted',     statuses: [C.TERMINAL.ACCEPTED], tone: 'success' }
  ];

  var state = { tab: 'overdue', org: '' };

  document.getElementById('pageRoot').innerHTML =
    '<div class="callout callout-warning mb-3">' +
      '<h5 class="mb-1">An activity is completed only when its reports are accepted</h5>' +
      '<p class="mb-0 text-sm">A passed event date does not complete an activity. Each finished ' +
      'activity requires the Narrative Report with Documentation, the Evaluation and the ' +
      'Financial Report, due ' + M.settings().reportDeadlineDays +
      ' days after the event.</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header p-0">' +
        '<ul class="nav nav-tabs wizard-tabs" id="trTabs"></ul>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-4 mb-2">' +
            '<label for="fOrg" class="text-sm">Organization</label>' +
            '<select class="form-control form-control-sm" id="fOrg"></select></div>' +
          '<div class="form-group col-md-8 mb-2 text-right">' +
            '<span class="text-muted text-sm" id="tabSummary"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
    '</div>';

  SASO.listview.fillSelect('fOrg', M.db().organizations.map(function (o) {
    return { value: o.id, label: o.acronym };
  }), 'All organizations');

  function queue() {
    return M.reportQueue(state.org || null);
  }

  function forTab(key) {
    var tab = TABS.filter(function (t) { return t.key === key; })[0];
    return queue().filter(function (row) {
      return tab.statuses.indexOf(row.status) !== -1;
    });
  }

  /* ---- tabs ------------------------------------------------------------------- */

  function renderTabs() {
    document.getElementById('trTabs').innerHTML = TABS.map(function (t) {
      var n = forTab(t.key).length;
      return '<li class="nav-item"><a class="nav-link' +
        (state.tab === t.key ? ' active' : '') + '" href="#" data-tab="' + t.key + '">' +
        t.label + (n ? ' <span class="badge badge-' + t.tone + ' ml-1">' + n + '</span>' : '') +
        '</a></li>';
    }).join('');

    document.querySelectorAll('#trTabs .nav-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state.tab = this.getAttribute('data-tab');
        render();
      });
    });
  }

  /* ---- table ------------------------------------------------------------------- */

  function render() {
    renderTabs();

    var rows = forTab(state.tab);
    var host = document.getElementById('tableHost');

    document.getElementById('tabSummary').textContent =
      rows.length + ' activit' + (rows.length === 1 ? 'y' : 'ies');

    if (!rows.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-circle-check"></i>' +
        '<h6>Nothing in this tab</h6>' +
        '<p>' + (state.tab === 'overdue'
          ? 'No organization is past its reporting deadline.'
          : 'Nothing to show for the current filter.') + '</p></div>';
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        '<th>Organization</th><th>Activity</th><th>Event Date</th>' +
        '<th>Reports</th><th>Status</th><th class="text-center">Days</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        var a = row.activity;
        var late = row.daysLate > 0;
        var missing = row.missing.map(function (m) { return M.escapeHtml(m.name); }).join(', ');

        return '<tr class="' + (late ? 'row-overdue' : '') + '">' +
          '<td><span class="cell-primary">' + M.escapeHtml(row.organization.acronym) + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(row.organization.adviser) + '</span></td>' +
          '<td><a href="activity-details.html?id=' + a.id + '" class="cell-primary">' +
            M.escapeHtml(a.title) + '</a>' +
            (missing ? '<span class="cell-sub">Missing: ' + missing + '</span>' : '') + '</td>' +
          '<td class="text-nowrap">' + M.formatDateRange(a.dateStart, a.dateEnd) +
            '<span class="cell-sub">Due ' + M.formatDate(a.reportDeadline) + '</span></td>' +
          '<td><div class="req-progress ' +
            (row.progress.approved === row.progress.mandatory ? 'is-complete' : '') + '">' +
            '<div class="progress"><div class="progress-bar" style="width:' +
              row.progress.percent + '%"></div></div>' +
            '<span class="req-count">' + row.progress.approved + '/' +
              row.progress.mandatory + '</span></div></td>' +
          '<td>' + M.badge(row.status) + '</td>' +
          '<td class="text-center' + (late ? ' text-danger font-weight-bold' : '') + '">' +
            (late ? row.daysLate + ' late'
                  : row.daysLeft !== null && row.status !== C.TERMINAL.ACCEPTED
                    ? row.daysLeft + ' left' : '-') + '</td>' +
          '<td class="text-right text-nowrap">' + actions(row) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    bind();
  }

  function actions(row) {
    if (row.status === C.TERMINAL.ACCEPTED) {
      return '<span class="text-muted text-sm">Completed</span>';
    }
    var out = '';
    if (row.requirements.some(function (r) { return r.status === C.REQUIREMENT.UNDER_REVIEW; })) {
      out += '<button type="button" class="btn btn-sm btn-primary mr-1" data-review="' +
        row.activity.id + '">Review</button>';
    }
    if (row.missing.length) {
      out += '<button type="button" class="btn btn-sm btn-outline-warning" data-remind="' +
        row.activity.id + '"><i class="fa-solid fa-bell mr-1"></i>Follow up</button>';
    }
    return out || '<span class="text-muted text-sm">-</span>';
  }

  /* ---- review dialog ------------------------------------------------------------- */

  function openReview(activityId) {
    var a = M.activityById(activityId);
    var org = M.orgById(a.organizationId);
    var reqs = M.requirementsFor(activityId, C.PHASE.POST_ACTIVITY);

    var old = document.getElementById('trModal');
    if (old) { old.remove(); }

    var outcome = a.outcome || {};

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="trModal" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header">' +
            '<div><h5 class="modal-title">Post-activity reports</h5>' +
              '<div class="cell-sub">' + M.escapeHtml(org.acronym) + ' · ' +
              M.escapeHtml(a.title) + '</div></div>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body">' +
            '<div class="review-meta">' +
              '<div><span class="cell-sub">Event date</span>' +
                M.formatDateRange(a.dateStart, a.dateEnd) + '</div>' +
              '<div><span class="cell-sub">Reports due</span>' +
                M.formatDate(a.reportDeadline) + '</div>' +
              '<div><span class="cell-sub">Expected participants</span>' +
                (a.expectedParticipants || '-') + '</div>' +
              '<div><span class="cell-sub">Actual participants</span>' +
                (outcome.actualParticipants || 'Not reported') + '</div>' +
            '</div>' +
            (outcome.summary
              ? '<div class="mb-3"><span class="cell-sub">Summary from the organization</span>' +
                '<div class="text-sm">' + M.escapeHtml(outcome.summary) + '</div></div>'
              : '') +
            (outcome.issues
              ? '<div class="mb-3"><span class="cell-sub">Issues encountered</span>' +
                '<div class="text-sm">' + M.escapeHtml(outcome.issues) + '</div></div>'
              : '') +
            '<table class="table table-sm"><tbody>' +
            reqs.map(function (r) {
              return '<tr>' +
                '<td><span class="cell-primary">' + M.escapeHtml(r.name) + '</span>' +
                  '<span class="cell-sub">' + (r.mandatory ? 'Required' : 'Optional') +
                  (r.fileName ? ' · ' + M.escapeHtml(r.fileName) : '') + '</span>' +
                  (r.remarks ? '<span class="req-remarks">' + M.escapeHtml(r.remarks) + '</span>' : '') +
                '</td>' +
                '<td class="text-nowrap">' + M.badge(r.status) + '</td>' +
                '<td class="text-right text-nowrap">' +
                  (r.status === C.REQUIREMENT.UNDER_REVIEW
                    ? '<button type="button" class="btn btn-sm btn-outline-success mr-1" ' +
                        'data-doc="' + r.id + '" data-decision="APPROVE">Approve</button>' +
                      '<button type="button" class="btn btn-sm btn-outline-warning" ' +
                        'data-doc="' + r.id + '" data-decision="RETURN">Return</button>'
                    : '<span class="text-muted text-sm">' +
                      (r.reviewedAt ? M.relativeTime(r.reviewedAt) : '-') + '</span>') +
                '</td></tr>';
            }).join('') + '</tbody></table>' +
            '<p class="text-muted text-sm mb-0">The activity is marked completed automatically ' +
            'once every required report above is approved.</p>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<a class="btn btn-outline-primary btn-sm mr-auto" href="activity-details.html?id=' +
              a.id + '">Open activity</a>' +
            '<button type="button" class="btn btn-light" data-dismiss="modal">Close</button>' +
          '</div>' +
        '</div></div></div>');

    var $m = window.jQuery('#trModal');
    $m.modal('show');

    document.querySelectorAll('#trModal [data-doc]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-doc');
        var decision = this.getAttribute('data-decision');
        if (decision === 'APPROVE') {
          E.reviewRequirement(id, 'APPROVE');
          $m.modal('hide');
          var stage = M.stageOf(M.activityById(activityId));
          SASO.layout.toast(stage === C.STAGE.COMPLETED
            ? 'All reports accepted: activity completed.'
            : 'Report approved.');
          render();
        } else {
          $m.modal('hide');
          SASO.layout.confirmDialog({
            title: 'Return this report?',
            body: 'The organization will be asked to resubmit it.',
            remarksRequired: true,
            remarksPlaceholder: 'What needs to be corrected?',
            confirmLabel: 'Return', variant: 'warning'
          }, function (remarks) {
            E.reviewRequirement(id, 'RETURN', remarks);
            SASO.layout.toast('Returned to the organization.', 'warning');
            render();
          });
        }
      });
    });

    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  /* ---- follow-up ------------------------------------------------------------------ */

  function followUp(activityId) {
    var a = M.activityById(activityId);
    var org = M.orgById(a.organizationId);
    var missing = M.missingRequirements(activityId, C.PHASE.POST_ACTIVITY);
    var late = M.terminalStatus(a) === C.TERMINAL.OVERDUE;

    SASO.layout.confirmDialog({
      title: 'Follow up with ' + org.acronym + '?',
      body: (late ? 'Reports are ' + M.daysPending(a) + ' days overdue. ' : '') +
            'Still outstanding: ' + missing.map(function (m) { return m.name; }).join(', ') + '.',
      remarks: true,
      remarksPlaceholder: 'Optional message to post in the activity thread',
      confirmLabel: 'Send follow-up', variant: late ? 'danger' : 'warning'
    }, function (message) {
      missing.forEach(function (m) { E.sendReminder(m.id, null); });
      if (message) { E.postComment(activityId, message); }
      SASO.layout.toast('Follow-up sent to ' + org.acronym + '.');
      render();
    });
  }

  function bind() {
    document.querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () { openReview(this.getAttribute('data-review')); });
    });
    document.querySelectorAll('[data-remind]').forEach(function (b) {
      b.addEventListener('click', function () { followUp(this.getAttribute('data-remind')); });
    });
  }

  document.getElementById('fOrg').addEventListener('change', function () {
    state.org = this.value;
    render();
  });

  /* Land on whichever tab actually has work. */
  if (!forTab('overdue').length) {
    state.tab = forTab('pending').length ? 'pending'
      : forTab('review').length ? 'review' : 'accepted';
  }

  render();
})();
