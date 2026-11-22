/* =========================================================================
   my-profile.js  -  My Profile, for every signed-in person (both portals).

   Panel RSC: personal accounts. Shows the person's own account: name,
   position, organization, program, college, email, contact number and
   username. A person edits their own email, contact number and password
   here. Name, position, program and college are changed by SASO, or by the
   president or adviser of the organization on the Members page, so an
   officer cannot quietly change the position a submission was made under.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var esc = function (v) { return M.escapeHtml(v); };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var current = SASO.auth.current();
  var isSaso = !!current && current.role === C.ROLE.SASO;

  var session = SASO.layout.init({
    role: isSaso ? C.ROLE.SASO : C.ROLE.ORG,
    page: 'my-profile',
    title: 'My Profile',
    breadcrumb: [{ label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
                 { label: 'My Profile' }]
  });
  if (!session) { return; }

  function row(label, value) {
    return '<tr><th>' + label + '</th><td>' + (value ? esc(value) : '<span class="text-muted">-</span>') + '</td></tr>';
  }

  function render() {
    var user = M.userById(session.userId);
    if (!user) {
      document.getElementById('pageRoot').innerHTML = '<div class="card"><div class="card-body"><div class="empty-state">' +
        '<i class="fa-solid fa-user-slash"></i><h6>Your account was removed</h6>' +
        '<p>Sign out and ask SASO or your president for a new account.</p></div></div></div>';
      return;
    }
    var org = user.organizationId ? M.orgById(user.organizationId) : null;
    var manager = !isSaso && M.canManageMembers(session, org && org.id);
    var who = isSaso ? 'SASO' : 'your president, adviser or SASO';

    document.getElementById('pageRoot').innerHTML =
      '<div class="row">' +
        '<div class="col-lg-7">' +
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Account</h3></div>' +
            '<div class="card-body">' +
              '<div class="profile-head d-flex align-items-center mb-3">' +
                '<div class="user-avatar user-avatar-lg mr-3">' + SASO.layout.initials(user.name) + '</div>' +
                '<div><div class="h5 mb-0">' + esc(user.name) + '</div>' +
                  '<div class="text-muted">' + esc(M.positionTitle(user)) +
                    (org ? ', ' + esc(org.acronym) : ', Student Affairs and Services Office') + '</div></div>' +
              '</div>' +
              '<table class="table table-sm detail-table mb-0"><tbody>' +
                row('Full name', user.name) +
                row('Position', M.positionTitle(user)) +
                (isSaso
                  ? row('Office', 'Student Affairs and Services Office')
                  : row('Organization', org ? org.name + ' (' + org.acronym + ')' : '') +
                    row('Program', user.program || (M.positionTitle(user) === 'Adviser' ? 'Faculty adviser' : '')) +
                    row('College', user.college)) +
                row('Username', user.username) +
                row('Email address', user.email) +
                row('Contact number', user.contact) +
                (isSaso ? '' : row('Can manage members', manager ? 'Yes (president or adviser)' : 'No')) +
              '</tbody></table>' +
            '</div>' +
            '<div class="card-footer text-muted text-sm">' +
              '<i class="fa-solid fa-circle-info mr-1"></i>Your name, position' + (isSaso ? '' : ', program and college') +
              ' are changed by ' + who + ', so the position your submissions were made under stays on record.' +
              (manager ? ' You can manage your organization’s accounts on <a href="' +
                SASO.layout.href('pages/org/members.html') + '">Members</a>.' : '') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="col-lg-5">' +
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Contact details</h3></div>' +
            '<div class="card-body" id="contactForm">' +
              '<div class="form-group"><label for="pfEmail" class="text-sm">Email address</label>' +
                '<input type="email" class="form-control form-control-sm" id="pfEmail" value="' + esc(user.email || '') + '">' +
                '<div class="invalid-feedback" data-error-for="pfEmail"></div></div>' +
              '<div class="form-group"><label for="pfContact" class="text-sm">Contact number</label>' +
                '<input type="tel" class="form-control form-control-sm" id="pfContact" value="' + esc(user.contact || '') + '">' +
                '<div class="invalid-feedback" data-error-for="pfContact"></div></div>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnSaveContact">' +
                '<i class="fa-solid fa-floppy-disk mr-1"></i>Save contact details</button>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Change password</h3></div>' +
            '<div class="card-body" id="passwordForm">' +
              '<div class="form-group"><label for="pfCurrent" class="text-sm">Current password</label>' +
                '<input type="password" class="form-control form-control-sm" id="pfCurrent" autocomplete="current-password">' +
                '<div class="invalid-feedback" data-error-for="pfCurrent"></div></div>' +
              '<div class="form-group"><label for="pfNew" class="text-sm">New password</label>' +
                '<input type="password" class="form-control form-control-sm" id="pfNew" autocomplete="new-password" placeholder="At least 6 characters">' +
                '<div class="invalid-feedback" data-error-for="pfNew"></div></div>' +
              '<div class="form-group"><label for="pfNew2" class="text-sm">Confirm new password</label>' +
                '<input type="password" class="form-control form-control-sm" id="pfNew2" autocomplete="new-password">' +
                '<div class="invalid-feedback" data-error-for="pfNew2"></div></div>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnSavePassword">' +
                '<i class="fa-solid fa-key mr-1"></i>Change password</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    bind(user);
  }

  function showErrors(root, errors) {
    root.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    root.querySelectorAll('[data-error-for]').forEach(function (el) { el.textContent = ''; });
    var ok = true;
    Object.keys(errors).forEach(function (id) {
      var el = root.querySelector('#' + id);
      var msg = root.querySelector('[data-error-for="' + id + '"]');
      if (el) { el.classList.add('is-invalid'); }
      if (msg) { msg.textContent = errors[id]; }
      ok = false;
    });
    return ok;
  }

  function bind(user) {
    document.getElementById('btnSaveContact').addEventListener('click', function () {
      var root = document.getElementById('contactForm');
      var email = document.getElementById('pfEmail').value.trim();
      var contact = document.getElementById('pfContact').value.trim();
      var e = {};
      if (email && !EMAIL_RE.test(email)) { e.pfEmail = 'Enter a valid email address.'; }
      if (contact && !/^[0-9+()\-.\s]{7,}$/.test(contact) && !/loc/i.test(contact)) { e.pfContact = 'Enter a valid phone number.'; }
      if (!showErrors(root, e)) { return; }
      var result = SASO.events.updateOwnProfile({ email: email, contact: contact });
      if (!result.ok) { SASO.layout.toast(result.message, 'danger'); return; }
      SASO.layout.toast('Contact details saved.');
      render();
    });

    document.getElementById('btnSavePassword').addEventListener('click', function () {
      var root = document.getElementById('passwordForm');
      var cur = document.getElementById('pfCurrent').value;
      var p1 = document.getElementById('pfNew').value;
      var p2 = document.getElementById('pfNew2').value;
      var e = {};
      if (!cur) { e.pfCurrent = 'Enter your current password.'; }
      if (!p1 || p1.length < 6) { e.pfNew = 'Use at least 6 characters.'; }
      if (p2 !== p1) { e.pfNew2 = 'Passwords do not match.'; }
      if (!showErrors(root, e)) { return; }
      var result = SASO.events.updateOwnProfile({ email: user.email, contact: user.contact,
        currentPassword: cur, newPassword: p1 });
      if (!result.ok) {
        var err = {}; err[result.field || 'pfCurrent'] = result.message;
        showErrors(root, err);
        return;
      }
      SASO.layout.toast('Password changed. Use the new one the next time you sign in.');
      render();
    });
  }

  render();
})();
