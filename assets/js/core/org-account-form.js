/* =========================================================================
   org-account-form.js  —  The organization-and-account form, written once.

   Used in two places:
     mode 'request'  the public "Request an account" page (no one signed in);
                     adds proof of recognition and an officer declaration.
     mode 'saso'     SASO's "Add organization" dialog; adds the
                     accreditation standing SASO records for the organization.
     mode 'edit'     SASO's "Edit account" dialog on Manage Accounts; the same
                     fields as 'saso', filled in, with the password optional.

   Needs config.js and model.js. Does not need layout.js, so it works on the
   public page.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.orgAccountForm = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var USERNAME_RE = /^[a-z0-9._-]{3,20}$/i;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function esc(v) { return M.escapeHtml(v); }

  function group(id, label, control, cols, required, help) {
    return '<div class="form-group col-md-' + (cols || 12) + '">' +
      '<label for="' + id + '">' + label + (required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
      control +
      '<div class="invalid-feedback" data-error-for="' + id + '"></div>' +
      (help ? '<small class="form-text text-muted">' + help + '</small>' : '') +
    '</div>';
  }

  function input(id, type, placeholder, extra) {
    return '<input type="' + (type || 'text') + '" class="form-control form-control-sm" id="' + id + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + (extra || '') + '>';
  }

  function select(id, options, value) {
    return '<select class="form-control form-control-sm" id="' + id + '">' +
      options.map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' +
          esc(o.label) + '</option>';
      }).join('') + '</select>';
  }

  function section(title, icon) {
    return '<h6 class="oa-section"><i class="fa-solid ' + icon + ' mr-2"></i>' + title + '</h6>';
  }

  function defaultExpiry() {
    var d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  /* ---- markup ----------------------------------------------------------------- */

  function html(mode, opts) {
    var isRequest = mode === 'request';
    var keepPassword = mode === 'edit' && !(opts && opts.newAccount);
    var colleges = [];
    M.db().organizations.forEach(function (o) {
      if (o.college && colleges.indexOf(o.college) === -1) { colleges.push(o.college); }
    });

    var entities = Object.keys(C.ENTITY).map(function (k) {
      return { value: C.ENTITY[k], label: C.LABEL[C.ENTITY[k]] };
    });
    var levels = Object.keys(C.ACCREDITATION_LEVEL).map(function (k) {
      return { value: C.ACCREDITATION_LEVEL[k], label: C.LABEL[C.ACCREDITATION_LEVEL[k]] };
    });
    var types = [
      { value: C.ACCREDITATION_TYPE.ACCREDITED, label: C.LABEL[C.ACCREDITATION_TYPE.ACCREDITED] },
      { value: C.ACCREDITATION_TYPE.RE_ACCREDITED, label: C.LABEL[C.ACCREDITATION_TYPE.RE_ACCREDITED] }
    ];

    return '' +
      section('Organization', 'fa-people-group') +
      '<div class="form-row">' +
        group('oaName', 'Full name of the organization',
          input('oaName', 'text', 'e.g. Society of Hospitality Management Students'), 12, true) +
        group('oaAcronym', 'Acronym', input('oaAcronym', 'text', 'e.g. SHMS'), 4, true) +
        group('oaEntity', 'Type', select('oaEntity', entities, C.ENTITY.STUDENT_ORG), 4, true) +
        group('oaCollege', 'College / unit',
          input('oaCollege', 'text', 'e.g. College of Arts and Sciences', ' list="oaCollegeList"') +
          '<datalist id="oaCollegeList">' + colleges.map(function (c) {
            return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>', 4, true) +
        group('oaAdviser', 'Organization adviser', input('oaAdviser', 'text', 'e.g. Prof. A. Reyes'), 12, true) +
      '</div>' +

      (isRequest ? '' :
        section('Recognition and accreditation', 'fa-certificate') +
        '<div class="form-row">' +
          group('oaLevel', 'Standing', select('oaLevel', levels, C.ACCREDITATION_LEVEL.RECOGNIZED), 4, true) +
          group('oaType', 'Accreditation type', select('oaType', types, C.ACCREDITATION_TYPE.ACCREDITED), 4, false,
            'Ignored for Recognized organizations.') +
          group('oaExpires', 'Valid until', input('oaExpires', 'date', '', ' value="' + defaultExpiry() + '"'), 4, true) +
        '</div>') +

      section(isRequest ? 'Officer requesting the account' : 'Officer who will hold the account', 'fa-user') +
      '<div class="form-row">' +
        group('oaOfficer', 'Full name', input('oaOfficer', 'text', 'e.g. J. Dela Cruz'), 6, true) +
        group('oaPosition', 'Position', input('oaPosition', 'text', 'e.g. President'), 6, true) +
        group('oaEmail', 'Email address', input('oaEmail', 'email', 'name@example.com'), 6, mode !== 'edit') +
        group('oaContact', 'Contact number', input('oaContact', 'tel', 'e.g. 0917 000 0000'), 6, false) +
      '</div>' +

      section('Sign-in details', 'fa-key') +
      '<div class="form-row">' +
        group('oaUsername', 'Username', input('oaUsername', 'text', 'e.g. shms', ' autocomplete="off"'), 12, true,
          '3–20 characters: letters, numbers, dot, dash or underscore.') +
        group('oaPassword', keepPassword ? 'New password' : 'Password',
          input('oaPassword', 'password', keepPassword ? 'Leave blank to keep the current one' : 'At least 6 characters',
            ' autocomplete="new-password"'), 6, !keepPassword) +
        group('oaPassword2', keepPassword ? 'Confirm new password' : 'Confirm password',
          input('oaPassword2', 'password', '', ' autocomplete="new-password"'), 6, !keepPassword) +
      '</div>' +

      (isRequest
        ? section('Proof of recognition', 'fa-paperclip') +
          '<div class="form-row">' +
            group('oaProof', 'Certificate of recognition or accreditation from SASO',
              '<input type="file" class="form-control-file" id="oaProof">', 12, true,
              'Prototype: only the file name is recorded.') +
            group('oaNotes', 'Message to SASO (optional)',
              '<textarea class="form-control form-control-sm" id="oaNotes" rows="2" ' +
              'placeholder="Anything SASO should know"></textarea>', 12, false) +
          '</div>' +
          '<div class="custom-control custom-checkbox mb-2">' +
            '<input type="checkbox" class="custom-control-input" id="oaAgree">' +
            '<label class="custom-control-label text-sm" for="oaAgree">I am an officer of this organization ' +
              'and the details above are correct. I understand the account will be usable only after ' +
              'SASO approves this request.</label>' +
            '<div class="invalid-feedback" data-error-for="oaAgree"></div>' +
          '</div>'
        : '');
  }

  /* ---- reading and validation ------------------------------------------------------ */

  function val(root, id) {
    var el = root.querySelector('#' + id);
    return el ? String(el.value || '').trim() : '';
  }

  function read(root, mode) {
    var proof = root.querySelector('#oaProof');
    var v = {
      name: val(root, 'oaName'),
      acronym: val(root, 'oaAcronym'),
      entityType: val(root, 'oaEntity'),
      college: val(root, 'oaCollege'),
      adviser: val(root, 'oaAdviser'),
      officerName: val(root, 'oaOfficer'),
      officerPosition: val(root, 'oaPosition'),
      email: val(root, 'oaEmail'),
      contact: val(root, 'oaContact'),
      username: val(root, 'oaUsername'),
      password: root.querySelector('#oaPassword').value,
      password2: root.querySelector('#oaPassword2').value
    };
    if (mode === 'request') {
      v.proofFileName = proof && proof.files && proof.files[0] ? proof.files[0].name : '';
      v.notes = val(root, 'oaNotes');
      v.agree = root.querySelector('#oaAgree').checked;
    } else {
      v.accreditationLevel = val(root, 'oaLevel');
      v.accreditationType = val(root, 'oaType');
      v.accreditationExpires = val(root, 'oaExpires');
    }
    return v;
  }

  function same(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }

  /* current: in 'edit' mode, the organization and account being edited, so
     keeping their own acronym and username is not reported as taken. */
  function validate(v, mode, current) {
    var e = {};
    var org = current && current.org;
    var user = current && current.user;
    var keepPassword = mode === 'edit' && !!user;
    if (!v.name) { e.oaName = 'Enter the organization’s full name.'; }
    if (!v.acronym) { e.oaAcronym = 'Enter the acronym.'; }
    else if (!(org && same(v.acronym, org.acronym)) && M.acronymTaken(v.acronym)) { e.oaAcronym = 'An organization with this acronym already exists or has a pending request.'; }
    if (!v.college) { e.oaCollege = 'Enter the college or unit.'; }
    if (!v.adviser) { e.oaAdviser = 'Enter the adviser’s name.'; }
    if (!v.officerName) { e.oaOfficer = 'Enter the officer’s name.'; }
    if (!v.officerPosition) { e.oaPosition = 'Enter the officer’s position.'; }
    /* Some older accounts have no email on file, so editing them does not demand one. */
    if (!v.email) { if (mode !== 'edit') { e.oaEmail = 'Enter an email address.'; } }
    else if (!EMAIL_RE.test(v.email)) { e.oaEmail = 'Enter a valid email address.'; }
    if (!v.username) { e.oaUsername = 'Choose a username.'; }
    else if (!USERNAME_RE.test(v.username)) { e.oaUsername = 'Use 3–20 letters, numbers, dot, dash or underscore.'; }
    else if (!(user && same(v.username, user.username)) && M.usernameTaken(v.username)) {
      e.oaUsername = 'This username is already taken.';
    }
    if (keepPassword && !v.password && !v.password2) { /* keeps the current password */ }
    else if (!v.password || v.password.length < 6) { e.oaPassword = 'Use at least 6 characters.'; }
    if (v.password2 !== v.password) { e.oaPassword2 = 'Passwords do not match.'; }
    if (mode === 'request') {
      if (!v.proofFileName) { e.oaProof = 'Attach the certificate of recognition or accreditation.'; }
      if (!v.agree) { e.oaAgree = 'Please confirm the declaration.'; }
    } else if (!v.accreditationExpires) {
      e.oaExpires = 'Set the date this standing is valid until.';
    }
    return e;
  }

  /* Marks fields; returns true when there are no errors. */
  function showErrors(root, errors) {
    root.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    root.querySelectorAll('[data-error-for]').forEach(function (el) { el.textContent = ''; el.style.display = ''; });
    var first = null;
    Object.keys(errors).forEach(function (id) {
      var el = root.querySelector('#' + id);
      var msg = root.querySelector('[data-error-for="' + id + '"]');
      if (el) { el.classList.add('is-invalid'); if (!first) { first = el; } }
      if (msg) { msg.textContent = errors[id]; msg.style.display = 'block'; }
    });
    if (first) { first.focus(); }
    return !first;
  }

  /* A field's error clears as soon as the person corrects it. */
  function bindLiveClear(root) {
    function clear(e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains('is-invalid')) { return; }
      el.classList.remove('is-invalid');
      var msg = root.querySelector('[data-error-for="' + el.id + '"]');
      if (msg) { msg.textContent = ''; msg.style.display = ''; }
    }
    root.addEventListener('input', clear);
    root.addEventListener('change', clear);
  }

  /* ---- SASO: Add organization dialog -------------------------------------------------
     For a newly recognized organization SASO sets up itself, without waiting
     for a request. SASO pages only (needs layout.js and events.js). */

  function openAddDialog(onDone) {
    var session = SASO.auth.current();
    if (!M.canManageAccounts(session)) {
      SASO.layout.toast('Only the SASO Head, Administrative Aide and Coordinator can add organizations.', 'warning');
      return;
    }
    var id = 'addOrgModal';
    var old = document.getElementById(id);
    if (old) { old.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + id + '" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title"><i class="fa-solid fa-user-plus mr-2 text-muted"></i>Add a recognized organization</h5>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body" id="addOrgForm">' +
            '<div class="callout callout-info text-sm py-2 mb-3">Creates the organization on the roster ' +
              'and its sign-in account in one step. Give the username and password to the officer. ' +
              'The SASO Head, Administrative Aide and Coordinator will be notified.</div>' +
            html('saso') +
            '<div class="alert alert-danger text-sm py-2 mb-0 d-none" id="addOrgError"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="addOrgSave">' +
              '<i class="fa-solid fa-user-plus mr-1"></i>Create organization and account</button>' +
          '</div>' +
        '</div></div></div>');

    var $m = window.jQuery('#' + id);
    $m.modal('show');
    bindLiveClear(document.getElementById('addOrgForm'));

    document.getElementById('addOrgSave').addEventListener('click', function () {
      var root = document.getElementById('addOrgForm');
      var errorBox = document.getElementById('addOrgError');
      errorBox.classList.add('d-none');
      var v = read(root, 'saso');
      if (!showErrors(root, validate(v, 'saso'))) {
        errorBox.textContent = 'Please correct the highlighted fields.';
        errorBox.classList.remove('d-none');
        return;
      }
      var result = SASO.events.createOrganizationAccount(v);
      if (!result.ok) {
        errorBox.textContent = result.message;
        errorBox.classList.remove('d-none');
        return;
      }
      $m.modal('hide');
      SASO.layout.toast(result.org.acronym + ' added. The account "' + result.user.username +
        '" can sign in now.');
      if (onDone) { onDone(result); }
    });

    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  /* ---- SASO: Edit account dialog ---------------------------------------------------- */

  function fill(root, id, value) {
    var el = root.querySelector('#' + id);
    if (el && value != null) { el.value = value; }
  }

  /* The stored position reads "President, JPCS - CSPC"; the form edits the
     part before the acronym. */
  function officerPosition(user, org) {
    var suffix = ', ' + org.acronym;
    var p = user.position || '';
    return p.slice(-suffix.length) === suffix ? p.slice(0, -suffix.length) : p;
  }

  function openEditDialog(orgId, onDone) {
    var session = SASO.auth.current();
    if (!M.canManageAccounts(session)) {
      SASO.layout.toast('Only the SASO Head, Administrative Aide and Coordinator can edit accounts.', 'warning');
      return;
    }
    var org = M.orgById(orgId);
    if (!org) { return; }
    var user = M.accountForOrg(orgId);
    var id = 'editOrgModal';
    var old = document.getElementById(id);
    if (old) { old.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + id + '" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title"><i class="fa-solid fa-user-pen mr-2 text-muted"></i>Edit ' + esc(org.acronym) + '</h5>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body" id="editOrgForm">' +
            (user ? '' :
              '<div class="callout callout-warning text-sm py-2 mb-3">This organization has no sign-in ' +
                'account. Enter a username and password to create a new one.</div>') +
            html('edit', { newAccount: !user }) +
            '<div class="alert alert-danger text-sm py-2 mb-0 d-none" id="editOrgError"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="editOrgSave">' +
              '<i class="fa-solid fa-floppy-disk mr-1"></i>Save changes</button>' +
          '</div>' +
        '</div></div></div>');

    var root = document.getElementById('editOrgForm');
    fill(root, 'oaName', org.name);
    fill(root, 'oaAcronym', org.acronym);
    fill(root, 'oaEntity', org.entityType);
    fill(root, 'oaCollege', org.college);
    fill(root, 'oaAdviser', org.adviser);
    fill(root, 'oaLevel', org.accreditationLevel);
    if (org.accreditationType !== C.ACCREDITATION_TYPE.NOT_APPLICABLE) { fill(root, 'oaType', org.accreditationType); }
    fill(root, 'oaExpires', org.accreditationExpires ? String(org.accreditationExpires).slice(0, 10) : '');
    if (user) {
      fill(root, 'oaOfficer', user.name);
      fill(root, 'oaPosition', officerPosition(user, org));
      fill(root, 'oaEmail', user.email);
      fill(root, 'oaContact', user.contact);
      fill(root, 'oaUsername', user.username);
    }

    var $m = window.jQuery('#' + id);
    $m.modal('show');
    bindLiveClear(root);

    document.getElementById('editOrgSave').addEventListener('click', function () {
      var errorBox = document.getElementById('editOrgError');
      errorBox.classList.add('d-none');
      var v = read(root, 'edit');
      if (!showErrors(root, validate(v, 'edit', { org: org, user: user }))) {
        errorBox.textContent = 'Please correct the highlighted fields.';
        errorBox.classList.remove('d-none');
        return;
      }
      var result = SASO.events.updateOrganizationAccount(org.id, v);
      if (!result.ok) {
        errorBox.textContent = result.message;
        errorBox.classList.remove('d-none');
        return;
      }
      $m.modal('hide');
      SASO.layout.toast(result.created
        ? result.org.acronym + ' has a new account. "' + result.user.username + '" can sign in now.'
        : result.org.acronym + ' saved.');
      if (onDone) { onDone(result); }
    });

    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  return { html: html, read: read, validate: validate, showErrors: showErrors,
           openAddDialog: openAddDialog, openEditDialog: openEditDialog, bindLiveClear: bindLiveClear };
})();
