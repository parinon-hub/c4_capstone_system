/* =========================================================================
   org-requirements.js  —  What this organization still owes SASO.

   Grouped by activity, outstanding documents first. The point of this page is
   that an officer should be able to answer "what do we still need to submit?"
   without opening every activity in turn.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'requirements',
    title: 'Requirements',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'Requirements' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var scope = 'outstanding';

  /* ---- tiles ---------------------------------------------------------------- */

  function renderTiles() {
    var mine = M.allRequirements().filter(function (row) {
      return row.organization.id === org.id &&
             row.activity.proposalStatus !== C.PROPOSAL.DRAFT;
    });

    function count(status) {
      return mine.filter(function (r) { return r.requirement.status === status; }).length;
    }

    var tiles = [
      { value: count(C.REQUIREMENT.NOT_SUBMITTED), label: 'To submit',
        icon: 'fa-circle-exclamation', mod: count(C.REQUIREMENT.NOT_SUBMITTED) ? 'is-overdue' : '' },
      { value: count(C.REQUIREMENT.NEEDS_REVISION), label: 'Needs revision',
        icon: 'fa-rotate-left', mod: count(C.REQUIREMENT.NEEDS_REVISION) ? 'is-attention' : '' },
      { value: count(C.REQUIREMENT.UNDER_REVIEW), label: 'With SASO',
        icon: 'fa-magnifying-glass' },
      { value: count(C.REQUIREMENT.APPROVED), label: 'Approved',
        icon: 'fa-circle-check', mod: 'is-complete' }
    ];

    document.getElementById('reqTiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- grouped list ----------------------------------------------------------- */

  function isOutstanding(r) {
    return r.status === C.REQUIREMENT.NOT_SUBMITTED || r.status === C.REQUIREMENT.NEEDS_REVISION;
  }

  function render() {
    renderTiles();

    var activities = M.activitiesFor(org.id)
      .filter(function (a) { return a.proposalStatus !== C.PROPOSAL.DRAFT; })
      .map(function (a) {
        var reqs = M.requirementsFor(a.id);
        if (scope === 'outstanding') { reqs = reqs.filter(isOutstanding); }
        return { activity: a, reqs: reqs };
      })
      .filter(function (g) { return g.reqs.length; })
      /* Activities with outstanding work first, then by soonest date. */
      .sort(function (x, y) {
        var xo = x.reqs.some(isOutstanding) ? 0 : 1;
        var yo = y.reqs.some(isOutstanding) ? 0 : 1;
        if (xo !== yo) { return xo - yo; }
        return new Date(x.activity.dateStart || 0) - new Date(y.activity.dateStart || 0);
      });

    var host = document.getElementById('reqGroups');

    if (!activities.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-circle-check"></i>' +
        '<h6>' + (scope === 'outstanding'
          ? 'Nothing outstanding'
          : 'No requirements yet') + '</h6>' +
        '<p>' + (scope === 'outstanding'
          ? 'Every document SASO has asked for has been submitted.'
          : 'Requirements appear here once you submit an activity request.') + '</p>' +
      '</div>';
      return;
    }

    host.innerHTML = activities.map(function (g) {
      var a = g.activity;
      var pre = M.requirementProgress(a.id, C.PHASE.PRE_APPROVAL);
      var overdue = M.terminalStatus(a) === C.TERMINAL.OVERDUE;

      return '<div class="req-group">' +
        '<div class="req-group-head">' +
          '<div>' +
            '<a class="cell-primary" href="activity-details.html?id=' + a.id + '">' +
              M.escapeHtml(a.title) + '</a>' +
            '<span class="cell-sub">' + M.formatDateRange(a.dateStart, a.dateEnd) + ' · ' +
              M.label(a.venueType) + ' · ' + M.badge(M.stageOf(a)) + '</span>' +
          '</div>' +
          '<div class="ml-auto text-right">' +
            (a.reportDeadline && overdue
              ? '<span class="badge badge-danger status-badge">Reports overdue by ' +
                M.daysPending(a) + ' days</span>'
              : a.reportDeadline
                ? '<span class="cell-sub">Reports due ' + M.formatDate(a.reportDeadline) + '</span>'
                : '<span class="cell-sub">' + pre.approved + '/' + pre.mandatory +
                  ' pre-approval documents approved</span>') +
          '</div>' +
        '</div>' +
        '<table class="table table-sm mb-0"><tbody>' +
          g.reqs.map(function (r) {
            return '<tr>' +
              '<td><span class="cell-primary">' + M.escapeHtml(r.name) +
                (r.requestedBySaso
                  ? ' <span class="badge badge-info status-badge">Requested by SASO</span>' : '') +
                '</span><span class="cell-sub">' + M.label(r.phase) + ' · ' +
                (r.mandatory ? 'Required' : 'Optional') +
                (r.fileName ? ' · ' + M.escapeHtml(r.fileName) : '') + '</span>' +
                (r.remarks
                  ? '<span class="req-remarks"><strong>SASO:</strong> ' +
                    M.escapeHtml(r.remarks) + '</span>' : '') +
              '</td>' +
              '<td class="text-nowrap">' + M.badge(r.status) + '</td>' +
              '<td class="text-right text-nowrap">' + rowAction(a, r) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table>' +
      '</div>';
    }).join('');

    bind();
  }

  function rowAction(activity, r) {
    if (isOutstanding(r)) {
      return '<label class="btn btn-sm btn-' +
        (r.status === C.REQUIREMENT.NEEDS_REVISION ? 'warning' : 'outline-primary') + ' mb-0">' +
        '<i class="fa-solid fa-paperclip mr-1"></i>' +
        (r.status === C.REQUIREMENT.NEEDS_REVISION ? 'Replace' : 'Attach') +
        '<input type="file" class="d-none" data-activity="' + activity.id +
          '" data-name="' + M.escapeHtml(r.name) +
          '" data-phase="' + r.phase + '"></label>';
    }
    if (r.status === C.REQUIREMENT.UNDER_REVIEW) {
      return '<span class="text-muted text-sm">Submitted ' + M.relativeTime(r.submittedAt) + '</span>';
    }
    return '<span class="text-muted text-sm">Approved ' + M.relativeTime(r.reviewedAt) + '</span>';
  }

  function bind() {
    document.querySelectorAll('[data-name]').forEach(function (input) {
      input.addEventListener('change', function () {
        var activityId = this.getAttribute('data-activity');
        var name = this.getAttribute('data-name');
        var phase = this.getAttribute('data-phase');
        var file = this.files && this.files[0] ? this.files[0].name : 'document.pdf';

        if (phase === C.PHASE.POST_ACTIVITY) {
          E.submitReport(activityId, name, file);
        } else {
          E.attachRequirement(activityId, name, file);
          E.notifySaso(activityId, C.NOTIF.REQUIREMENT_SUBMITTED,
            org.acronym + ' submitted ' + name + ' for ' +
            M.activityById(activityId).title + '.');
          SASO.storage.save();
        }
        SASO.layout.toast(name + ' submitted for review.');
        render();
      });
    });
  }

  document.querySelectorAll('#scopeToggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#scopeToggle button').forEach(function (x) {
        x.classList.remove('active');
      });
      this.classList.add('active');
      scope = this.getAttribute('data-scope');
      render();
    });
  });

  render();
})();
