/* =========================================================================
   org-members.js  -  Members page of the organization portal.

   Panel RSC: personal accounts. Every member of the organization who works
   in the system is listed with their position, program and college. The
   president and the adviser add, edit and remove members here; everyone
   else sees the list. The list and the form live in core/org-members.js.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'members',
    title: 'Members',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'Members' }]
  });
  if (!session) { return; }

  var org = SASO.auth.organization();
  var canAct = M.canManageMembers(session, org.id);

  document.getElementById('pageRoot').innerHTML =
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header"><h3 class="card-title">' + M.escapeHtml(org.acronym) + ' member accounts</h3>' +
        '<div class="card-tools"><span class="card-subtitle" id="memberCount"></span></div></div>' +
      (canAct ? '' :
        '<div class="card-body border-bottom py-2 text-sm text-muted"><i class="fa-solid fa-eye mr-1"></i>' +
          'Only the president and the adviser can add or remove members. Ask them, or SASO, ' +
          'to add an account for a new member.</div>') +
      '<div class="card-body" id="membersHost"></div>' +
    '</div>';

  function tiles() {
    var users = M.accountsForOrg(org.id);
    var officers = users.filter(function (u) {
      var t = M.positionTitle(u).toLowerCase();
      return t !== 'member' && t !== 'adviser';
    }).length;
    var advisers = users.filter(function (u) { return M.positionTitle(u).toLowerCase() === 'adviser'; }).length;
    var list = [
      { v: users.length, l: 'Accounts', i: 'fa-id-card' },
      { v: officers, l: 'Officers', i: 'fa-user-tie' },
      { v: users.length - officers - advisers, l: 'Members', i: 'fa-users' },
      { v: M.hasAccountLimit() ? M.accountSlotsLeft(org.id) : 'No limit', l: 'Can still be added', i: 'fa-user-plus' }
    ];
    document.getElementById('tiles').innerHTML = list.map(function (t) {
      return '<div class="col-6 col-md"><div class="stat-tile">' +
        '<i class="fa-solid ' + t.i + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.v + '</span>' +
        '<span class="stat-label">' + t.l + '</span></div></div>';
    }).join('');
    document.getElementById('memberCount').textContent = users.length + ' account' + (users.length === 1 ? '' : 's');
  }

  SASO.orgMembers.render(document.getElementById('membersHost'), org.id, { onChange: tiles });
  tiles();
})();
