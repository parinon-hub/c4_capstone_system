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

  /* ---- demo account chips ---------------------------------------------- */

  var chips = SASO.model.db().users.map(function (u) {
    var org = u.organizationId ? SASO.model.orgById(u.organizationId) : null;
    var caption = org ? org.acronym : 'SASO';
    return '<button type="button" class="account-chip" data-user="' + u.username +
      '" data-pass="' + u.password + '">' +
      '<code>' + u.username + '</code> · ' + caption + '</button>';
  }).join('');

  document.getElementById('accountChips').innerHTML = chips;

  document.getElementById('accountChips').addEventListener('click', function (e) {
    var chip = e.target.closest('.account-chip');
    if (!chip) { return; }
    usernameEl.value = chip.getAttribute('data-user');
    passwordEl.value = chip.getAttribute('data-pass');
    clearErrors();
    passwordEl.focus();
  });

  /* ---- validation and submit -------------------------------------------- */

  function clearErrors() {
    usernameEl.classList.remove('is-invalid');
    passwordEl.classList.remove('is-invalid');
    errorEl.classList.add('d-none');
  }

  function showError(message) {
    errorEl.textContent = message;
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
      showError(result.message);
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
