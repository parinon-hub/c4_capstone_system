/* =========================================================================
   saso-account-requests.js  —  Manage Accounts: organization accounts and
   account requests.

   The first card lists every organization's sign-in account. The Head,
   Administrative Aide and Coordinator can add an organization, edit an
   organization's details and account, or delete its account (the
   organization and its records stay; Edit can give it a new account).

   There is no open sign-up. Organizations request an account from the
   sign-in screen; it waits here until SASO's Head, Administrative Aide or
   Coordinator approves it (creating the organization and its account) or
   declines it with a reason. The same three can also add an organization
   directly. The Records Officer sees the queue read-only.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;
  var L = SASO.listview;
  var F = SASO.orgAccountForm;
  var R = C.ACCOUNT_REQUEST;
  var PAGE_SIZE = 10;

  var session = SASO.layout.init({
    role: C.ROLE.SASO,
    page: 'accounts',
    title: 'Manage Accounts',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/saso/dashboard.html' },
                 { label: 'Organizations', href: 'pages/saso/organizations.html' },
                 { label: 'Manage Accounts' }]
  });
  if (!session) { return; }

  var canAct = M.canManageAccounts(session);
  var state = { status: R.PENDING, search: '', sort: 'submittedAt', dir: 'desc', page: 1 };
  var accState = { search: '', sort: 'acronym', dir: 'asc', page: 1 };

  /* ---- shell ------------------------------------------------------------------- */

  document.getElementById('pageRoot').innerHTML =
    '<div class="row" id="tiles"></div>' +
    (canAct ? '' :
      '<div class="callout callout-info text-sm py-2"><i class="fa-solid fa-eye mr-2"></i>' +
        'View only. Accounts are added, edited and deleted, and requests approved or declined, ' +
        'by the SASO Head, Administrative Aide and Student Activities Coordinator.</div>') +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">Organization accounts</h3>' +
        '<div class="card-tools d-flex align-items-center">' +
          '<input type="search" class="form-control form-control-sm account-search" id="fAccSearch" ' +
            'placeholder="Search accounts">' +
          (canAct
            ? '<button type="button" class="btn btn-sm btn-primary ml-2 text-nowrap" id="btnAddOrg">' +
                '<i class="fa-solid fa-user-plus mr-1"></i>Add organization</button>'
            : '') +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="accountsHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="accountsPager"></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">Account requests</h3>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        '<div class="form-row align-items-end">' +
          '<div class="form-group col-md-7 mb-2">' +
            '<div class="btn-group btn-group-sm flex-wrap" id="statusTabs"></div></div>' +
          '<div class="form-group col-md-5 mb-2">' +
            '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
              'placeholder="Search reference, organization, officer or username"></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body p-0" id="tableHost"></div>' +
      '<div class="card-footer d-flex align-items-center py-2" id="pager"></div>' +
    '</div>';

  /* ---- tiles and tabs ------------------------------------------------------------- */

  function counts() {
    var all = M.accountRequests();
    function n(s) { return all.filter(function (r) { return r.status === s; }).length; }
    return { PENDING: n(R.PENDING), APPROVED: n(R.APPROVED), DECLINED: n(R.DECLINED), ALL: all.length };
  }

  function renderTiles() {
    var c = counts();
    var tiles = [
      { value: c.PENDING, label: 'Awaiting approval', icon: 'fa-hourglass-half', mod: c.PENDING ? 'is-attention' : '' },
      { value: c.APPROVED, label: 'Approved', icon: 'fa-user-check', mod: 'is-complete' },
      { value: c.DECLINED, label: 'Declined', icon: 'fa-user-xmark' },
      { value: M.db().organizations.filter(function (o) { return M.accountForOrg(o.id); }).length,
        label: 'Organizations with accounts', icon: 'fa-people-group' }
    ];
    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');

    var tabs = [
      { key: R.PENDING, label: 'Pending', n: c.PENDING },
      { key: R.APPROVED, label: 'Approved', n: c.APPROVED },
      { key: R.DECLINED, label: 'Declined', n: c.DECLINED },
      { key: '', label: 'All', n: c.ALL }
    ];
    document.getElementById('statusTabs').innerHTML = tabs.map(function (t) {
      return '<button type="button" class="btn btn-outline-primary' + (state.status === t.key ? ' active' : '') +
        '" data-status="' + t.key + '">' + t.label +
        (t.n ? ' <span class="badge badge-light ml-1">' + t.n + '</span>' : '') + '</button>';
    }).join('');
    document.querySelectorAll('#statusTabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.status = this.getAttribute('data-status'); state.page = 1; render();
      });
    });
  }

  /* ---- organization accounts -------------------------------------------------------------- */

  function accountRows() {
    var q = accState.search.toLowerCase();
    var list = M.db().organizations.map(function (o) {
      return { org: o, user: M.accountForOrg(o.id) };
    }).filter(function (r) {
      if (!q) { return true; }
      var u = r.user || {};
      var hay = [r.org.acronym, r.org.name, u.name, u.username, u.email].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    return L.sort(list, accState, function (r) { return r.org.acronym; });
  }

  function renderAccounts() {
    var list = accountRows();
    var paged = L.paginate(list, accState, PAGE_SIZE);
    var host = document.getElementById('accountsHost');

    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-id-card"></i>' +
        '<h6>No accounts match</h6><p>Clear the search to see every organization.</p></div>';
      L.renderPager('accountsPager', 0, 1, accState, PAGE_SIZE, renderAccounts);
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        L.header('Organization') +
        L.header('Account holder') +
        L.header('Contact') +
        L.header('Username') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (r) {
        var o = r.org, u = r.user;
        return '<tr>' +
          '<td><span class="cell-primary">' + M.escapeHtml(o.acronym) + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(o.name) + '</span></td>' +
          (u
            ? '<td class="text-sm">' + M.escapeHtml(u.name) +
                '<span class="cell-sub">' + M.escapeHtml(u.position) + '</span></td>' +
              '<td class="text-sm">' + (u.email ? M.escapeHtml(u.email) : '<span class="text-muted">-</span>') +
                (u.contact ? '<span class="cell-sub">' + M.escapeHtml(u.contact) + '</span>' : '') + '</td>' +
              '<td><code>' + M.escapeHtml(u.username) + '</code></td>'
            : '<td colspan="3" class="text-sm text-muted"><i class="fa-solid fa-user-slash mr-1"></i>' +
                'No sign-in account' + (canAct ? '. Use Edit to create one.' : '.') + '</td>') +
          '<td class="text-right text-nowrap">' +
            (canAct
              ? '<button type="button" class="btn btn-sm btn-outline-secondary ml-1" data-edit-org="' + o.id + '" ' +
                  'title="Edit account" aria-label="Edit ' + M.escapeHtml(o.acronym) + ' account">' +
                  '<i class="fa-solid fa-pen-to-square"></i></button>' +
                (u
                  ? '<button type="button" class="btn btn-sm btn-outline-danger ml-1" data-delete-org="' + o.id + '" ' +
                      'title="Delete account" aria-label="Delete ' + M.escapeHtml(o.acronym) + ' account">' +
                      '<i class="fa-solid fa-trash-can"></i></button>'
                  : '')
              : '') +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    L.renderPager('accountsPager', list.length, paged.pages, accState, PAGE_SIZE, renderAccounts);
    host.querySelectorAll('[data-edit-org]').forEach(function (b) {
      b.addEventListener('click', function () { F.openEditDialog(this.getAttribute('data-edit-org'), renderAll); });
    });
    host.querySelectorAll('[data-delete-org]').forEach(function (b) {
      b.addEventListener('click', function () { confirmDelete(this.getAttribute('data-delete-org')); });
    });
  }

  function confirmDelete(orgId) {
    var org = M.orgById(orgId);
    var user = M.accountForOrg(orgId);
    if (!org || !user) { return; }
    SASO.layout.confirmDialog({
      title: 'Delete the ' + org.acronym + ' account',
      body: 'The username "' + user.username + '" will no longer be able to sign in. ' + org.acronym +
            ' stays on the roster with all its activities and records, and you can give it a new ' +
            'account later with Edit.',
      confirmLabel: 'Delete account', variant: 'danger'
    }, function () {
      var result = E.deleteOrganizationAccount(orgId);
      if (!result.ok) { SASO.layout.toast(result.message, 'danger'); return; }
      SASO.layout.toast('The ' + org.acronym + ' account was deleted.', 'warning');
      renderAll();
    });
  }

  function renderAll() { renderAccounts(); render(); }

  /* ---- account requests ------------------------------------------------------------------- */

  function rows() {
    var q = state.search.toLowerCase();
    var list = M.accountRequests().filter(function (r) {
      if (state.status && r.status !== state.status) { return false; }
      if (q) {
        var hay = [r.ref, r.acronym, r.name, r.officerName, r.username, r.college].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });
    return L.sort(list, state, function (r, key) {
      if (key === 'submittedAt') { return new Date(r.submittedAt); }
      return r[key];
    });
  }

  function statusCell(r) {
    if (r.status === R.APPROVED) {
      return M.badge('APPROVED', 'Approved') +
        '<span class="cell-sub">by ' + M.escapeHtml(r.reviewedBy) + ' · ' + M.relativeTime(r.reviewedAt) + '</span>';
    }
    if (r.status === R.DECLINED) {
      return M.badge(R.DECLINED) +
        '<span class="cell-sub">by ' + M.escapeHtml(r.reviewedBy) + ' · ' + M.relativeTime(r.reviewedAt) + '</span>';
    }
    return M.badge(R.PENDING, 'Pending') +
      '<span class="cell-sub">' + M.daysBetween(r.submittedAt, new Date()) + ' days waiting</span>';
  }

  function render() {
    renderTiles();
    var list = rows();
    var paged = L.paginate(list, state, PAGE_SIZE);
    var host = document.getElementById('tableHost');

    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-id-card"></i>' +
        '<h6>' + (state.status === R.PENDING && !state.search ? 'No requests waiting' : 'No requests match') + '</h6>' +
        '<p>' + (state.status === R.PENDING && !state.search
          ? 'New organizations request an account from the sign-in screen. Their requests appear here.'
          : 'Try another tab or clear the search.') + '</p></div>';
      L.renderPager('pager', 0, 1, state, PAGE_SIZE, render);
      return;
    }

    host.innerHTML = '<div class="table-responsive"><table class="table table-hover">' +
      '<thead><tr>' +
        L.header('Reference') +
        L.header('Organization') +
        '<th>College / type</th><th>Requested by</th>' +
        L.header('Username') +
        '<th>Proof</th>' +
        L.header('Submitted') +
        '<th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
      paged.slice.map(function (r) {
        var pending = r.status === R.PENDING;
        return '<tr class="' + (pending ? 'row-stale' : '') + '">' +
          '<td class="text-nowrap"><code>' + M.escapeHtml(r.ref) + '</code></td>' +
          '<td><span class="cell-primary">' + M.escapeHtml(r.acronym) + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(r.name) + '</span></td>' +
          '<td class="text-sm">' + M.escapeHtml(r.college) +
            '<span class="cell-sub">' + M.label(r.entityType) + '</span></td>' +
          '<td class="text-sm">' + M.escapeHtml(r.officerName) +
            '<span class="cell-sub">' + M.escapeHtml(r.officerPosition) + ' · ' + M.escapeHtml(r.email) + '</span></td>' +
          '<td><code>' + M.escapeHtml(r.username) + '</code></td>' +
          '<td class="text-sm">' + (r.proofFileName
            ? '<span class="file-chip"><i class="fa-solid fa-paperclip mr-1"></i>' + M.escapeHtml(r.proofFileName) + '</span>'
            : '<span class="text-muted">-</span>') + '</td>' +
          '<td class="text-nowrap text-sm text-muted">' + M.formatDate(r.submittedAt) + '</td>' +
          '<td class="text-nowrap">' + statusCell(r) + '</td>' +
          '<td class="text-right"><button type="button" class="btn btn-sm ' +
            (pending && canAct ? 'btn-primary' : 'btn-outline-primary') + '" data-review="' + r.id + '">' +
            (pending && canAct ? 'Review' : 'View') + '</button></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    L.renderPager('pager', list.length, paged.pages, state, PAGE_SIZE, render);
    host.querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () { openReview(this.getAttribute('data-review')); });
    });
  }

  /* ---- review dialog ------------------------------------------------------------------------- */

  function item(label, value) {
    return '<div><span class="cell-sub">' + label + '</span>' + (value || '-') + '</div>';
  }

  function openReview(id) {
    var r = M.accountRequestById(id);
    if (!r) { return; }
    var pending = r.status === R.PENDING;
    var actionable = pending && canAct;
    var mid = 'reviewModal';
    var old = document.getElementById(mid);
    if (old) { old.remove(); }

    var levels = Object.keys(C.ACCREDITATION_LEVEL).map(function (k) {
      var v = C.ACCREDITATION_LEVEL[k];
      return '<option value="' + v + '">' + C.LABEL[v] + '</option>';
    }).join('');
    var expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1);

    var dupAcronym = pending && M.acronymTaken(r.acronym, r.id);
    var dupUser = pending && M.usernameTaken(r.username, r.id);
    var account = r.createdUserId
      ? M.db().users.filter(function (u) { return u.id === r.createdUserId; })[0] : null;

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + mid + '" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header"><div>' +
            '<h5 class="modal-title">' + M.escapeHtml(r.acronym) + ' <code class="ml-1 text-sm">' +
              M.escapeHtml(r.ref) + '</code></h5>' +
            '<div class="cell-sub">' + M.escapeHtml(r.name) + '</div></div>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body">' +
            (dupAcronym || dupUser
              ? '<div class="alert alert-warning text-sm py-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i>' +
                  (dupAcronym ? 'An organization with the acronym <strong>' + M.escapeHtml(r.acronym) +
                    '</strong> already exists. ' : '') +
                  (dupUser ? 'The username <strong>' + M.escapeHtml(r.username) + '</strong> is already in use. ' : '') +
                  'This request cannot be approved as it stands. Decline it with a reason.</div>'
              : '') +
            '<h6 class="oa-section"><i class="fa-solid fa-people-group mr-2"></i>Organization</h6>' +
            '<div class="review-grid">' +
              item('Full name', M.escapeHtml(r.name)) +
              item('Acronym', M.escapeHtml(r.acronym)) +
              item('Type', M.label(r.entityType)) +
              item('College / unit', M.escapeHtml(r.college)) +
              item('Adviser', M.escapeHtml(r.adviser)) +
              item('Proof of recognition', r.proofFileName
                ? '<span class="file-chip"><i class="fa-solid fa-paperclip mr-1"></i>' + M.escapeHtml(r.proofFileName) + '</span>'
                : null) +
            '</div>' +
            '<h6 class="oa-section"><i class="fa-solid fa-user mr-2"></i>Requesting officer</h6>' +
            '<div class="review-grid">' +
              item('Name', M.escapeHtml(r.officerName)) +
              item('Position', M.escapeHtml(r.officerPosition)) +
              item('Email', M.escapeHtml(r.email)) +
              item('Contact', M.escapeHtml(r.contact)) +
              item('Requested username', '<code>' + M.escapeHtml(r.username) + '</code>') +
              item('Submitted', M.formatDate(r.submittedAt) + ' · ' + M.relativeTime(r.submittedAt)) +
            '</div>' +
            (r.notes ? '<div class="req-remarks mt-2">“' + M.escapeHtml(r.notes) + '”</div>' : '') +

            (actionable
              ? '<h6 class="oa-section"><i class="fa-solid fa-certificate mr-2"></i>Record the organization’s standing</h6>' +
                '<div class="form-row">' +
                  '<div class="form-group col-md-4"><label for="rvLevel">Standing</label>' +
                    '<select class="form-control form-control-sm" id="rvLevel">' + levels + '</select></div>' +
                  '<div class="form-group col-md-4"><label for="rvType">Accreditation type</label>' +
                    '<select class="form-control form-control-sm" id="rvType">' +
                      '<option value="' + C.ACCREDITATION_TYPE.ACCREDITED + '">Accredited</option>' +
                      '<option value="' + C.ACCREDITATION_TYPE.RE_ACCREDITED + '">Re-Accredited</option>' +
                    '</select><small class="form-text text-muted">Ignored for Recognized.</small></div>' +
                  '<div class="form-group col-md-4"><label for="rvExpires">Valid until</label>' +
                    '<input type="date" class="form-control form-control-sm" id="rvExpires" value="' +
                      expiry.toISOString().slice(0, 10) + '"></div>' +
                  '<div class="form-group col-12 mb-0"><label for="rvRemarks">Remarks ' +
                    '<span class="text-muted">(required to decline)</span></label>' +
                    '<textarea class="form-control form-control-sm" id="rvRemarks" rows="2" ' +
                      'placeholder="Message to the organization"></textarea>' +
                    '<div class="invalid-feedback">Give a reason so the organization knows why it was declined.</div></div>' +
                '</div>' +
                '<div class="alert alert-danger text-sm py-2 mt-2 mb-0 d-none" id="rvError"></div>'
              : '<h6 class="oa-section"><i class="fa-solid fa-gavel mr-2"></i>Decision</h6>' +
                '<div class="review-grid">' +
                  item('Status', r.status === R.APPROVED ? M.badge('APPROVED', 'Approved') : M.badge(r.status)) +
                  item('Decided by', r.reviewedBy ? M.escapeHtml(r.reviewedBy) + ' · ' + M.formatDate(r.reviewedAt) : null) +
                  item('Remarks', M.escapeHtml(r.remarks)) +
                  (account ? item('Account created', '<code>' + M.escapeHtml(account.username) + '</code>') : '') +
                '</div>') +
          '</div>' +
          '<div class="modal-footer">' +
            (actionable
              ? '<button type="button" class="btn btn-outline-danger mr-auto" id="rvDecline">' +
                  '<i class="fa-solid fa-user-xmark mr-1"></i>Decline</button>' +
                '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
                '<button type="button" class="btn btn-success" id="rvApprove"' +
                  (dupAcronym || dupUser ? ' disabled' : '') + '>' +
                  '<i class="fa-solid fa-user-check mr-1"></i>Approve and create account</button>'
              : '<button type="button" class="btn btn-light" data-dismiss="modal">Close</button>') +
          '</div>' +
        '</div></div></div>');

    var $m = window.jQuery('#' + mid);
    $m.modal('show');
    $m.on('hidden.bs.modal', function () { $m.remove(); });
    if (!actionable) { return; }

    document.getElementById('rvApprove').addEventListener('click', function () {
      var result = E.approveAccountRequest(r.id, {
        accreditationLevel: document.getElementById('rvLevel').value,
        accreditationType: document.getElementById('rvType').value,
        accreditationExpires: document.getElementById('rvExpires').value || null
      }, document.getElementById('rvRemarks').value.trim());
      if (!result.ok) {
        var err = document.getElementById('rvError');
        err.textContent = result.message; err.classList.remove('d-none');
        return;
      }
      $m.modal('hide');
      SASO.layout.toast(result.org.acronym + ' approved: "' + result.user.username + '" can now sign in.');
      renderAll();
    });

    document.getElementById('rvDecline').addEventListener('click', function () {
      var remarksEl = document.getElementById('rvRemarks');
      var remarks = remarksEl.value.trim();
      if (!remarks) { remarksEl.classList.add('is-invalid'); remarksEl.focus(); return; }
      E.declineAccountRequest(r.id, remarks);
      $m.modal('hide');
      SASO.layout.toast('Request ' + r.ref + ' declined.', 'warning');
      render();
    });
  }

  /* ---- controls --------------------------------------------------------------------------------- */

  document.getElementById('fSearch').addEventListener('input', function () {
    state.search = this.value; state.page = 1; render();
  });
  document.getElementById('fAccSearch').addEventListener('input', function () {
    accState.search = this.value; accState.page = 1; renderAccounts();
  });
  var add = document.getElementById('btnAddOrg');
  if (add) { add.addEventListener('click', function () { F.openAddDialog(renderAll); }); }

  /* Open a specific request straight from a notification link. */
  var openId = new URLSearchParams(window.location.search).get('review');
  renderAll();
  if (openId && M.accountRequestById(openId)) {
    var target = M.accountRequestById(openId);
    state.status = target.status; render();
    openReview(openId);
  }
})();
