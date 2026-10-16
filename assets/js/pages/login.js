/* =========================================================================
   login.js  —  Login screen behaviour.
   ========================================================================= */

(function () {
  'use strict';

  var base = './';

  /* Already signed in? Go straight to the right portal. */
  var existing = SASO.auth.current();
  if (existing) {
    window.location.replace(SASO.auth.homeFor(existing, base));
    return;
  }

  var usernameEl = document.getElementById('username');
  var passwordEl = document.getElementById('password');
  var errorEl = document.getElementById('loginError');

  /* ---- validation and submit -------------------------------------------- */

  function clearErrors() {
    usernameEl.classList.remove('is-invalid');
    passwordEl.classList.remove('is-invalid');
    errorEl.classList.add('d-none');
  }

  /* A pending account request is not an error — show it as a notice. */
  function showError(message, isNotice) {
    errorEl.textContent = message;
    errorEl.classList.toggle('alert-danger', !isNotice);
    errorEl.classList.toggle('alert-warning', !!isNotice);
    errorEl.classList.remove('d-none');
  }

  function signIn() {
    clearErrors();
    var ok = true;

    if (!usernameEl.value.trim()) { usernameEl.classList.add('is-invalid'); ok = false; }
    if (!passwordEl.value) { passwordEl.classList.add('is-invalid'); ok = false; }
    if (!ok) { return; }

    var result = SASO.auth.login(usernameEl.value, passwordEl.value);
    if (!result.ok) {
      showError(result.message, result.pending);
      passwordEl.value = '';
      passwordEl.focus();
      return;
    }

    window.location.href = SASO.auth.homeFor(result.session, base);
  }

  document.getElementById('btnSignIn').addEventListener('click', signIn);

  [usernameEl, passwordEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { signIn(); }
    });
    el.addEventListener('input', clearErrors);
  });

  usernameEl.focus();
})();
