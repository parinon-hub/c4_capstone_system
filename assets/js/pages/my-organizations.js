/* =========================================================================
   my-organizations.js  -  My Organizations, in the organization portal.

   A student can belong to more than one organization, and an adviser can
   advise more than one. This page lists every organization the signed-in
   person belongs to, with their position in it, its standing, its activities
   this academic year and its officers and members. It also asks SASO to add
   the person to another organization ("Join an organization"). Accounts are
   added, changed and removed by SASO, not by the president or adviser.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  function esc(v) { return M.escapeHtml(v); }

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'my-organizations',
    title: 'My Organizations'
  });
  if (!session) { return; }

  var me = M.userById(session.userId);
  var orgs = [];
  var ay = M.currentAY();

  function stat(v, l, i) {
    return '<div class="col-6 col-md"><div class="stat-tile">' +
      '<i class="fa-solid ' + i + ' stat-icon"></i>' +
      '<span class="stat-value">' + v + '</span>' +
      '<span class="stat-label">' + l + '</span></div></div>';
  }

  function memberRows(org) {
    var users = M.accountsForOrg(org.id);
    if (!users.length) {
      return '<p class="text-muted text-sm mb-0">No member accounts on file.</p>';
    }
    return '<div class="table-responsive"><table class="table table-sm mb-0"><thead><tr>' +
      '<th>Name</th><th>Position</th><th>Program and college</th></tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr><td class="text-sm"><span class="cell-primary">' + esc(u.name) + '</span>' +
            (u.id === session.userId ? '<span class="cell-sub">You</span>' : '') + '</td>' +
          '<td class="text-sm">' + esc(M.positionTitle(u, org.id)) + '</td>' +
          '<td class="text-sm">' + (u.program ? esc(u.program) : '<span class="text-muted">-</span>') +
            (u.college ? '<span class="cell-sub">' + esc(u.college) + '</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function orgCard(org) {
    var acts = M.activitiesInYear(ay, org.id);
    var done = acts.filter(function (a) { return a.eventStatus === C.EVENT.FINISHED; }).length;
    var members = M.accountsForOrg(org.id).length;
    return '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">' + esc(org.name) + ' <span class="text-muted font-weight-normal">(' + esc(org.acronym) + ')</span></h3>' +
        '<div class="card-tools">' + M.accreditationBadge(org) + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="review-grid mb-3">' +
          '<div><span class="cell-sub">Your position</span>' + esc(M.positionTitle(me, org.id) || '-') + '</div>' +
          '<div><span class="cell-sub">College</span>' + esc(org.college || '-') + '</div>' +
          '<div><span class="cell-sub">Adviser</span>' + esc(org.adviser || '-') + '</div>' +
          '<div><span class="cell-sub">Activities, AY ' + esc(ay) + '</span>' + acts.length +
            (acts.length ? ' (' + done + ' conducted)' : '') + '</div>' +
          '<div><span class="cell-sub">Members with accounts</span>' + members + '</div>' +
          '<div><span class="cell-sub">Valid until</span>' +
            (org.accreditationExpires ? M.formatDate(org.accreditationExpires) : '-') + '</div>' +
        '</div>' +
        '<h6 class="oa-section"><i class="fa-solid fa-users mr-2"></i>Officers and members</h6>' +
        memberRows(org) +
      '</div>' +
      '<div class="card-footer text-sm d-flex align-items-center flex-wrap">' +
        (org.id === session.organizationId
          ? '<span class="badge badge-success status-badge mr-3"><i class="fa-solid fa-check mr-1"></i>Acting for this organization</span>' +
            '<a href="' + SASO.layout.href('pages/org/activities.html') + '" class="mr-3"><i class="fa-solid fa-calendar-check mr-1"></i>Activities</a>' +
            '<a href="' + SASO.layout.href('pages/org/profile.html') + '"><i class="fa-solid fa-id-badge mr-1"></i>Organization profile</a>'
          : '<button type="button" class="btn btn-sm btn-outline-primary" data-act-for="' + org.id + '">' +
              '<i class="fa-solid fa-right-left mr-1"></i>Act for ' + esc(org.acronym) + '</button>' +
            '<span class="text-muted ml-2">Switches the dashboard, submissions and requirements to ' + esc(org.acronym) + '.</span>') +
      '</div>' +
    '</div>';
  }

  /* ---- join an organization ------------------------------------------------ */

  function requestsCard() {
    var list = M.joinRequestsOf(me.id).filter(function (r) {
      return r.status === C.ACCOUNT_REQUEST.PENDING || r.status === C.ACCOUNT_REQUEST.DECLINED;
    });
    if (!list.length) { return ''; }
    return '<div class="card"><div class="card-header"><h3 class="card-title">Your requests to join</h3></div>' +
      '<div class="card-body p-0"><table class="table table-sm mb-0"><thead><tr><th>Reference</th><th>Organization</th>' +
        '<th>Position</th><th>Status</th></tr></thead><tbody>' +
      list.map(function (r) {
        var o = M.orgById(r.organizationId);
        return '<tr><td class="text-sm"><code>' + esc(r.ref) + '</code><span class="cell-sub">' + M.formatDate(r.submittedAt) + '</span></td>' +
          '<td class="text-sm">' + esc(o ? o.acronym : '-') + '</td>' +
          '<td class="text-sm">' + esc(r.position) + '</td>' +
          '<td class="text-sm">' + M.badge(r.status) +
            (r.status === C.ACCOUNT_REQUEST.DECLINED && r.remarks ? '<span class="cell-sub">' + esc(r.remarks) + '</span>' : '') +
            (r.status === C.ACCOUNT_REQUEST.PENDING ? '<span class="cell-sub">Waiting for SASO</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function joinCard() {
    var pending = M.joinRequestsOf(me.id).filter(function (r) { return r.status === C.ACCOUNT_REQUEST.PENDING; })
      .map(function (r) { return r.organizationId; });
    var choices = M.organizations().filter(function (o) {
      return !M.isMemberOf(me, o.id) && pending.indexOf(o.id) === -1;
    }).sort(function (a, b) { return a.acronym.localeCompare(b.acronym); });
    return '<div class="card" id="joinCard"><div class="card-header"><h3 class="card-title">' +
        '<i class="fa-solid fa-user-plus mr-2 text-muted"></i>Join an organization</h3></div>' +
      '<div class="card-body">' +
        '<p class="text-sm text-muted mb-3">Pick the organization and your position in it. SASO checks the request ' +
          'and adds you; the organization then appears here and in the "Acting for" switch.</p>' +
        '<div class="form-row">' +
          '<div class="form-group col-md-6"><label for="joinOrg" class="text-sm">Organization <span class="text-danger">*</span></label>' +
            '<select class="form-control form-control-sm" id="joinOrg"><option value="">Select the organization</option>' +
              choices.map(function (o) {
                return '<option value="' + o.id + '">' + esc(o.acronym) + ' - ' + esc(o.name) + '</option>';
              }).join('') + '</select>' +
            '<div class="invalid-feedback" data-error-for="joinOrg"></div></div>' +
          '<div class="form-group col-md-6"><label for="joinPos" class="text-sm">Your position <span class="text-danger">*</span></label>' +
            '<input type="text" class="form-control form-control-sm" id="joinPos" list="joinPositions" placeholder="e.g. Member">' +
            '<datalist id="joinPositions">' + C.ORG_ACCOUNT_POSITIONS.map(function (p) {
              return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>' +
            '<div class="invalid-feedback" data-error-for="joinPos"></div>' +
            '<small class="form-text text-muted">Choose from the list or type another position.</small></div>' +
          '<div class="form-group col-12"><label for="joinNote" class="text-sm">Message to SASO (optional)</label>' +
            '<input type="text" class="form-control form-control-sm" id="joinNote" placeholder="e.g. Elected Vice President for AY ' + esc(ay) + '"></div>' +
        '</div>' +
        '<div class="text-right"><button type="button" class="btn btn-primary btn-sm" id="btnJoin">' +
          '<i class="fa-solid fa-paper-plane mr-1"></i>Send request to SASO</button></div>' +
      '</div></div>';
  }

  function render() {
    orgs = M.organizationsOfUser(me);
    var totalActs = orgs.reduce(function (n, o) { return n + M.activitiesInYear(ay, o.id).length; }, 0);
    var waiting = M.joinRequestsOf(me.id).filter(function (r) { return r.status === C.ACCOUNT_REQUEST.PENDING; }).length;

    document.getElementById('pageRoot').innerHTML =
      '<div class="row">' +
        stat(orgs.length, orgs.length === 1 ? 'Organization joined' : 'Organizations joined', 'fa-people-group') +
        stat(totalActs, 'Activities, AY ' + esc(ay), 'fa-calendar-check') +
        stat(waiting, 'Requests waiting', 'fa-hourglass-half') +
      '</div>' +
      (orgs.length ? orgs.map(orgCard).join('')
        : '<div class="card"><div class="card-body"><div class="empty-state py-3"><i class="fa-solid fa-people-group"></i>' +
            '<h6>You are not in any organization yet</h6><p>Ask to join your organization below. ' +
            'Once SASO approves, the rest of the portal opens.</p></div></div></div>') +
      requestsCard() +
      joinCard() +
      '<p class="text-muted text-sm"><i class="fa-solid fa-circle-info mr-1"></i>SASO adds, changes and removes ' +
        'members. If something here is wrong, contact SASO.</p>';

    document.querySelectorAll('[data-act-for]').forEach(function (b) {
      b.addEventListener('click', function () {
        var result = SASO.events.switchOrganization(this.getAttribute('data-act-for'));
        if (!result.ok) { SASO.layout.toast(result.message, 'danger'); return; }
        window.location.reload();
      });
    });

    var root = document.getElementById('joinCard');
    SASO.orgAccountForm.bindLiveClear(root);
    document.getElementById('btnJoin').addEventListener('click', function () {
      var orgId = document.getElementById('joinOrg').value;
      var pos = document.getElementById('joinPos').value.trim();
      var errors = {};
      if (!orgId) { errors.joinOrg = 'Choose the organization.'; }
      if (!pos) { errors.joinPos = 'Enter your position, for example Member.'; }
      if (!SASO.orgAccountForm.showErrors(root, errors)) { return; }
      var result = SASO.events.requestToJoin(orgId, pos, document.getElementById('joinNote').value.trim());
      if (!result.ok) { SASO.layout.toast(result.message, 'danger'); return; }
      SASO.layout.toast('Request ' + result.request.ref + ' sent to SASO.');
      render();
    });
  }

  render();
})();
