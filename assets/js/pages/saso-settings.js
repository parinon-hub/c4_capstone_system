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
              '<div class="form-group">' +
                '<label class="text-sm d-block">Accounts per organization</label>' +
                '<div class="custom-control custom-switch mb-2">' +
                  '<input type="checkbox" class="custom-control-input" id="sNoLimit"' +
                    (M.hasAccountLimit() ? '' : ' checked') + '>' +
                  '<label class="custom-control-label text-sm" for="sNoLimit">No limit</label>' +
                '</div>' +
                '<div class="input-group input-group-sm' + (M.hasAccountLimit() ? '' : ' d-none') + '" id="sAccountsGroup" style="max-width:16rem">' +
                  '<div class="input-group-prepend"><span class="input-group-text">Up to</span></div>' +
                  '<input type="number" min="1" max="' + C.ORG_ACCOUNT_LIMIT_MAX + '" class="form-control" ' +
                    'id="sAccounts" value="' + (M.orgAccountLimit() || 10) + '">' +
                  '<div class="input-group-append"><span class="input-group-text">accounts</span></div>' +
                '</div>' +
                '<small class="form-text text-muted">Every member signs in with a personal account ' +
                  '(own username and password) tied to the organization and a position. There is no ' +
                  'limit by default; switch it off to set a maximum per organization. Lowering the ' +
                  'number keeps existing accounts but stops new ones being added.</small>' +
              '</div>' +
              '<div class="form-group">' +
                '<label for="sRetention" class="text-sm">Keep activity and accomplishment records for (academic years)</label>' +
                '<input type="number" min="' + C.RECORD_RETENTION_YEARS + '" max="10" class="form-control form-control-sm" ' +
                  'id="sRetention" value="' + st.retentionYears + '">' +
                '<small class="form-text text-muted">At least ' + C.RECORD_RETENTION_YEARS + ' academic ' +
                  'years after the year an activity belongs to, for accreditation. Records are never ' +
                  'deleted automatically; see Records Archive.</small>' +
              '</div>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnSave">Save policy</button>' +
            '</div>' +
          '</div>' +

          /* ---- signatories on the SASO forms ---- */
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Signatories on SASO forms</h3></div>' +
            '<div class="card-body">' +
              '<p class="text-muted text-sm">Printed on the Permission to Conduct forms ' +
                '(CSPC-F-SASO-05 and -07) that organizations download already filled in. ' +
                'Change a name here when the office changes hands.</p>' +
              signatoryRow('sasDirector', 'Recommending approval (SASO)') +
              signatoryRow('vpaa', 'VPAA') +
              signatoryRow('president', 'President (off-campus approval)') +
              '<button type="button" class="btn btn-primary btn-sm mr-1" id="btnSaveSig">Save signatories</button>' +
              '<button type="button" class="btn btn-light btn-sm" id="btnResetSig">Restore the names on the SASO forms</button>' +
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
              checklist('Pre-approval (all activities)', C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_COMMON
                .concat(C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_BUDGET)) +
              checklist('Pre-approval (on-campus only, CSPC-F-SASO-59)',
                        C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_ON_CAMPUS_EXTRA) +
              checklist('Pre-approval (off-campus only)',
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
                '<div><span class="cell-sub">Organizations</span>' + M.organizations().length +
                  ' on the roster, ' + (db.organizations.length - M.organizations().length) + ' in past records</div>' +
                '<div><span class="cell-sub">Activities</span>' + db.activities.length + '</div>' +
                '<div><span class="cell-sub">Requirements</span>' + db.requirements.length + '</div>' +
                '<div><span class="cell-sub">Notifications</span>' + db.notifications.length + '</div>' +
                '<div><span class="cell-sub">Comments</span>' + db.comments.length + '</div>' +
                '<div><span class="cell-sub">Seeded</span>' +
                  M.formatDate(db.meta ? db.meta.seededAt : null) + '</div>' +
              '</div>' +
              '<p class="text-muted text-sm">Organization names and accreditation levels follow ' +
                'the CSPC roster for AY ' + (db.organizations[0] || {}).accreditationAY + '. ' +
                'AY 2023-2024 and AY 2024-2025 are SASO\u2019s own lists of student activities ' +
                '(July to December 2023 and 2024). Advisers, officers, the current year\u2019s ' +
                'activities and their compliance records are simulated.</p>' +
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
              '<tr><th>Printed documents</th><td>The Permission to Conduct forms (CSPC-F-SASO-05, ' +
                '-07) and the on-campus requirements checklist (CSPC-F-SASO-59) follow the blank ' +
                'forms SASO supplied. The activity proposal and terminal report sheets are the ' +
                'researchers\u2019 layouts.</td></tr>' +
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

  function signatoryRow(key, label) {
    var sig = M.signatories()[key];
    return '<div class="form-row">' +
      '<div class="form-group col-md-6"><label for="sig_' + key + '_name" class="text-sm">' + label + ': name</label>' +
        '<input type="text" class="form-control form-control-sm" id="sig_' + key + '_name" value="' +
          M.escapeHtml(sig.name) + '"></div>' +
      '<div class="form-group col-md-6"><label for="sig_' + key + '_title" class="text-sm">Title</label>' +
        '<input type="text" class="form-control form-control-sm" id="sig_' + key + '_title" value="' +
          M.escapeHtml(sig.title) + '"></div>' +
    '</div>';
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
      var noLimit = document.getElementById('sNoLimit').checked;
      var accounts = noLimit ? 0 : Number(document.getElementById('sAccounts').value);
      var retention = Number(document.getElementById('sRetention').value);

      if (!(deadline > 0) || !(alertDays > 0) || !(accred > 0)) {
        SASO.layout.toast('Enter a number greater than zero for each value.', 'danger');
        return;
      }
      if (!noLimit && (!(accounts >= 1 && accounts <= C.ORG_ACCOUNT_LIMIT_MAX) || Math.floor(accounts) !== accounts)) {
        SASO.layout.toast('Accounts per organization must be a whole number from 1 to ' +
          C.ORG_ACCOUNT_LIMIT_MAX + '.', 'danger');
        return;
      }
      if (!(retention >= C.RECORD_RETENTION_YEARS && retention <= 10) || Math.floor(retention) !== retention) {
        SASO.layout.toast('Records must be kept for at least ' + C.RECORD_RETENTION_YEARS +
          ' academic years.', 'danger');
        return;
      }

      M.saveSettings({
        reportDeadlineDays: deadline,
        proposalAlertDays: alertDays,
        accreditationAlertDays: accred,
        orgAccountLimit: accounts,
        retentionYears: retention
      });
      SASO.layout.toast('Policy saved.');
      render();
    });

    document.getElementById('sNoLimit').addEventListener('change', function () {
      document.getElementById('sAccountsGroup').classList.toggle('d-none', this.checked);
    });

    document.getElementById('btnSaveSig').addEventListener('click', function () {
      var sig = {};
      var missing = false;
      Object.keys(C.SIGNATORIES).forEach(function (k) {
        var name = document.getElementById('sig_' + k + '_name').value.trim();
        var title = document.getElementById('sig_' + k + '_title').value.trim();
        if (!name || !title) { missing = true; }
        sig[k] = { name: name, title: title };
      });
      if (missing) { SASO.layout.toast('Enter a name and a title for each signatory.', 'danger'); return; }
      M.saveSettings({ signatories: sig });
      SASO.layout.toast('Signatories saved. New PTC forms will carry these names.');
      render();
    });

    document.getElementById('btnResetSig').addEventListener('click', function () {
      M.saveSettings({ signatories: JSON.parse(JSON.stringify(C.SIGNATORIES)) });
      SASO.layout.toast('Signatories restored to the names on the SASO forms.');
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
