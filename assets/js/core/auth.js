/* =========================================================================
   auth.js  —  Simulated authentication.

   PROTOTYPE ONLY. Credentials are stored in plain text in the seed data and
   compared in the browser. There is no hashing, no token, no server and no
   real access control. Role separation here demonstrates the interface
   behaviour described in the study; it is not a security implementation.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.auth = (function () {
  'use strict';

  var C = SASO.config;
  var KEY = C.SESSION_KEY;

  function current() {
    try {
      var raw = window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function login(username, password) {
    var user = SASO.model.db().users.filter(function (u) {
      return u.username.toLowerCase() === String(username || '').trim().toLowerCase();
    })[0];

    if (!user) {
      return { ok: false, message: 'No account found with that username.' };
    }
    if (user.password !== password) {
      return { ok: false, message: 'Incorrect password for that account.' };
    }

    var session = {
      userId: user.id,
      username: user.username,
      name: user.name,
      position: user.position,
      role: user.role,
      organizationId: user.organizationId,
      loginAt: new Date().toISOString()
    };

    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(session));
      window.localStorage.setItem(KEY, JSON.stringify(session));
    } catch (e) { /* memory-only fallback */ }

    return { ok: true, session: session };
  }

  function logout(base) {
    try {
      window.sessionStorage.removeItem(KEY);
      window.localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
    window.location.href = (base || './') + 'index.html';
  }

  function homeFor(session, base) {
    base = base || './';
    if (!session) { return base + 'index.html'; }
    return session.role === C.ROLE.SASO
      ? base + 'pages/saso/dashboard.html'
      : base + 'pages/org/dashboard.html';
  }

  /* Sends the visitor back to the login screen if they are not signed in, or
     to their own portal if they opened a page belonging to the other role. */
  function guard(requiredRole, base) {
    var session = current();
    base = base || './';

    if (!session) {
      window.location.href = base + 'index.html';
      return null;
    }
    if (requiredRole && session.role !== requiredRole) {
      window.location.href = homeFor(session, base);
      return null;
    }
    return session;
  }

  function organization() {
    var s = current();
    return s && s.organizationId ? SASO.model.orgById(s.organizationId) : null;
  }

  return {
    current: current,
    login: login,
    logout: logout,
    guard: guard,
    homeFor: homeFor,
    organization: organization
  };
})();
