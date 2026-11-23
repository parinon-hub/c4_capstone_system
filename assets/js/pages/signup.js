/* =========================================================================
   signup.js  -  The public "Sign up" page, for students and advisers.

   Every person has one account of their own. A student or adviser signs up
   here; SASO approves the account on Manage Accounts. Once signed in, they
   ask to join their organizations from My Organizations, and SASO approves
   each one. A student can belong to several organizations.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var F = SASO.orgAccountForm;
  var USERNAME_RE = /^[a-z0-9._-]{3,20}$/i;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function esc(v) { return M.escapeHtml(v); }

  var existing = SASO.auth.current();
  if (existing) {
    window.location.replace(SASO.auth.homeFor(existing, './'));
    return;
  }

  var card = document.getElementById('requestCard');

  function group(id, label, control, cols, required, help) {
    return '<div class="form-group col-md-' + cols + '">' +
      '<label for="' + id + '">' + label + (required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
      control + '<div class="invalid-feedback" data-error-for="' + id + '"></div>' +
      (help ? '<small class="form-text text-muted">' + help + '</small>' : '') + '</div>';
  }

  function input(id, type, placeholder, extra) {
    return '<input type="' + type + '" class="form-control form-control-sm" id="' + id + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + (extra || '') + '>';
  }

  function renderForm() {
    card.innerHTML =
      '<div class="callout callout-info text-sm py-2 mb-3">' +
        '<strong>How it works.</strong> Create your own account once. SASO checks it, and after ' +
        'approval you sign in and join your organizations from <strong>My Organizations</strong>. ' +
        'If you are in more than one organization, you choose which one you are acting for.' +
      '</div>' +
      '<div id="oaForm">' +
        '<h6 class="oa-section"><i class="fa-solid fa-user mr-2"></i>About you</h6>' +
        '<div class="form-row">' +
          group('suName', 'Full name', input('suName', 'text', 'e.g. Juan A. Dela Cruz'), 12, true) +
          group('suProgram', 'Program',
            F.selectWithOther('suProgram', F.programGroups(), 'Select your program', 'Type the full name of the program'),
            12, true, 'Your college is filled in from the program you choose. Advisers choose None.') +
          group('suEmail', 'Email address', input('suEmail', 'email', 'name@example.com'), 6, true) +
          group('suContact', 'Contact number', input('suContact', 'tel', 'e.g. 0917 000 0000'), 6, false) +
        '</div>' +
        '<h6 class="oa-section"><i class="fa-solid fa-key mr-2"></i>Sign-in details</h6>' +
        '<div class="form-row">' +
          group('suUsername', 'Username', input('suUsername', 'text', 'e.g. jdelacruz', ' autocomplete="off"'), 12, true,
            '3 to 20 characters: letters, numbers, dot, dash or underscore.') +
          group('suPassword', 'Password', input('suPassword', 'password', 'At least 6 characters', ' autocomplete="new-password"'), 6, true) +
          group('suPassword2', 'Confirm password', input('suPassword2', 'password', '', ' autocomplete="new-password"'), 6, true) +
        '</div>' +
        '<div class="custom-control custom-checkbox mb-2">' +
          '<input type="checkbox" class="custom-control-input" id="suAgree">' +
          '<label class="custom-control-label text-sm" for="suAgree">I am a CSPC student or adviser and the ' +
            'details above are correct. I understand the account will be usable only after SASO approves it.</label>' +
          '<div class="invalid-feedback" data-error-for="suAgree"></div>' +
        '</div>' +
      '</div>' +
      '<div class="alert alert-danger text-sm py-2 d-none" id="formError"></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="btnSubmit">' +
        '<i class="fa-solid fa-paper-plane mr-1"></i>Send sign-up to SASO</button>';

    document.getElementById('btnSubmit').addEventListener('click', submit);
    F.bindLiveClear(document.getElementById('oaForm'));
  }

  function submit() {
    var root = document.getElementById('oaForm');
    function v(id) { return String(root.querySelector('#' + id).value || '').trim(); }
    var choice = root.querySelector('#suProgram').value;
    var program = F.otherValue(root, 'suProgram');
    var form = {
      name: v('suName'), program: program || null, college: F.officerCollege(program, '') || null,
      email: v('suEmail'), contact: v('suContact'), username: v('suUsername'),
      password: root.querySelector('#suPassword').value, password2: root.querySelector('#suPassword2').value
    };
    var e = {};
    if (!form.name) { e.suName = 'Enter your full name.'; }
    if (!choice) { e.suProgram = 'Choose your program, or None if you are an adviser.'; }
    else if (choice === F.OTHER && !program) { e.suProgramOther = 'Type the full name of the program.'; }
    if (!form.email) { e.suEmail = 'Enter an email address.'; }
    else if (!EMAIL_RE.test(form.email)) { e.suEmail = 'Enter a valid email address.'; }
    if (!form.username) { e.suUsername = 'Choose a username.'; }
    else if (!USERNAME_RE.test(form.username)) { e.suUsername = 'Use 3 to 20 letters, numbers, dot, dash or underscore.'; }
    else if (M.usernameTaken(form.username)) { e.suUsername = 'This username is already taken.'; }
    if (!form.password || form.password.length < 6) { e.suPassword = 'Use at least 6 characters.'; }
    if (form.password2 !== form.password) { e.suPassword2 = 'Passwords do not match.'; }
    if (!root.querySelector('#suAgree').checked) { e.suAgree = 'Please confirm the declaration.'; }

    var errorBox = document.getElementById('formError');
    errorBox.classList.add('d-none');
    if (!F.showErrors(root, e)) {
      errorBox.textContent = 'Please correct the highlighted fields.';
      errorBox.classList.remove('d-none');
      return;
    }
    var req = SASO.events.submitSignup(form);
    if (!req) {
      errorBox.textContent = 'That username was just taken. Please choose another.';
      errorBox.classList.remove('d-none');
      return;
    }
    renderDone(req);
  }

  function renderDone(req) {
    card.innerHTML =
      '<div class="request-done">' +
        '<i class="fa-regular fa-circle-check request-done-icon"></i>' +
        '<h5>Sign-up sent to SASO</h5>' +
        '<p class="text-muted text-sm mb-3">Keep your reference number. You can check the status below at any time.</p>' +
        '<div class="request-ref">' + esc(req.ref) + '</div>' +
        '<table class="table table-sm detail-table text-sm text-left mt-3 mb-3"><tbody>' +
          '<tr><th>Name</th><td>' + esc(req.name) + '</td></tr>' +
          '<tr><th>Program</th><td>' + esc(req.program || 'None (adviser or faculty member)') + '</td></tr>' +
          '<tr><th>Username</th><td><code>' + esc(req.username) + '</code></td></tr>' +
          '<tr><th>Status</th><td>' + M.badge(req.status) + '</td></tr>' +
        '</tbody></table>' +
        '<p class="text-sm mb-3"><strong>What happens next:</strong> once SASO approves, sign in with the ' +
          'username above and join your organizations from My Organizations.</p>' +
        '<a class="btn btn-primary btn-block" href="index.html">Back to sign in</a>' +
      '</div>';
    document.getElementById('statusRef').value = req.ref;
  }

  function checkStatus() {
    var ref = document.getElementById('statusRef').value.trim();
    var out = document.getElementById('statusResult');
    if (!ref) { out.innerHTML = ''; return; }
    var req = M.memberRequests().filter(function (r) {
      return r.kind === 'SIGNUP' && r.ref.toLowerCase() === ref.toLowerCase();
    })[0];
    if (!req) {
      out.innerHTML = '<div class="text-sm text-danger">No sign-up found with that reference number.</div>';
      return;
    }
    var line = req.status === C.ACCOUNT_REQUEST.PENDING
      ? 'Submitted ' + M.formatDate(req.submittedAt) + '. SASO has not decided yet.'
      : req.status === C.ACCOUNT_REQUEST.APPROVED
        ? 'Approved ' + M.formatDate(req.reviewedAt) + '. You can now <a href="index.html">sign in</a> as <code>' +
          esc(req.username) + '</code>.'
        : 'Declined ' + M.formatDate(req.reviewedAt) + (req.remarks ? ': ' + esc(req.remarks) : '.') +
          ' You may sign up again.';
    out.innerHTML = '<div class="text-sm"><strong>' + esc(req.ref) + '</strong> · ' + esc(req.name) + ' ' +
      M.badge(req.status) + '<div class="mt-1">' + line + '</div></div>';
  }

  document.getElementById('btnStatus').addEventListener('click', checkStatus);
  document.getElementById('statusRef').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { checkStatus(); }
  });

  renderForm();
})();
