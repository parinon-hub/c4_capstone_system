/* =========================================================================
   org-terminal-reports.js  —  What the organization still owes after an event.

   The activity is not finished with when the event ends. This screen is where
   the three reports get filed, and it says plainly what is holding completion
   up and how long it has been outstanding.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'terminal',
    title: 'Terminal Reports',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' },
                 { label: 'Terminal Reports' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var focusId = new URLSearchParams(window.location.search).get('id');
  var scope = 'due';

  document.getElementById('pageRoot').innerHTML =
    '<div class="callout callout-warning mb-3">' +
      '<h5 class="mb-1">Your activity is completed only when these reports are accepted</h5>' +
      '<p class="mb-0 text-sm">After an activity finishes you have ' +
      M.settings().reportDeadlineDays + ' days to submit the Narrative Report with ' +
      'Documentation, the Evaluation and the Financial Report. Until SASO accepts them ' +
      'the activity stays open, and it counts against your accreditation record.</p>' +
    '</div>' +
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">Post-activity reports</h3>' +
        '<div class="card-tools">' +
          '<div class="btn-group btn-group-sm" id="scopeToggle">' +
            '<button type="button" class="btn btn-outline-primary active" data-scope="due">Due now</button>' +
            '<button type="button" class="btn btn-outline-primary" data-scope="all">All</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="groups"></div>' +
    '</div>';

  function queue() {
    var rows = M.reportQueue(org.id);
    if (scope === 'due') {
      rows = rows.filter(function (r) { return r.status !== C.TERMINAL.ACCEPTED; });
    }
    return rows;
  }

  /* ---- tiles ------------------------------------------------------------------ */

  function renderTiles() {
    var all = M.reportQueue(org.id);
    var overdue = all.filter(function (r) { return r.status === C.TERMINAL.OVERDUE; });
    var due = all.filter(function (r) {
      return r.status === C.TERMINAL.REQUIRED || r.status === C.TERMINAL.PARTIAL;
    });
    var review = all.filter(function (r) {
      return r.status === C.TERMINAL.UNDER_REVIEW || r.status === C.TERMINAL.NEEDS_REVISION;
    });
    var done = all.filter(function (r) { return r.status === C.TERMINAL.ACCEPTED; });

    var tiles = [
      { value: overdue.length, label: 'Overdue', icon: 'fa-triangle-exclamation',
        mod: overdue.length ? 'is-overdue' : '' },
      { value: due.length, label: 'Due now', icon: 'fa-hourglass-half',
        mod: due.length ? 'is-attention' : '' },
      { value: review.length, label: 'With SASO', icon: 'fa-magnifying-glass' },
      { value: done.length, label: 'Accepted', icon: 'fa-circle-check', mod: 'is-complete' }
    ];

    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- deadline line ----------------------------------------------------------- */

  function deadlineLine(row) {
    if (row.status === C.TERMINAL.ACCEPTED) {
      return '<span class="badge badge-success status-badge">Accepted — activity completed</span>';
    }
    if (row.daysLate > 0) {
      return '<span class="badge badge-danger status-badge">Overdue by ' + row.daysLate +
        ' day' + (row.daysLate === 1 ? '' : 's') + '</span>' +
        '<span class="cell-sub text-danger">Was due ' +
        M.formatDate(row.activity.reportDeadline) + '</span>';
    }
    if (row.daysLeft !== null) {
      var urgent = row.daysLeft <= 2;
      return '<span class="badge badge-' + (urgent ? 'warning' : 'info') + ' status-badge">' +
        (row.daysLeft === 0 ? 'Due today' : row.daysLeft + ' day' +
          (row.daysLeft === 1 ? '' : 's') + ' left') + '</span>' +
        '<span class="cell-sub">Due ' + M.formatDate(row.activity.reportDeadline) + '</span>';
    }
    return '';
  }

  /* ---- render -------------------------------------------------------------------- */

  function render() {
    renderTiles();
    var rows = queue();
    var host = document.getElementById('groups');

    if (!rows.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-circle-check"></i>' +
        '<h6>' + (scope === 'due' ? 'Nothing to submit' : 'No finished activities yet') + '</h6>' +
        '<p>' + (scope === 'due'
          ? 'Every finished activity has had its reports accepted.'
          : 'Reports appear here once an activity has been marked finished.') + '</p></div>';
      return;
    }

    host.innerHTML = rows.map(function (row) {
      var a = row.activity;
      var o = a.outcome || {};
      var open = focusId === a.id || row.status === C.TERMINAL.OVERDUE;

      return '<div class="req-group" id="grp-' + a.id + '">' +
        '<div class="req-group-head">' +
          '<div>' +
            '<a class="cell-primary" href="activity-details.html?id=' + a.id + '">' +
              M.escapeHtml(a.title) + '</a>' +
            '<span class="cell-sub">' + M.formatDateRange(a.dateStart, a.dateEnd) + ' · ' +
              M.label(a.venueType) + ' · ' + M.escapeHtml(a.venue || '—') + '</span>' +
          '</div>' +
          '<div class="ml-auto text-right">' + deadlineLine(row) + '</div>' +
        '</div>' +

        '<table class="table table-sm mb-0"><tbody>' +
          row.requirements.map(function (r) {
            return '<tr>' +
              '<td><span class="cell-primary">' + M.escapeHtml(r.name) + '</span>' +
                '<span class="cell-sub">' + (r.mandatory ? 'Required' : 'Optional') +
                (r.fileName ? ' · ' + M.escapeHtml(r.fileName) : '') + '</span>' +
                (r.remarks
                  ? '<span class="req-remarks"><strong>SASO:</strong> ' +
                    M.escapeHtml(r.remarks) + '</span>' : '') +
              '</td>' +
              '<td class="text-nowrap">' + M.badge(r.status) + '</td>' +
              '<td class="text-right text-nowrap">' + docAction(a, r) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table>' +

        /* The figures that accompany the documents. SASO's consolidated
           workbook records actual attendance, so it is captured here. */
        '<div class="outcome-block">' +
          '<button type="button" class="outcome-toggle" data-toggle-outcome="' + a.id + '">' +
            '<i class="fa-solid fa-chevron-' + (open ? 'down' : 'right') + ' mr-2"></i>' +
            'Activity outcome' +
            (o.recordedAt
              ? '<span class="badge badge-success status-badge ml-2">Recorded</span>'
              : '<span class="badge badge-secondary status-badge ml-2">Not yet recorded</span>') +
          '</button>' +
          '<div class="outcome-body' + (open ? '' : ' d-none') + '" id="out-' + a.id + '">' +
            '<div class="form-row">' +
              '<div class="form-group col-md-3">' +
                '<label class="text-sm">Actual participants</label>' +
                '<input type="number" min="0" class="form-control form-control-sm" ' +
                  'id="op-' + a.id + '" value="' + (o.actualParticipants || '') +
                  '" placeholder="' + (a.expectedParticipants || '') + '">' +
                '<small class="form-text text-muted">Expected: ' +
                  (a.expectedParticipants || '—') + '</small>' +
              '</div>' +
              '<div class="form-group col-md-9">' +
                '<label class="text-sm">Summary of what took place</label>' +
                '<textarea class="form-control form-control-sm" rows="2" id="os-' + a.id + '">' +
                  M.escapeHtml(o.summary || '') + '</textarea>' +
              '</div>' +
            '</div>' +
            '<div class="form-group mb-2">' +
              '<label class="text-sm">Issues encountered</label>' +
              '<textarea class="form-control form-control-sm" rows="2" id="oi-' + a.id + '" ' +
                'placeholder="Leave blank if none">' + M.escapeHtml(o.issues || '') + '</textarea>' +
            '</div>' +
            '<button type="button" class="btn btn-sm btn-primary" data-save-outcome="' + a.id + '">' +
              'Save outcome</button>' +
            (o.recordedAt
              ? '<span class="text-muted text-sm ml-2">Last saved ' +
                M.relativeTime(o.recordedAt) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    bind();

    if (focusId) {
      var el = document.getElementById('grp-' + focusId);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  }

  function docAction(activity, r) {
    if (r.status === C.REQUIREMENT.NOT_SUBMITTED || r.status === C.REQUIREMENT.NEEDS_REVISION) {
      return '<label class="btn btn-sm btn-' +
        (r.status === C.REQUIREMENT.NEEDS_REVISION ? 'warning' : 'primary') + ' mb-0">' +
        '<i class="fa-solid fa-paperclip mr-1"></i>' +
        (r.status === C.REQUIREMENT.NEEDS_REVISION ? 'Replace' : 'Submit') +
        '<input type="file" class="d-none" data-activity="' + activity.id +
          '" data-report="' + M.escapeHtml(r.name) + '"></label>';
    }
    if (r.status === C.REQUIREMENT.UNDER_REVIEW) {
      return '<span class="text-muted text-sm">With SASO since ' +
        M.formatDate(r.submittedAt) + '</span>';
    }
    return '<span class="text-muted text-sm">Accepted ' + M.relativeTime(r.reviewedAt) + '</span>';
  }

  /* ---- bindings -------------------------------------------------------------------- */

  function bind() {
    document.querySelectorAll('[data-report]').forEach(function (input) {
      input.addEventListener('change', function () {
        var activityId = this.getAttribute('data-activity');
        var name = this.getAttribute('data-report');
        var file = this.files && this.files[0] ? this.files[0].name : 'report.pdf';
        E.submitReport(activityId, name, file);
        SASO.layout.toast(name + ' submitted to SASO.');
        render();
      });
    });

    document.querySelectorAll('[data-toggle-outcome]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-toggle-outcome');
        var body = document.getElementById('out-' + id);
        var icon = this.querySelector('i');
        body.classList.toggle('d-none');
        icon.classList.toggle('fa-chevron-right');
        icon.classList.toggle('fa-chevron-down');
      });
    });

    document.querySelectorAll('[data-save-outcome]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-save-outcome');
        E.recordOutcome(id, {
          actualParticipants: Number(document.getElementById('op-' + id).value) || null,
          summary: document.getElementById('os-' + id).value.trim(),
          issues: document.getElementById('oi-' + id).value.trim()
        });
        focusId = id;
        SASO.layout.toast('Outcome saved.');
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
