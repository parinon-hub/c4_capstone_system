/* =========================================================================
   request-account.js  —  The public "Request an account" page.

   There is no open sign-up. A newly recognized organization fills this in;
   the request lands with SASO (Head, Administrative Aide, Coordinator), and
   the account can be used only after SASO approves it. Until then, signing
   in with the requested username says the request is still pending.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var F = SASO.orgAccountForm;

  /* Already signed in? This page is for organizations without an account. */
  var existing = SASO.auth.current();
  if (existing) {
    window.location.replace(SASO.auth.homeFor(existing, './'));
    return;
  }

  var card = document.getElementById('requestCard');

  function renderForm() {
    card.innerHTML =
      '<div class="callout callout-info text-sm py-2 mb-3">' +
        '<strong>How it works.</strong> Fill in your organization’s details and attach proof of ' +
        'recognition. SASO reviews the request; once it is approved you can sign in with the ' +
        'username and password you choose here.' +
      '</div>' +
      '<div id="oaForm">' + F.html('request') + '</div>' +
      '<div class="alert alert-danger text-sm py-2 d-none" id="formError"></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="btnSubmit">' +
        '<i class="fa-solid fa-paper-plane mr-1"></i>Submit request to SASO</button>';

    document.getElementById('btnSubmit').addEventListener('click', submit);
    F.bindLiveClear(document.getElementById('oaForm'));
  }

  function submit() {
    var root = document.getElementById('oaForm');
    var v = F.read(root, 'request');
    var errorBox = document.getElementById('formError');
    errorBox.classList.add('d-none');

    if (!F.showErrors(root, F.validate(v, 'request'))) {
      errorBox.textContent = 'Please correct the highlighted fields.';
      errorBox.classList.remove('d-none');
      return;
    }

    var req = SASO.events.submitAccountRequest(v);
    if (!req) {
      errorBox.textContent = 'The username or acronym was just taken. Please choose another.';
      errorBox.classList.remove('d-none');
      return;
    }
    renderDone(req);
  }

  function renderDone(req) {
    card.innerHTML =
      '<div class="request-done">' +
        '<i class="fa-regular fa-circle-check request-done-icon"></i>' +
        '<h5>Request sent to SASO</h5>' +
        '<p class="text-muted text-sm mb-3">Keep your reference number. You can check the status ' +
          'below at any time.</p>' +
        '<div class="request-ref">' + M.escapeHtml(req.ref) + '</div>' +
        '<table class="table table-sm detail-table text-sm text-left mt-3 mb-3"><tbody>' +
          '<tr><th>Organization</th><td>' + M.escapeHtml(req.acronym) + ' — ' + M.escapeHtml(req.name) + '</td></tr>' +
          '<tr><th>Requested by</th><td>' + M.escapeHtml(req.officerName) + ', ' + M.escapeHtml(req.officerPosition) + '</td></tr>' +
          '<tr><th>Username</th><td><code>' + M.escapeHtml(req.username) + '</code></td></tr>' +
          '<tr><th>Status</th><td>' + M.badge(req.status) + '</td></tr>' +
        '</tbody></table>' +
        '<p class="text-sm mb-3"><strong>What happens next:</strong> SASO checks your organization ' +
          'against its roster of recognized organizations. Once approved, sign in with the username ' +
          'above. If you try before then, the sign-in screen will tell you the request is still pending.</p>' +
        '<a class="btn btn-primary btn-block" href="index.html">Back to sign in</a>' +
      '</div>';
    document.getElementById('statusRef').value = req.ref;
  }

  /* ---- status check ------------------------------------------------------------ */

  function checkStatus() {
    var ref = document.getElementById('statusRef').value;
    var out = document.getElementById('statusResult');
    var req = M.accountRequestByRef(ref);
    if (!ref.trim()) { out.innerHTML = ''; return; }
    if (!req) {
      out.innerHTML = '<div class="text-sm text-danger">No request found with that reference number.</div>';
      return;
    }
    var line = req.status === C.ACCOUNT_REQUEST.PENDING
      ? 'Submitted ' + M.formatDate(req.submittedAt) + '. SASO has not decided yet.'
      : req.status === C.ACCOUNT_REQUEST.APPROVED
        ? 'Approved ' + M.formatDate(req.reviewedAt) + ' by ' + M.escapeHtml(req.reviewedBy) +
          '. You can now <a href="index.html">sign in</a> as <code>' + M.escapeHtml(req.username) + '</code>.'
        : 'Declined ' + M.formatDate(req.reviewedAt) + (req.remarks ? ': ' + M.escapeHtml(req.remarks) : '.') +
          ' You may submit a new request.';
    out.innerHTML = '<div class="text-sm"><strong>' + M.escapeHtml(req.ref) + '</strong> · ' +
      M.escapeHtml(req.acronym) + ' ' +
      (req.status === C.ACCOUNT_REQUEST.APPROVED ? M.badge('APPROVED', 'Approved') : M.badge(req.status)) +
      '<div class="mt-1">' + line + '</div></div>';
  }

  document.getElementById('btnStatus').addEventListener('click', checkStatus);
  document.getElementById('statusRef').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { checkStatus(); }
  });

  renderForm();
})();
