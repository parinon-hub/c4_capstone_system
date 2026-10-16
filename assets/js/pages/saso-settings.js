/* =========================================================================
   saso-settings.js  —  Office policy values, staff accounts, demo controls.

   Only the values SASO actually varies are editable. Everything else is shown
   read-only, because a settings screen full of switches that change nothing is
   worse than no settings screen at all.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'settings',
    title: 'Settings',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' }, { label: 'Settings' }]
  });
  if (!session) { return; }

  /* Sections start folded so the page opens as a short list of headings.
     Remembers which ones the user opened, so saving the policy (which
     redraws the page) does not fold them back up. */
  var openSections = {};

  function render() {
    var st = M.settings();
    var db = M.db();
    var staff = db.users.filter(function (u) { return u.role === C.ROLE.SASO; });

    document.getElementById('pageRoot').innerHTML =
      '<div class="row">' +

        /* ---- policy ---- */
        '<div class="col-lg-6">' +
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Office policy</h3></div>' +
            '<div class="card-body">' +
              '<div class="form-group">' +
                '<label for="sDeadline" class="text-sm">Days to submit post-activity reports</label>' +
                '<input type="number" min="1" max="90" class="form-control form-control-sm" ' +
                  'id="sDeadline" value="' + st.reportDeadlineDays + '">' +
                '<small class="form-text text-muted">SASO policy is five days after the event. ' +
                  'Applies to activities marked finished from now on; deadlines already set do ' +
                  'not move.</small>' +
              '</div>' +
              '<div class="form-group">' +
                '<label for="sAlert" class="text-sm">Flag a proposal after this many days with one office</label>' +
                '<input type="number" min="1" max="60" class="form-control form-control-sm" ' +
                  'id="sAlert" value="' + st.proposalAlertDays + '">' +
                '<small class="form-text text-muted">Drives the "waiting too long" counters on ' +
                  'the dashboard and the proposal queue.</small>' +
              '</div>' +
              '<div class="form-group">' +
                '<label for="sAccred" class="text-sm">Warn before accreditation expiry (days)</label>' +
                '<input type="number" min="7" max="365" class="form-control form-control-sm" ' +
                  'id="sAccred" value="' + st.accreditationAlertDays + '">' +
              '</div>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnSave">Save policy</button>' +
            '</div>' +
          '</div>' +

          /* ---- approval route ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Approval route</h3>' +
              '<div class="card-tools"><span class="card-subtitle">Read only</span></div></div>' +
            '<div class="card-body">' +
              '<ol class="route-preview pl-0">' +
                '<li><span class="route-no">1</span><span class="route-label">SASO' +
                  '<span class="cell-sub">Reviews the requirements and endorses</span></span></li>' +
                '<li><span class="route-no">2</span><span class="route-label">' +
                  'Vice-President for Academic Affairs' +
                  '<span class="cell-sub">Recorded, not enacted in this system</span></span></li>' +
                '<li><span class="route-no">3</span><span class="route-label">' +
                  "Office of the President" +
                  '<span class="cell-sub">Recorded, not enacted in this system</span></span></li>' +
              '</ol>' +
              '<p class="text-muted text-sm mb-0">On-campus and off-campus activities both ' +
                'conclude at the President\u2019s Office. Off-campus activities additionally ' +
                'require the CMO 63 documentary requirements.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="col-lg-6">' +

          /* ---- staff ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">SASO staff accounts</h3>' +
              '<div class="card-tools"><span class="card-subtitle">' + staff.length +
                ' accounts</span></div></div>' +
            '<div class="card-body p-0"><table class="table table-sm mb-0"><tbody>' +
              staff.map(function (u) {
                return '<tr><td><span class="cell-primary">' + M.escapeHtml(u.name) +
                  (u.username === session.username
                    ? ' <span class="badge badge-info status-badge">You</span>' : '') +
                  '</span><span class="cell-sub">' + M.escapeHtml(u.position) + '</span>' +
                  '<span class="cell-sub">' +
                    (C.PROPOSAL_MANAGERS.indexOf(u.username) !== -1
                      ? '<i class="fa-solid fa-pen-to-square mr-1"></i>Can edit, delete and restore proposals' +
                        (C.ACCOUNT_MANAGERS.indexOf(u.username) !== -1 ? ', and approve organization accounts' : '')
                      : '<i class="fa-regular fa-eye mr-1"></i>View-only access to proposals') +
                  '</span></td>' +
                  '<td class="text-right"><code>' + M.escapeHtml(u.username) + '</code></td></tr>';
              }).join('') +
            '</tbody></table></div>' +
            '<div class="card-footer text-muted text-sm">' +
              'SASO accounts share the same permissions, except that only the Head, Administrative ' +
              'Aide and Student Activities Coordinator can edit or delete a proposal under SASO ' +
              'review, manage the trash bin (deleted proposals are kept ' + C.TRASH_RETENTION_DAYS +
              ' days), and approve account requests or add, edit and delete organization accounts. There is no ' +
              'open sign-up.</div>' +
          '</div>' +

          /* ---- requirement checklists ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Requirement checklists</h3>' +
              '<div class="card-tools"><span class="card-subtitle">Read only</span></div></div>' +
            '<div class="card-body p-0">' +
              checklist('Pre-approval — all activities', C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_COMMON) +
              checklist('Pre-approval — off-campus only',
                        C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_OFF_CAMPUS_EXTRA) +
              checklist('Post-activity', C.REQUIREMENT_TEMPLATES.POST_ACTIVITY) +
            '</div>' +
            '<div class="card-footer text-muted text-sm">' +
              'Taken from the documents SASO supplied. SASO can still request an additional ' +
              'document on any individual activity.</div>' +
          '</div>' +

          /* ---- demo data ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Demonstration data</h3></div>' +
            '<div class="card-body">' +
              '<div class="review-meta mb-3">' +
                '<div><span class="cell-sub">Organizations</span>' + db.organizations.length + '</div>' +
                '<div><span class="cell-sub">Activities</span>' + db.activities.length + '</div>' +
                '<div><span class="cell-sub">Requirements</span>' + db.requirements.length + '</div>' +
                '<div><span class="cell-sub">Notifications</span>' + db.notifications.length + '</div>' +
                '<div><span class="cell-sub">Comments</span>' + db.comments.length + '</div>' +
                '<div><span class="cell-sub">Seeded</span>' +
                  M.formatDate(db.meta ? db.meta.seededAt : null) + '</div>' +
              '</div>' +
              '<p class="text-muted text-sm">Organization names and accreditation levels follow ' +
                'the CSPC roster for AY ' + (db.organizations[0] || {}).accreditationAY + '. ' +
                'Advisers, officers, activities and all compliance records are simulated.</p>' +
              '<button type="button" class="btn btn-outline-warning btn-sm" id="btnReset">' +
                '<i class="fa-solid fa-rotate mr-1"></i>Reset demonstration data</button>' +
            '</div>' +
          '</div>' +

          /* ---- about ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">About this prototype</h3></div>' +
            '<div class="card-body p-0"><table class="table table-sm detail-table mb-0"><tbody>' +
              '<tr><th>Architecture</th><td>HTML5, CSS3, JavaScript, Bootstrap, AdminLTE. ' +
                'All state is held in the browser.</td></tr>' +
              '<tr><th>Not implemented</th><td>Back-end, database, real file storage, real ' +
                'authentication, email or SMS delivery.</td></tr>' +
              '<tr><th>Simulated</th><td>Document upload records a filename only. Login compares ' +
                'plain-text credentials in the browser.</td></tr>' +
              '<tr><th>Printed documents</th><td>Reconstructions from the documents SASO ' +
                'described, not the official CSPC forms.</td></tr>' +
            '</tbody></table></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    addCollapseButtons();
    bind();
  }

  function addCollapseButtons() {
    document.querySelectorAll('#pageRoot .card').forEach(function (card, i) {
      var header = card.querySelector('.card-header');
      var title = header.querySelector('.card-title').textContent;
      var tools = header.querySelector('.card-tools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'card-tools';
        header.appendChild(tools);
      }

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-tool section-toggle';
      button.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      tools.appendChild(button);

      function apply() {
        var open = !!openSections[title];
        card.classList.toggle('is-folded', !open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        button.setAttribute('aria-label', (open ? 'Hide ' : 'Show ') + title);
        button.title = open ? 'Hide' : 'Show';
      }

      button.addEventListener('click', function () {
        openSections[title] = !openSections[title];
        apply();
      });
      header.addEventListener('click', function (e) {
        if (e.target === header || e.target.classList.contains('card-title')) { button.click(); }
      });
      apply();
    });
  }

  function checklist(title, items) {
    return '<div class="req-group">' +
      '<div class="req-group-head"><div><span class="cell-primary">' + title + '</span></div></div>' +
      '<table class="table table-sm mb-0"><tbody>' +
        items.map(function (t) {
          return '<tr><td>' + M.escapeHtml(t.name) + '</td>' +
            '<td class="text-right">' +
              (t.mandatory
                ? '<span class="badge badge-info status-badge">Required</span>'
                : '<span class="badge badge-secondary status-badge">Optional</span>') +
            '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
  }

  function bind() {
    document.getElementById('btnSave').addEventListener('click', function () {
      var deadline = Number(document.getElementById('sDeadline').value);
      var alertDays = Number(document.getElementById('sAlert').value);
      var accred = Number(document.getElementById('sAccred').value);

      if (!(deadline > 0) || !(alertDays > 0) || !(accred > 0)) {
        SASO.layout.toast('Enter a number greater than zero for each value.', 'danger');
        return;
      }

      M.saveSettings({
        reportDeadlineDays: deadline,
        proposalAlertDays: alertDays,
        accreditationAlertDays: accred
      });
      SASO.layout.toast('Policy saved.');
      render();
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      SASO.layout.confirmDialog({
        title: 'Reset demonstration data',
        body: 'This clears everything done in this session and restores the original ' +
              'sample data. Use it before a fresh walkthrough.',
        confirmLabel: 'Reset data', variant: 'warning'
      }, function () {
        SASO.storage.reset();
        window.location.reload();
      });
    });
  }

  render();
})();
