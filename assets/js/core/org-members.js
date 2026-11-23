/* =========================================================================
   org-members.js  -  The personal accounts of one organization, written once.

   Panel RSC: nobody signs in with a shared organization login. Every member
   who works in the system has a personal account with their own username and
   password, tied to one organization and a position.

   Used in two places:
     SASO   Manage Accounts, "Manage accounts" on an organization's row
            (dialog). SASO's account managers act on every organization.
     Only SASO's account managers add, edit and remove accounts. The
     organization portal shows members read-only on My Organizations.

   There is no limit on the number of accounts unless SASO sets one in
   Settings (model.orgAccountLimit, 0 = no limit).

   Needs config.js, model.js, events.js, layout.js and org-account-form.js.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.orgMembers = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var USERNAME_RE = /^[a-z0-9._-]{3,20}$/i;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function esc(v) { return M.escapeHtml(v); }

  function f(fid, label, control, cols, req, help) {
    return '<div class="form-group col-md-' + cols + '"><label for="' + fid + '" class="text-sm">' + label +
      (req ? ' <span class="text-danger">*</span>' : '') + '</label>' + control +
      '<div class="invalid-feedback" data-error-for="' + fid + '"></div>' +
      (help ? '<small class="form-text text-muted">' + help + '</small>' : '') + '</div>';
  }

  function inp(fid, type, ph, value, extra) {
    return '<input type="' + type + '" class="form-control form-control-sm" id="' + fid + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') + (value ? ' value="' + esc(value) + '"' : '') +
      ' autocomplete="off"' + (extra || '') + '>';
  }

  function options(list, value, blank) {
    return (blank ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === value ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  /* ---- the list ------------------------------------------------------------- */

  function listHtml(org, users, canAct, editingId, me) {
    if (!users.length) {
      return '<div class="empty-state py-3"><i class="fa-solid fa-user-slash"></i><h6>No accounts yet</h6>' +
        '<p>' + esc(org.acronym) + ' cannot sign in until an account is added.</p></div>';
    }
    return '<div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Name</th><th>Position</th>' +
      '<th>Program and college</th><th>Username</th><th>Contact</th><th></th></tr></thead><tbody>' +
      users.map(function (u) {
        var self = me && me.userId === u.id;
        return '<tr' + (editingId === u.id ? ' class="table-active"' : '') + '>' +
          '<td class="text-sm"><span class="cell-primary">' + esc(u.name) + '</span>' +
            (self ? '<span class="cell-sub">You</span>' : '') + '</td>' +
          '<td class="text-sm">' + esc(M.positionTitle(u, org.id)) + '</td>' +
          '<td class="text-sm">' + (u.program ? esc(u.program) : '<span class="text-muted">-</span>') +
            (u.college ? '<span class="cell-sub">' + esc(u.college) + '</span>' : '') + '</td>' +
          '<td><code>' + esc(u.username) + '</code></td>' +
          '<td class="text-sm">' + (u.email ? esc(u.email) : '<span class="text-muted">-</span>') +
            (u.contact ? '<span class="cell-sub">' + esc(u.contact) + '</span>' : '') + '</td>' +
          '<td class="text-right text-nowrap">' +
            (canAct
              ? '<button type="button" class="btn btn-xs btn-outline-secondary ml-1" data-acc-edit="' + u.id + '" ' +
                  'title="Edit account" aria-label="Edit ' + esc(u.name) + '"><i class="fa-solid fa-pen-to-square"></i></button>' +
                (self ? '' :
                  '<button type="button" class="btn btn-xs btn-outline-danger ml-1" data-acc-remove="' + u.id + '" ' +
                    'title="Remove account" aria-label="Remove ' + esc(u.name) + '"><i class="fa-solid fa-trash-can"></i></button>')
              : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---- the add / edit form ---------------------------------------------------- */

  function formHtml(org, editing) {
    var college = editing ? (editing.college || '') : (org.college && M.collegeNames().indexOf(org.college) !== -1 ? org.college : '');
    return '<div class="border-top pt-3 mt-3" id="accForm">' +
      '<h6 class="oa-section"><i class="fa-solid ' + (editing ? 'fa-user-pen' : 'fa-user-plus') + ' mr-2"></i>' +
        (editing ? 'Edit the account of ' + esc(editing.name) : 'Add a member account') + '</h6>' +
      '<div class="form-row">' +
        f('accName', 'Full name', inp('accName', 'text', 'e.g. Juan A. Dela Cruz', editing && editing.name), 6, true) +
        f('accPosition', 'Position', inp('accPosition', 'text', 'e.g. Member', editing ? M.positionTitle(editing, org.id) : '',
            ' list="accPositions"') +
          '<datalist id="accPositions">' + C.ORG_ACCOUNT_POSITIONS.map(function (p) {
            return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>', 6, true,
          'Choose from the list or type another position.') +
        f('accCollege', 'College', '<select class="form-control form-control-sm" id="accCollege">' +
          options(M.collegeNames(), college, 'Select the college') + '</select>', 6, true) +
        f('accProgram', 'Program', '<select class="form-control form-control-sm" id="accProgram">' +
          programOptions(college, editing ? editing.program : '') + '</select>', 6, false,
          'Leave blank for an adviser or faculty member.') +
        f('accEmail', 'Email address', inp('accEmail', 'email', 'name@example.com', editing && editing.email), 6, false) +
        f('accContact', 'Contact number', inp('accContact', 'tel', 'e.g. 0917 000 0000', editing && editing.contact), 6, false) +
        f('accUsername', 'Username', inp('accUsername', 'text', 'e.g. jdelacruz', editing && editing.username), 12, true,
          'The person signs in with this. 3 to 20 characters: letters, numbers, dot, dash or underscore.') +
        f('accPassword', editing ? 'New password' : 'Password',
          inp('accPassword', 'password', editing ? 'Leave blank to keep the current one' : 'At least 6 characters'), 6, !editing) +
        f('accPassword2', editing ? 'Confirm new password' : 'Confirm password', inp('accPassword2', 'password', ''), 6, !editing) +
      '</div>' +
      '<div class="alert alert-danger text-sm py-2 mb-2 d-none" id="accError"></div>' +
      '<div class="text-right">' +
        (editing ? '<button type="button" class="btn btn-light btn-sm mr-1" id="accCancel">Cancel edit</button>' : '') +
        '<button type="button" class="btn btn-primary btn-sm" id="accSave">' +
          '<i class="fa-solid ' + (editing ? 'fa-floppy-disk' : 'fa-user-plus') + ' mr-1"></i>' +
          (editing ? 'Save account' : 'Add account') + '</button>' +
      '</div>' +
    '</div>';
  }

  function programOptions(college, value) {
    var list = college ? M.programsOf(college) : [];
    if (value && list.indexOf(value) === -1) { list = [value].concat(list); }
    return options(list, value || '', college ? 'None (adviser or faculty)' : 'Select the college first');
  }

  function limitNote(org, users, canAct, editing) {
    if (!M.hasAccountLimit()) { return ''; }
    var limit = M.orgAccountLimit();
    if (!canAct || editing || users.length < limit) { return ''; }
    return '<div class="callout callout-warning text-sm py-2 mt-3 mb-0">' + esc(org.acronym) +
      ' has reached the limit of ' + limit + ' accounts set by SASO. Remove an account to add another' +
      (SASO.auth.current().role === C.ROLE.SASO ? ', or change the limit in Settings.' : ', or ask SASO to raise the limit.') +
      '</div>';
  }

  function intro(org) {
    var limit = M.orgAccountLimit();
    return '<div class="callout callout-info text-sm py-2 mb-3"><i class="fa-solid fa-id-card mr-1"></i>' +
      'Every member who works in the system has a <strong>personal account</strong>: their own username and ' +
      'password, tied to ' + esc(org.acronym) + ' and their position. Each submission, reply and report is ' +
      'recorded under that person’s name. ' +
      (limit ? 'SASO allows up to <strong>' + limit + ' accounts</strong> per organization.'
             : 'There is <strong>no limit</strong> on the number of accounts.') +
      ' SASO adds, edits and removes every account.' +
    '</div>';
  }

  /* ---- wiring ------------------------------------------------------------------- */

  /* Renders the accounts of orgId into host and wires the controls.
     onChange() runs after any add, edit or removal. */
  function render(host, orgId, opts) {
    opts = opts || {};
    var org = M.orgById(orgId);
    if (!org) { host.innerHTML = ''; return; }
    var me = SASO.auth.current();
    var canAct = M.canManageMembers(me, orgId);
    var users = M.accountsForOrg(orgId);
    var editing = opts.editingId ? M.userById(opts.editingId) : null;
    var showForm = canAct && (editing || M.accountSlotsLeft(orgId) > 0);

    host.innerHTML = (opts.intro === false ? '' : intro(org)) +
      listHtml(org, users, canAct, editing && editing.id, me) +
      limitNote(org, users, canAct, editing) +
      (showForm ? formHtml(org, editing) : '');

    function again(nextEditing) {
      render(host, orgId, Object.assign({}, opts, { editingId: nextEditing || null }));
      if (opts.onChange) { opts.onChange(); }
    }

    host.querySelectorAll('[data-acc-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        render(host, orgId, Object.assign({}, opts, { editingId: this.getAttribute('data-acc-edit') }));
        var form = host.querySelector('#accForm');
        if (form && form.scrollIntoView) { form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      });
    });
    host.querySelectorAll('[data-acc-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = M.userById(this.getAttribute('data-acc-remove'));
        if (!u) { return; }
        /* Confirmed in place: a second dialog over a dialog would hide it. */
        var cell = this.parentNode;
        var elsewhere = M.membershipsOf(u).length > 1;
        cell.innerHTML = '<span class="text-sm text-danger mr-1">Remove? ' + esc(u.username) +
          (elsewhere ? ' leaves ' + esc(org.acronym) + ' but keeps their other organizations.</span>'
                     : ' will no longer sign in.</span>') +
          '<button type="button" class="btn btn-xs btn-danger" data-acc-yes>Remove</button>' +
          '<button type="button" class="btn btn-xs btn-light ml-1" data-acc-no>Keep</button>';
        cell.querySelector('[data-acc-no]').addEventListener('click', function () { again(opts.editingId); });
        cell.querySelector('[data-acc-yes]').addEventListener('click', function () {
          var result = SASO.events.removeOrgAccount(u.id, orgId);
          if (!result.ok) { SASO.layout.toast(result.message, 'danger'); return; }
          SASO.layout.toast(u.name + ' was removed from ' + org.acronym + '. ' + org.acronym +
            ' keeps all its records.', 'warning');
          again(null);
        });
      });
    });

    var cancel = host.querySelector('#accCancel');
    if (cancel) { cancel.addEventListener('click', function () { again(null); }); }

    var collegeSel = host.querySelector('#accCollege');
    if (collegeSel) {
      collegeSel.addEventListener('change', function () {
        host.querySelector('#accProgram').innerHTML = programOptions(this.value, '');
      });
    }

    var save = host.querySelector('#accSave');
    if (!save) { return; }
    var form = host.querySelector('#accForm');
    SASO.orgAccountForm.bindLiveClear(form);
    save.addEventListener('click', function () {
      function v(fid) { return String(host.querySelector('#' + fid).value || '').trim(); }
      var data = { name: v('accName'), position: v('accPosition'), college: v('accCollege'),
                   program: v('accProgram'), email: v('accEmail'),
                   contact: v('accContact'), username: v('accUsername'),
                   password: host.querySelector('#accPassword').value,
                   password2: host.querySelector('#accPassword2').value };
      var e = {};
      if (!data.name) { e.accName = 'Enter the person’s full name.'; }
      if (!data.position) { e.accPosition = 'Enter the position, for example Member.'; }
      if (!data.college) { e.accCollege = 'Choose the college.'; }
      if (data.email && !EMAIL_RE.test(data.email)) { e.accEmail = 'Enter a valid email address.'; }
      if (!data.username) { e.accUsername = 'Choose a username.'; }
      else if (!USERNAME_RE.test(data.username)) { e.accUsername = 'Use 3 to 20 letters, numbers, dot, dash or underscore.'; }
      if (editing && !data.password && !data.password2) { /* keeps the current password */ }
      else if (!data.password || data.password.length < 6) { e.accPassword = 'Use at least 6 characters.'; }
      if (data.password2 !== data.password) { e.accPassword2 = 'Passwords do not match.'; }
      var box = host.querySelector('#accError');
      box.classList.add('d-none');
      if (!SASO.orgAccountForm.showErrors(form, e)) {
        box.textContent = 'Please correct the highlighted fields.'; box.classList.remove('d-none'); return;
      }
      var result = editing ? SASO.events.updateOrgAccount(editing.id, data, orgId) : SASO.events.addOrgAccount(orgId, data);
      if (!result.ok) { box.textContent = result.message; box.classList.remove('d-none'); return; }
      SASO.layout.toast(editing ? 'Account of ' + result.user.name + ' saved.'
        : 'Account added. ' + result.user.name + ' can sign in as "' + result.user.username + '" now.');
      again(null);
    });
  }

  /* SASO: the same view in a dialog. */
  function openDialog(orgId, onClose) {
    var org = M.orgById(orgId);
    if (!org) { return; }
    var id = 'orgAccountsModal';
    var old = document.getElementById(id);
    if (old) { old.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + id + '" tabindex="-1">' +
        '<div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title"><i class="fa-solid fa-users-gear mr-2 text-muted"></i>' +
              esc(org.acronym) + ' accounts <span class="badge badge-info status-badge ml-1" id="accCountBadge"></span></h5>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body" id="orgAccountsBody"></div>' +
          '<div class="modal-footer"><button type="button" class="btn btn-light" data-dismiss="modal">Close</button></div>' +
        '</div></div></div>');

    function badge() {
      document.getElementById('accCountBadge').textContent = M.accountCountLabel(orgId) +
        (M.accountsForOrg(orgId).length === 1 && !M.hasAccountLimit() ? ' account' : ' accounts');
    }
    render(document.getElementById('orgAccountsBody'), orgId, { onChange: badge });
    badge();

    var $m = window.jQuery('#' + id);
    $m.modal('show');
    $m.on('hidden.bs.modal', function () { $m.remove(); if (onClose) { onClose(); } });
  }

  return { render: render, openDialog: openDialog };
})();
