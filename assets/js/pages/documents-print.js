/* =========================================================================
   documents-print.js  —  Printable institutional documents.

   Three documents are generated from the activity record:
     · Activity Proposal
     · Permission to Conduct (R5)
     · Terminal Report cover sheet

   IMPORTANT. The layouts below are the researchers' reconstructions from the
   documents SASO described. They are NOT reproductions of the official CSPC
   forms, and every generated sheet says so in print. Before final defense the
   blank R5 should be obtained from SASO and the layout matched to it.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var role = SASO.auth.current() ? SASO.auth.current().role : null;
  var isSaso = role === C.ROLE.SASO;

  var params = new URLSearchParams(window.location.search);
  var activityId = params.get('id');
  var docType = params.get('doc') || 'proposal';

  var session = SASO.layout.init({
    role: role,
    page: 'activities',
    title: 'Printable Documents',
    breadcrumb: [
      { label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
      { label: 'Documents' }
    ]
  });
  if (!session) { return; }

  var activity = activityId ? M.activityById(activityId) : null;

  if (!activity || (!isSaso && activity.organizationId !== session.organizationId)) {
    document.getElementById('pageRoot').innerHTML =
      '<div class="card"><div class="card-body"><div class="empty-state">' +
        '<i class="fa-regular fa-circle-question"></i><h6>Activity not found</h6>' +
        '<p>It may have been removed, or it belongs to another organization.</p>' +
      '</div></div></div>';
    return;
  }

  var org = M.orgById(activity.organizationId);
  var head = M.db().users.filter(function (u) { return u.username === 'admin'; })[0];
  var officer = M.db().users.filter(function (u) {
    return u.organizationId === org.id;
  })[0];

  /* ---- shared pieces --------------------------------------------------------- */

  function letterhead(title, subtitle) {
    return '<div class="report-letterhead">' +
        '<img src="../../assets/img/saso-logo-print.jpg" class="letterhead-seal" alt="">' +
        '<div class="report-institution">Republic of the Philippines</div>' +
        '<div class="report-college">CAMARINES SUR POLYTECHNIC COLLEGES</div>' +
        '<div class="report-institution">Nabua, Camarines Sur</div>' +
        '<div class="report-office">STUDENT AFFAIRS AND SERVICES OFFICE</div>' +
      '</div>' +
      '<h2 class="report-title">' + title + '</h2>' +
      (subtitle ? '<div class="report-period">' + subtitle + '</div>' : '');
  }

  function field(label, value) {
    return '<tr><th>' + label + '</th><td>' + (value || '&nbsp;') + '</td></tr>';
  }

  function signature(caption, name, role2, dated) {
    return '<div class="sig-block">' +
      '<span class="sig-caption">' + caption + '</span>' +
      '<div class="sig-name">' + M.escapeHtml(name || '') + '</div>' +
      '<div class="sig-role">' + M.escapeHtml(role2 || '') + '</div>' +
      (dated ? '<div class="sig-date">Date: ' + dated + '</div>'
             : '<div class="sig-date">Date: ______________</div>') +
    '</div>';
  }

  function stamp() {
    return '<div class="report-stamp">PROTOTYPE: NOT AN OFFICIAL INSTITUTIONAL DOCUMENT · ' +
      'Layout is a reconstruction, not the official CSPC form · Printed ' +
      M.formatDate(new Date()) + '</div>';
  }

  function leg(office) {
    return M.routeFor(activity.id).filter(function (r) { return r.office === office; })[0] || null;
  }

  function legDate(office) {
    var l = leg(office);
    return l && l.decidedAt ? M.formatDate(l.decidedAt) : null;
  }

  /* ---- 1. Activity Proposal ----------------------------------------------------- */

  function proposalDoc() {
    var objectives = (activity.objectives || []).length
      ? '<ol class="doc-list">' + activity.objectives.map(function (o) {
          return '<li>' + M.escapeHtml(o) + '</li>';
        }).join('') + '</ol>'
      : '&nbsp;';

    var reqs = M.requirementsFor(activity.id, C.PHASE.PRE_APPROVAL);

    return letterhead('ACTIVITY PROPOSAL') +
      '<table class="doc-table">' +
        field('Organization', M.escapeHtml(org.name) +
          ' <span class="doc-muted">(' + M.escapeHtml(org.acronym) + ')</span>') +
        field('Accreditation', M.accreditationLabel(org)) +
        field('Adviser', M.escapeHtml(org.adviser)) +
        field('Title of Activity', '<strong>' + M.escapeHtml(activity.title) + '</strong>') +
        field('Category', M.escapeHtml(activity.category)) +
        field('Date of Activity', M.formatDateRange(activity.dateStart, activity.dateEnd)) +
        field('Time', (activity.timeStart || '') + ' to ' + (activity.timeEnd || '')) +
        field('Venue', M.escapeHtml(activity.venue) +
          ' <span class="doc-muted">(' + M.label(activity.venueType) + ')</span>') +
        field('Expected Participants', (activity.expectedParticipants || '') +
          (activity.participantDescription
            ? ' (' + M.escapeHtml(activity.participantDescription) + ')' : '')) +
        field('Rationale', M.escapeHtml(activity.rationale)) +
        field('Objectives', objectives) +
        field('Description', M.escapeHtml(activity.description)) +
        field('Budgetary Requirement', activity.budget ? M.escapeHtml(activity.budget) : 'None') +
        field('Source of Fund', activity.fundSource ? M.escapeHtml(activity.fundSource) : '&nbsp;') +
      '</table>' +

      '<h3 class="doc-subhead">Attached Requirements</h3>' +
      '<table class="report-table"><thead><tr><th>Document</th><th>Required</th>' +
        '<th>Status</th><th>Date Submitted</th></tr></thead><tbody>' +
        reqs.map(function (r) {
          return '<tr><td>' + M.escapeHtml(r.name) + '</td>' +
            '<td>' + (r.mandatory ? 'Yes' : 'Optional') + '</td>' +
            '<td>' + M.label(r.status) + '</td>' +
            '<td>' + (r.submittedAt ? M.formatDate(r.submittedAt) : '') + '</td></tr>';
        }).join('') +
      '</tbody></table>' +

      '<div class="sig-grid">' +
        signature('Prepared by:', officer ? officer.name : '',
          officer ? officer.position : '', activity.submittedAt
            ? M.formatDate(activity.submittedAt) : null) +
        signature('Recommending approval:', org.adviser, 'Organization Adviser', null) +
        signature('Noted by:', head ? head.name : '', head ? head.position : '',
          legDate(C.OFFICE.SASO)) +
      '</div>' + stamp();
  }

  /* ---- 2. Permission to Conduct (R5) ---------------------------------------------
     Carries the full approval route, because that is what the form is for: it
     travels from SASO to the VPAA to the President, and each office signs it. */

  function permitDoc() {
    var offCampus = activity.venueType === C.VENUE.OFF_CAMPUS;

    return letterhead('PERMISSION TO CONDUCT', 'R5') +
      '<p class="doc-body">The undersigned respectfully requests permission for ' +
        '<strong>' + M.escapeHtml(org.name) + '</strong> to conduct the activity ' +
        'described below, in accordance with the policies of the Student Affairs and ' +
        'Services Office' + (offCampus
          ? ', together with the documentary requirements prescribed under CHED ' +
            'Memorandum Order No. 63 for off-campus activities'
          : '') + '.</p>' +

      '<table class="doc-table">' +
        field('Organization', M.escapeHtml(org.acronym) + ' (' + M.escapeHtml(org.name) + ')') +
        field('Activity', '<strong>' + M.escapeHtml(activity.title) + '</strong>') +
        field('Category', M.escapeHtml(activity.category)) +
        field('Date and Time', M.formatDateRange(activity.dateStart, activity.dateEnd) +
          ', ' + (activity.timeStart || '') + ' to ' + (activity.timeEnd || '')) +
        field('Venue', M.escapeHtml(activity.venue)) +
        field('Classification', M.label(activity.venueType)) +
        field('Participants', (activity.expectedParticipants || '') +
          (activity.participantDescription
            ? ' (' + M.escapeHtml(activity.participantDescription) + ')' : '')) +
        field('Purpose', M.escapeHtml(activity.rationale)) +
        field('Fund Source', activity.fundSource
          ? M.escapeHtml(activity.fundSource) +
            (activity.budget ? ' (' + M.escapeHtml(activity.budget) + ')' : '')
          : 'None') +
      '</table>' +

      (offCampus
        ? '<p class="doc-note"><strong>Off-campus activity.</strong> The documentary ' +
          'requirements under CMO 63 form part of this request.</p>'
        : '') +

      '<div class="sig-grid sig-grid-2">' +
        signature('Requested by:', officer ? officer.name : '',
          officer ? officer.position : '',
          activity.submittedAt ? M.formatDate(activity.submittedAt) : null) +
        signature('Recommending approval:', org.adviser, 'Organization Adviser', null) +
      '</div>' +

      '<h3 class="doc-subhead">Approval Route</h3>' +
      '<div class="sig-grid sig-grid-3">' +
        signature('Endorsed by:', head ? head.name : '', head ? head.position : '',
          legDate(C.OFFICE.SASO)) +
        signature('Approved by:', '', 'Vice-President for Academic Affairs',
          legDate(C.OFFICE.VPAA)) +
        signature('Approved by:', '', 'Office of the President',
          legDate(C.OFFICE.PRESIDENT)) +
      '</div>' +

      '<div class="doc-status-line">Current status: <strong>' +
        M.label(activity.proposalStatus) + '</strong>' +
        (M.isInApprovalRoute(activity)
          ? ', with the ' + C.LABEL[M.currentOffice(activity.id).office] +
            ' for ' + M.daysWithCurrentOffice(activity.id) + ' day(s)'
          : '') + '</div>' +
      stamp();
  }

  /* ---- 3. Terminal Report cover sheet ---------------------------------------------- */

  function terminalDoc() {
    var o = activity.outcome || {};
    var reqs = M.requirementsFor(activity.id, C.PHASE.POST_ACTIVITY);
    var status = M.terminalStatus(activity);

    return letterhead('TERMINAL REPORT', 'Post-Activity Accomplishment') +
      '<table class="doc-table">' +
        field('Organization', M.escapeHtml(org.acronym) + ' (' + M.escapeHtml(org.name) + ')') +
        field('Activity', '<strong>' + M.escapeHtml(activity.title) + '</strong>') +
        field('Category', M.escapeHtml(activity.category)) +
        field('Date Conducted', M.formatDateRange(activity.dateStart, activity.dateEnd)) +
        field('Venue', M.escapeHtml(activity.venue) +
          ' <span class="doc-muted">(' + M.label(activity.venueType) + ')</span>') +
        field('Expected Participants', activity.expectedParticipants || '') +
        field('Actual Participants', o.actualParticipants
          ? '<strong>' + o.actualParticipants + '</strong>' : 'Not yet reported') +
        field('Reporting Deadline', activity.reportDeadline
          ? M.formatDate(activity.reportDeadline) : '&nbsp;') +
        field('Summary of Accomplishment', o.summary ? M.escapeHtml(o.summary) : '&nbsp;') +
        field('Issues Encountered', o.issues ? M.escapeHtml(o.issues) : 'None reported') +
      '</table>' +

      '<h3 class="doc-subhead">Documents Submitted</h3>' +
      '<table class="report-table"><thead><tr><th>Document</th><th>Required</th>' +
        '<th>Date Submitted</th><th>Status</th></tr></thead><tbody>' +
        reqs.map(function (r) {
          return '<tr><td>' + M.escapeHtml(r.name) + '</td>' +
            '<td>' + (r.mandatory ? 'Yes' : 'Optional') + '</td>' +
            '<td>' + (r.submittedAt ? M.formatDate(r.submittedAt) : '') + '</td>' +
            '<td>' + M.label(r.status) + '</td></tr>';
        }).join('') +
      '</tbody></table>' +

      '<div class="doc-status-line">Report status: <strong>' + M.label(status) + '</strong>' +
        (status === C.TERMINAL.ACCEPTED
          ? ': this activity is recorded as completed.'
          : ': this activity remains open until all required reports are accepted.') +
      '</div>' +

      '<div class="sig-grid">' +
        signature('Submitted by:', officer ? officer.name : '',
          officer ? officer.position : '', null) +
        signature('Certified correct:', org.adviser, 'Organization Adviser', null) +
        signature('Received and accepted by:', head ? head.name : '',
          head ? head.position : '',
          status === C.TERMINAL.ACCEPTED ? M.formatDate(activity.updatedAt) : null) +
      '</div>' + stamp();
  }

  /* ---- shell ------------------------------------------------------------------------ */

  var DOCS = {
    proposal: { label: 'Activity Proposal', icon: 'fa-file-lines',
                build: proposalDoc, available: true },
    permit:   { label: 'Permission to Conduct (R5)', icon: 'fa-stamp',
                build: permitDoc, available: true },
    terminal: { label: 'Terminal Report', icon: 'fa-file-circle-check',
                build: terminalDoc,
                available: activity.eventStatus === C.EVENT.FINISHED,
                unavailableNote: 'Available once the activity has been marked finished.' }
  };

  if (!DOCS[docType] || !DOCS[docType].available) { docType = 'proposal'; }

  function render() {
    var def = DOCS[docType];

    document.getElementById('pageRoot').innerHTML =
      '<div class="card">' +
        '<div class="card-header no-print">' +
          '<h3 class="card-title">' + M.escapeHtml(activity.title) + '</h3>' +
          '<div class="card-tools">' +
            '<a class="btn btn-sm btn-outline-primary mr-1" href="' +
              (isSaso ? '../saso/' : '../org/') + 'activity-details.html?id=' + activity.id +
              '">Back to activity</a>' +
            '<button type="button" class="btn btn-sm btn-primary" id="btnPrint">' +
              '<i class="fa-solid fa-print mr-1"></i>Print</button>' +
          '</div>' +
        '</div>' +

        '<div class="card-body border-bottom py-2 no-print">' +
          '<div class="btn-group btn-group-sm" id="docTabs">' +
            Object.keys(DOCS).map(function (k) {
              var d = DOCS[k];
              return '<button type="button" class="btn btn-outline-primary' +
                (docType === k ? ' active' : '') + '"' +
                (d.available ? '' : ' disabled title="' + d.unavailableNote + '"') +
                ' data-doc="' + k + '">' +
                '<i class="fa-solid ' + d.icon + ' mr-1"></i>' + d.label + '</button>';
            }).join('') +
          '</div>' +
          '<span class="text-muted text-sm ml-3">' +
            'Layouts are reconstructions from the documents SASO described, not the ' +
            'official CSPC forms.</span>' +
        '</div>' +

        '<div class="card-body">' +
          '<div class="report-doc doc-sheet">' + def.build() + '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('btnPrint').addEventListener('click', function () {
      window.print();
    });

    document.querySelectorAll('#docTabs button[data-doc]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (this.disabled) { return; }
        docType = this.getAttribute('data-doc');
        window.history.replaceState({}, '',
          'print.html?id=' + activity.id + '&doc=' + docType);
        render();
      });
    });
  }

  render();
})();
