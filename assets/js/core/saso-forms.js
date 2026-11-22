/* =========================================================================
   saso-forms.js  -  SASO's official forms, filled in from the proposal.

   Layouts follow the blank forms SASO supplied:
     ptc-on     CSPC-F-SASO-05  Permission to Conduct Campus Activity (Rev. 3)
     ptc-off    CSPC-F-SASO-07  Permission to Conduct Off-Campus Activity (Rev. 3)
     checklist  CSPC-F-SASO-59  Requirements for the Conduct of On-Campus
                                Activities (Rev. 0)

   Everything the organization already typed into the proposal is written on
   the form, so the officer downloads a filled PTC instead of copying the
   proposal by hand. Signatures are left for the offices to sign.

     SASO.sasoForms.formsFor(activity)        keys that apply to the activity
     SASO.sasoForms.build(key, activity)      the form as HTML
     SASO.sasoForms.downloadPdf(key, activity) saves the form as a PDF
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.sasoForms = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  function esc(v) { return M.escapeHtml(v == null ? '' : String(v)); }

  var FORMS = {
    'ptc-on':  { code: 'CSPC-F-SASO-05', label: 'Permission to Conduct (on campus)', file: 'PTC_On-Campus' },
    'ptc-off': { code: 'CSPC-F-SASO-07', label: 'Permission to Conduct (off campus)', file: 'PTC_Off-Campus' },
    checklist: { code: 'CSPC-F-SASO-59', label: 'Requirements checklist (on campus)', file: 'Requirements_Checklist' },
    slip:      { code: 'CSPC-F-SASO-14', label: 'Responsibility Acceptance Slip', file: 'Responsibility_Acceptance_Slip' },
    cmo63:     { code: 'CMO No. 63, s. 2017', label: 'CMO 63 documents (off campus)', file: 'CMO63_Documents' }
  };

  function formsFor(activity) {
    return activity && activity.venueType === C.VENUE.OFF_CAMPUS
      ? ['ptc-off', 'slip', 'cmo63'] : ['ptc-on', 'slip', 'checklist'];
  }
  function ptcKey(activity) { return formsFor(activity)[0]; }

  /* ---- small pieces ----------------------------------------------------------- */

  function box(on) { return '<span class="sf-box' + (on ? ' is-on' : '') + '">' + (on ? '&#10004;' : '') + '</span>'; }

  function time12(t) {
    if (!t) { return ''; }
    var p = t.split(':'), h = Number(p[0]), m = p[1] || '00';
    return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function seal() {
    return SASO.CSPC_SEAL ? '<img class="sf-seal" src="' + SASO.CSPC_SEAL + '" alt="">' : '';
  }

  function header(code) {
    return '<div class="sf-head">' + seal() +
        '<div class="sf-inst"><div>Republic of the Philippines</div>' +
          '<div class="sf-college">CAMARINES SUR POLYTECHNIC COLLEGES</div>' +
          '<div>Nabua, Camarines Sur</div></div>' +
      '</div>' +
      '<div class="sf-rule"><span class="sf-code">' + code + '</span></div>';
  }

  function footer(effectivity, rev) {
    return '<div class="sf-foot"><span>Effectivity Date: <b>' + effectivity + '</b></span>' +
      '<span>' + rev + '</span><span>Page: 1 of 1</span></div>';
  }

  function reqSubmitted(activity, prefix) {
    var r = M.requirementsFor(activity.id, C.PHASE.PRE_APPROVAL).filter(function (x) {
      return x.name.indexOf(prefix) === 0;
    })[0];
    return !!r && r.status !== C.REQUIREMENT.NOT_SUBMITTED;
  }

  function leg(activity, office) {
    return M.routeFor(activity.id).filter(function (r) { return r.office === office; })[0] || null;
  }

  function responsible(activity) {
    if (activity.submittedBy && activity.submittedBy.name) {
      return { name: activity.submittedBy.name, position: activity.submittedBy.position || '' };
    }
    var me = SASO.auth.current();
    if (me && me.role === C.ROLE.ORG && me.organizationId === activity.organizationId) {
      return { name: me.name, position: M.positionTitle(me) };
    }
    return { name: '', position: '' };
  }

  function prepared(activity) {
    return M.formatDate(activity.submittedAt || new Date());
  }

  function natureBlock(activity) {
    var cur = activity.natureType === 'CURRICULAR';
    var non = activity.natureType === 'NON_CURRICULAR';
    function list(items, typeOn) {
      return items.map(function (n) {
        return '<div class="sf-check sf-italic">' + box(typeOn && activity.natureItem === n) + '<span>' + esc(n) + '</span></div>';
      }).join('');
    }
    return '<div class="sf-nature">' +
      '<div class="sf-col">' +
        '<div class="sf-check"><b>' + box(cur) + '<span>Curricular</span></b></div>' +
        list(C.ACTIVITY_NATURE.CURRICULAR, cur) +
      '</div>' +
      '<div class="sf-col">' +
        '<div class="sf-check"><b>' + box(non) + '<span>Non-Curricular</span></b></div>' +
        list(C.ACTIVITY_NATURE.NON_CURRICULAR, non) +
      '</div>' +
    '</div>';
  }

  function cell(label, value, cls) {
    return '<td class="' + (cls || '') + '"><div class="sf-label">' + label + '</div>' +
      '<div class="sf-value">' + (value || '&nbsp;') + '</div></td>';
  }

  function objectives(activity) {
    var list = (activity.objectives || []).filter(Boolean);
    if (!list.length) { return ''; }
    return '<ol class="sf-ol">' + list.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ol>';
  }

  function sigLine(name, caption, designation) {
    return '<div class="sf-sig">' +
      '<div class="sf-sig-row"><span class="sf-sig-name">' + esc(name) + '</span>' +
        (designation !== undefined ? '<span class="sf-sig-des">' + esc(designation) + '</span>' : '') + '</div>' +
      '<div class="sf-sig-cap"><span>' + caption + '</span>' +
        (designation !== undefined ? '<span>Designation</span>' : '') + '</div>' +
    '</div>';
  }

  function notedLine(name, caption) {
    return '<div class="sf-noted"><div class="sf-noted-name">' + esc(name) + '</div><div class="sf-noted-cap">' + caption + '</div></div>';
  }

  function officeBlock(heading, signer, legRow, decisionBoxes) {
    var d = legRow && legRow.decision;
    return '<div class="sf-office">' +
      (heading ? '<div class="sf-label">' + heading + '</div>' : '') +
      (decisionBoxes
        ? '<div class="sf-decide">' + box(d === 'Approved') + ' APPROVED<br>' +
            box(d === 'Rejected' || d === 'Returned') + ' DISAPPROVED</div>' : '') +
      '<div class="sf-signer"><div class="sf-signer-name">' + esc(signer.name) + '</div>' +
        '<div>' + esc(signer.title) + '</div></div>' +
      '<div class="sf-label">Remarks:</div>' +
      '<div class="sf-remarks">' + esc(legRow && legRow.remarks ? legRow.remarks : '') + '</div>' +
    '</div>';
  }

  var CERTIFY = 'I HEREBY CERTIFY THAT THIS ACTIVITY is necessary to provide students new avenue of ' +
    'knowledge and experiences. Report of this activity and liquidation of expenses (if any) shall be ' +
    'made available to students after the conduct of the activity.';

  function copyNote() {
    return '<div class="sf-copynote"><span>Note:</span><div>White &nbsp;- Org. copy<br>Blue &nbsp;&nbsp;- VPAA/President’s Copy<br>' +
      'Yellow - SASO Copy</div></div>' +
      '<div class="sf-getpermit">Please get your approved permit to the Student Affairs and Services Office</div>';
  }

  /* ---- CSPC-F-SASO-05 / -07 --------------------------------------------------- */

  function ptc(activity, off) {
    var org = M.orgById(activity.organizationId) || {};
    var sig = M.signatories();
    var who = responsible(activity);
    var saso = leg(activity, C.OFFICE.SASO);
    var vpaa = leg(activity, C.OFFICE.VPAA);
    var pres = leg(activity, C.OFFICE.PRESIDENT);
    var participants = (activity.expectedParticipants || '') +
      (activity.participantDescription ? '<div class="sf-small">' + esc(activity.participantDescription) + '</div>' : '');
    var sponsor = esc(org.name || '') + (org.acronym ? ' (' + esc(org.acronym) + ')' : '');
    var when = esc(M.activityDateText(activity));
    var time = activity.timeStart ? time12(activity.timeStart) + (activity.timeEnd ? ' to ' + time12(activity.timeEnd) : '') : '';
    var college = activity.transportType === 'COLLEGE', priv = activity.transportType === 'PRIVATE';
    var rate = esc(activity.transportRate || '');

    var left = '<td class="sf-left">' +
        '<p class="sf-certify">' + CERTIFY + '</p>' +
        sigLine(who.name, 'Person Responsible', who.position) +
        sigLine(activity.coResponsibleName || '', 'Co-Responsible', activity.coResponsiblePosition || '') +
        '<div class="sf-label sf-mt">Noted:</div>' +
        notedLine('', 'SSC Representative (Academic Org.)') +
        notedLine(org.adviser || '', 'Adviser/s') +
        notedLine('', 'Dean') +
      '</td>';

    var right = off
      ? '<td class="sf-right">' +
          officeBlock('RECOMMENDING APPROVAL:', sig.sasDirector, saso, false) +
          '<div class="sf-split"></div>' +
          officeBlock('Recommending Approval:', sig.vpaa, vpaa, false) +
          officeBlock('', sig.president, pres, true) +
        '</td>'
      : '<td class="sf-right">' +
          officeBlock('RECOMMENDING APPROVAL:', sig.sasDirector, saso, false) +
          '<div class="sf-split"></div>' +
          officeBlock('', sig.vpaa, vpaa, true) +
        '</td>';

    return '<div class="sf-page' + (off ? ' sf-off' : '') + '">' + header(off ? 'CSPC-F-SASO-07' : 'CSPC-F-SASO-05') +
      '<div class="sf-title">' + (off ? 'PERMISSION TO CONDUCT OFF-CAMPUS ACTIVITY' : 'PERMISSION TO CONDUCT CAMPUS ACTIVITY') + '</div>' +
      '<div class="sf-prepared">Date Prepared: <span class="sf-fill">' + prepared(activity) + '</span></div>' +
      (off ? '<div class="sf-nature-title">Nature of the Activity: (Please check)</div>' : '') +
      natureBlock(activity) +
      '<table class="sf-grid">' +
        '<tr>' + cell('Title of the Activity' + (off ? ':' : ''), '<b>' + esc(activity.title) + '</b>', 'sf-wide" colspan="2') + '</tr>' +
        '<tr>' + cell('Venue:', esc(activity.venue)) +
          '<td><div class="sf-label">Date' + (off ? '' : ' of Activity') + ': <span class="sf-value-inline">' + when + '</span></div>' +
            '<div class="sf-label">Time: <span class="sf-value-inline">' + esc(time) + '</span></div></td></tr>' +
        '<tr>' + cell('No. of Participants:', participants) + cell('Sponsoring Organization/Class:', sponsor) + '</tr>' +
        (off
          ? '<tr>' + cell('Source of Funds:', esc([activity.fundSource, activity.budget ? 'PHP ' + activity.budget : ''].filter(Boolean).join(', '))) +
              cell('Instructor/s joining the Convention:', esc(activity.instructors || '')) + '</tr>'
          : '') +
        '<tr>' + cell('Objectives of the ' + (off ? 'Convention' : 'Activity') + ':', objectives(activity), 'sf-wide" colspan="2') + '</tr>' +
        (off
          ? '<tr><td colspan="2"><div class="sf-label">Transportation to be used (Check):</div>' +
              '<div class="sf-check">' + box(college) + '<span>College Vehicle charged at P<span class="sf-fill sf-fill-sm">' +
                (college ? rate : '') + '</span>rate/day.</span></div>' +
              '<div class="sf-check">' + box(priv) + '<span>Private Vehicle P<span class="sf-fill sf-fill-sm">' +
                (priv ? rate : '') + '</span>per student.</span></div></td></tr>'
          : '') +
        '<tr>' + left + right + '</tr>' +
      '</table>' +
      '<div class="sf-attach"><div class="sf-label">Attachments:</div>' +
        '<div class="sf-check">' + box(reqSubmitted(activity, 'List of Participants')) + '<span>List of Students</span></div>' +
        '<div class="sf-check">' + box(reqSubmitted(activity, 'Activity Proposal') || reqSubmitted(activity, 'Budget Proposal')) +
          '<span>Activity/Budget Proposal</span></div>' +
        (off ? '<div class="sf-check">' + box(reqSubmitted(activity, 'CMO 63')) + '<span>Accomplished CMO No. 63</span></div>' : '') +
      '</div>' +
      copyNote() +
      footer('January 2021', 'Rev. 3') +
    '</div>';
  }

  /* ---- CSPC-F-SASO-59 ------------------------------------------------------------ */

  function checklist(activity) {
    var org = M.orgById(activity.organizationId) || {};
    var saso = leg(activity, C.OFFICE.SASO);
    var listed = ['Responsibility Acceptance Slip', 'Permission to Conduct', 'Activity Proposal', 'Budget Proposal', 'List of Participants'];
    var items = [
      ['Responsibility Acceptance Slip', 'Responsibility Acceptance Slip'],
      ['Permission to Conduct On-Campus Activity', 'Permission to Conduct'],
      ['Activity Proposal', 'Activity Proposal'],
      ['Budget Proposal/ Source of funds', 'Budget Proposal'],
      ['List of student-participants', 'List of Participants']
    ];
    var others = M.requirementsFor(activity.id, C.PHASE.PRE_APPROVAL).filter(function (r) {
      return r.status !== C.REQUIREMENT.NOT_SUBMITTED &&
        !listed.some(function (p) { return r.name.indexOf(p) === 0; });
    }).map(function (r) { return r.name; });
    function line(label, value) {
      return '<div class="sf-line"><span>' + label + '</span><span class="sf-fill sf-grow">' + value + '</span></div>';
    }
    return '<div class="sf-page sf-page-59">' + header('CSPC-F-SASO-59') +
      '<div class="sf-office-title">STUDENT AFFAIRS AND SERVICES OFFICE</div>' +
      '<div class="sf-title sf-title-lg">REQUIREMENTS FOR THE CONDUCT OF<br>ON-CAMPUS ACTIVITIES</div>' +
      line('Name of Activity:', esc(activity.title)) +
      line('Date of Activity:', esc(M.activityDateText(activity))) +
      line('Venue:', esc(activity.venue)) +
      line('Sponsoring Organization:', esc(org.name || '') + (org.acronym ? ' (' + esc(org.acronym) + ')' : '')) +
      '<p class="sf-mt">Please attach the following duly signed documents:</p>' +
      '<ol class="sf-req">' + items.map(function (it) {
        var ok = reqSubmitted(activity, it[1]);
        return '<li><span>' + it[0] + '</span><span class="sf-fill sf-fill-md">' + (ok ? '&#10004;' : '') + '</span></li>';
      }).join('') +
        '<li><span>Others (Please specify)</span></li></ol>' +
      '<div class="sf-others">' +
        '<div class="sf-fill sf-block">' + esc(others.slice(0, 2).join(', ')) + '</div>' +
        '<div class="sf-fill sf-block">' + esc(others.slice(2).join(', ')) + '</div>' +
      '</div>' +
      '<div class="sf-checked"><div>Checked By:</div>' +
        '<div class="sf-fill sf-block sf-center">' +
          (saso && saso.decidedAt ? esc(M.formatDate(saso.decidedAt)) : '') + '</div>' +
        '<div class="sf-center">SASO Staff/Date</div></div>' +
      footer('December 2022', 'Rev. 0') +
    '</div>';
  }

  /* ---- CSPC-F-SASO-14 Responsibility Acceptance Slip -------------------------------- */

  function president(orgId) {
    return M.accountsForOrg(orgId).filter(function (u) { return /^President/i.test(M.positionTitle(u)); })[0] || null;
  }

  function slip(activity) {
    var org = M.orgById(activity.organizationId) || {};
    var who = responsible(activity);
    var pres = /^(President|Adviser)/i.test(who.position || '') ? who : president(activity.organizationId);
    var name = pres ? pres.name : '';
    var role = pres && /^Adviser/i.test(pres.position || (pres.organizationId ? M.positionTitle(pres) : '')) ? 'Adviser' : 'President';
    return '<div class="sf-page sf-slip">' + header('CSPC-F-SASO-14') +
      '<div class="sf-title sf-u">RESPONSIBILITY ACCEPTANCE SLIP</div>' +
      '<div class="sf-slip-date"><span class="sf-fill">' + prepared(activity) + '</span><div>Date</div></div>' +
      '<p class="sf-slip-body">I, <span class="sf-fill sf-fill-lg">' + esc(name) + '</span> vow to accept the responsibility as the ' +
        '<span class="sf-strike-not">' + (role === 'Adviser' ? 'President/<b>Adviser</b>' : '<b>President</b>/Adviser') + '</span> of the ' +
        '<span class="sf-fill sf-fill-lg">' + esc(org.name || '') + '</span> during the ' +
        '<span class="sf-fill sf-fill-lg">' + esc(activity.title || '') + '</span> on ' +
        '<span class="sf-fill sf-fill-lg">' + esc(M.activityDateText(activity)) + '</span>.</p>' +
      '<p>Thank you very much.</p>' +
      '<div class="sf-slip-sign"><div class="sf-noted-name">&nbsp;</div><div class="sf-center">Signature</div></div>' +
      '<div class="sf-italic sf-mt">Attested:</div>' +
      '<div class="sf-slip-attest">' +
        '<div><div class="sf-noted-name">' + esc(org.adviser || '') + '</div><div class="sf-center">Adviser</div></div>' +
        '<div><div class="sf-noted-name">&nbsp;</div><div class="sf-center">Dean</div></div>' +
      '</div>' +
      footer('January 2021', 'Rev. 2') +
    '</div>';
  }

  /* ---- CMO No. 63, s. 2017 documents (local off-campus activities) ------------------ */

  function personnel(activity) {
    var org = M.orgById(activity.organizationId) || {};
    return activity.instructors || org.adviser || '';
  }

  function plainHeader() {
    return '<div class="sf-head sf-head-center">' + seal() +
      '<div class="sf-inst sf-center"><div>Republic of the Philippines</div>' +
      '<div class="sf-college">CAMARINES SUR POLYTECHNIC COLLEGES</div><div>Nabua, Camarines Sur</div></div></div>' +
      '<div class="sf-rule"></div>';
  }

  function sigBlock(caption, name, title, underline) {
    return '<div class="sf-cmo-sig"><div>' + caption + '</div>' +
      '<div class="sf-cmo-sig-name' + (underline ? ' sf-signer-name' : '') + '">' + (name ? esc(name) : '&nbsp;') + '</div>' +
      '<div class="sf-cmo-sig-line"></div><div>' + title + '</div></div>';
  }

  var ORDER_ROWS = [
    ['Responsibility Acceptance Slip', '', 'Responsibility Acceptance Slip'],
    ['Permission to Conduct Off-Campus Activity', '', 'Permission to Conduct'],
    ['Certificate of Compliance', '', null],
    ['Report of Compliance', '', null],
    ['Transmittal Letter<div class="sf-sub">Activity Proposal/Request Letter</div>', '', 'Activity Proposal'],
    ['Curriculum Development', 'A'], ['Destination', 'B'], ['Handbook or Manual', 'C'],
    ['Students<div class="sf-sub">Consent of the Parents/Guardians</div><div class="sf-sub">Medical Clearance of the Students</div>', 'D'],
    ['Personnel-In-Charge (PDS)', 'E'], ['First Aid Kit', 'F'], ['Fees/Funds', 'G'], ['Insurance', 'H'],
    ['Mobility of Student (vehicles)<div class="sf-sub">Owned by the HEI</div><div class="sf-sub">Third Party or Subcontracting</div>' +
      '<div class="sf-sub">Franchisee/Travel Agency/Tour Operator</div>', 'I'],
    ['LGUs/NGOs', 'J'],
    ['Activities<div class="sf-sub">Orientation to Students</div><div class="sf-sub">Consultation</div><div class="sf-sub">Announcements</div>' +
      '<div class="sf-sub">Briefing before the trip</div><div class="sf-sub">Learning Journals</div><div class="sf-sub">Emergency Preparedness Plan</div>', 'K']
  ];

  function orderPage(activity) {
    var cmo = reqSubmitted(activity, 'CMO 63');
    return '<div class="sf-page sf-cmo">' +
      '<div class="sf-title sf-mt">ORDER OF DOCUMENTARY REQUIREMENTS ON THE CONDUCT OF LOCAL<br>OFF-CAMPUS ACTIVITIES</div>' +
      '<div class="sf-cmo-for">' + esc(activity.title || '') + ' · ' + esc(M.activityDateText(activity)) + ' · ' + esc(activity.venue || '') + '</div>' +
      '<table class="sf-grid sf-order"><colgroup><col style="width:55%"><col style="width:15%"><col style="width:30%"></colgroup>' +
        '<tr><th>ACTIVITIES</th><th>TAB</th><th>REMARKS</th></tr>' +
        ORDER_ROWS.map(function (r) {
          var remark = '';
          if (r[2]) { remark = reqSubmitted(activity, r[2]) ? 'Attached' : ''; }
          else if (!r[1] && cmo) { remark = 'Attached'; }
          return '<tr><td>' + r[0] + '</td><td class="sf-center sf-label">' + r[1] + '</td><td>' + remark + '</td></tr>';
        }).join('') +
      '</table>' +
      '<div class="sf-mt">Checked by:</div><div class="sf-cmo-check"></div>' +
      '<div class="sf-small">(To be filled-up by SASO Staff)</div>' +
    '</div>';
  }

  function certificatePage(activity) {
    var sig = M.signatories();
    return '<div class="sf-page sf-cmo">' + plainHeader() +
      '<div class="sf-title">LOCAL OFF-CAMPUS ACTIVITIES</div>' +
      '<div class="sf-title sf-italic-title">CERTIFICATE OF COMPLIANCE</div>' +
      '<p class="sf-cmo-body">This is to certify that all processes, procedures and requirements before the conduct of the ' +
        'off-campus activity/ies pursuant to <i>CMO No. 63, s. 2017 entitled "Policies and Guidelines on the Local ' +
        'Off-Campus Activities"</i> have been duly complied with, and that by virtue thereof, we hereby assume full ' +
        'responsibility for the safety and welfare of the students.</p>' +
      '<p class="sf-cmo-body sf-small">Activity: <b>' + esc(activity.title || '') + '</b>, ' + esc(M.activityDateText(activity)) +
        ', ' + esc(activity.venue || '') + '</p>' +
      '<div class="sf-cmo-grid">' +
        sigBlock('Certified Correct:', personnel(activity), 'Personnel-in-Charge') +
        sigBlock('Recommending approval:', sig.vpaa.name, esc(sig.vpaa.title), true) +
        sigBlock('Approved by:', sig.president.name, 'President/Head of HEI/<br>Authorized Representative', true) +
      '</div>' +
      '<p class="sf-cmo-body sf-mt">SUBSCRIBED AND SWORN to before me, this <span class="sf-fill sf-fill-sm"></span>, by ' +
        '<span class="sf-fill"></span> who exhibited to me (his/her) competent proof of identification ' +
        '<span class="sf-fill"></span> issued at <span class="sf-fill"></span>, Philippines on <span class="sf-fill"></span>.</p>' +
      '<div class="sf-mt">Notary Public</div>' +
      '<div class="sf-notary">Doc. No. ______;<br>Page No. ______;<br>Book No. ______;<br>Series of ______;</div>' +
    '</div>';
  }

  var COMPLIANCE_ROWS = ['Curriculum Requirement', 'Destination', 'Handbook or Manual',
    'Students Consent of the Parents/Guardians', 'Medical Clearance of the Students', 'Personnel-In-Charge',
    'First Aid Kit', 'Fees/Funds', 'Insurance', 'Mobility of Student (vehicles)', 'Owned by the HEI',
    'Third Party or Subcontracting Franchisee/Travel Agency/Tour Operator', 'LGUs/NGOs', 'Activities',
    'Orientation to Students', 'Consultation', 'Announcements', 'Briefing before the trip', 'Learning Journals',
    'Emergency Preparedness Plan'];

  function reportPage(activity) {
    var sig = M.signatories();
    var by = activity.submittedBy && activity.submittedBy.userId ? M.userById(activity.submittedBy.userId) : null;
    var org = M.orgById(activity.organizationId) || {};
    var funds = activity.fundSource ? activity.fundSource + (activity.budget ? ', PHP ' + activity.budget : '') : '';
    var vehicle = activity.transportType === 'COLLEGE' ? 'College vehicle' : activity.transportType === 'PRIVATE' ? 'Private vehicle' : '';
    var prefill = { 'Personnel-In-Charge': personnel(activity), 'Fees/Funds': funds, 'Destination': activity.venue || '',
      'Mobility of Student (vehicles)': vehicle, 'Owned by the HEI': activity.transportType === 'COLLEGE' ? 'Yes' : '' };
    return '<div class="sf-page sf-cmo">' +
      '<div class="sf-center sf-ched-head">Republic of the Philippines<br>Office of the President<br><b>COMMISSION ON HIGHER EDUCATION</b></div>' +
      '<div class="sf-title">LOCAL OFF-CAMPUS ACTIVITIES</div><div class="sf-title">REPORT OF COMPLIANCE</div>' +
      '<div class="sf-cmo-hei"><span>NAME OF HEI: <b>CAMARINES SUR POLYTECHNIC COLLEGES</b></span><span>REGION: <b>V</b></span></div>' +
      '<div class="sf-cmo-hei"><span>ADDRESS: <b>SAN MIGUEL NABUA, CAMARINES SUR</b></span></div>' +
      '<div class="sf-italic sf-label sf-mt">BASIC INFORMATION:</div>' +
      '<table class="sf-grid sf-basic"><tr><th>PROGRAM NAME</th><th>COURSE</th><th>DESTINATION/S AND VENUE</th>' +
        '<th>INCLUSIVE DATES</th><th>NUMBER OF STUDENTS</th><th>LIST OF PERSONNEL-IN-CHARGE</th></tr>' +
        '<tr><td>' + esc((by && by.program) || org.name || '') + '</td><td>' + esc(activity.participantDescription || '') + '</td>' +
          '<td>' + esc(activity.venue || '') + '</td><td>' + esc(M.activityDateText(activity)) + '</td>' +
          '<td class="sf-center">' + esc(activity.expectedParticipants || '') + '</td><td>' + esc(personnel(activity)) + '</td></tr></table>' +
      '<div class="sf-label sf-mt">REPORT BEFORE THE ACTIVITY:</div>' +
      '<table class="sf-grid sf-comp"><colgroup><col style="width:47%"><col style="width:11%"><col style="width:42%"></colgroup>' +
        '<tr><th rowspan="2">ACTIVITIES</th><th colspan="2">COMPLIANCE</th></tr><tr><th>YES/NO</th><th>REMARKS</th></tr>' +
        COMPLIANCE_ROWS.map(function (r, i) {
          return '<tr><td>' + (i + 1) + '. ' + r + '</td><td></td><td>' + esc(prefill[r] || '') + '</td></tr>';
        }).join('') +
      '</table>' +
      '<div class="sf-cmo-grid sf-cmo-grid-4">' +
        sigBlock('Certified Correct:', personnel(activity), 'Personnel-In-Charge') +
        sigBlock('Recommending Approval:', sig.vpaa.name, esc(sig.vpaa.title), true) +
        sigBlock('Reviewed by:', '', 'Dean or Program Head') +
        sigBlock('Approved by:', sig.president.name, 'President/Head of HEI/Authorized Representative', true) +
      '</div>' +
    '</div>';
  }

  function rolePage(activity) {
    function list(items) { return '<ul class="sf-role">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }
    return '<div class="sf-page sf-cmo">' + plainHeader() +
      '<div class="sf-title">ROLE OF THE PERSONNEL-IN-CHARGE</div>' +
      '<div class="sf-label sf-mt">Before the off-campus activity</div>' +
      list(['Orient the students regarding the activity to be conducted.',
            'Check and submit the report of Compliance as stated in the CHED Memo No. 63.']) +
      '<div class="sf-label">During the off-campus activity</div>' +
      list(['Accompany the students from the time they assemble for the off-campus activity to debriefing.',
            'Ensure the provision of the allowable seating capacity of the vehicle/s used.',
            'Ensure that program of activities is properly followed as planned or activities can be adjusted as the need arises.']) +
      '<div class="sf-label">After the off-campus activity</div>' +
      list(['Prepare needed reports.',
            'Debriefing of the concerned faculty to students to be able to assess acquisition of learning.']) +
      '<div class="sf-cmo-grid">' + sigBlock('Prepared by:', personnel(activity), 'Personnel-in-Charge') + '</div>' +
    '</div>';
  }

  function cmo63(activity) {
    return orderPage(activity) + certificatePage(activity) + reportPage(activity) + rolePage(activity);
  }

  function build(key, activity) {
    if (key === 'slip') { return slip(activity); }
    if (key === 'cmo63') { return cmo63(activity); }
    if (key === 'checklist') { return checklist(activity); }
    return ptc(activity, key === 'ptc-off');
  }

  function fileName(key, activity) {
    var org = M.orgById(activity.organizationId);
    var title = (activity.title || 'Activity').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    return FORMS[key].file + '_' + (org ? org.acronym.replace(/[^A-Za-z0-9]+/g, '') + '_' : '') + title + '.pdf';
  }

  /* Renders the form off screen and saves it as an A4 PDF. Returns a promise. */
  function downloadPdf(key, activity) {
    if (!window.html2pdf) {
      window.location.href = SASO.layout.href('pages/documents/print.html?id=' + activity.id + '&doc=' + key);
      return Promise.resolve(false);
    }
    var holder = document.createElement('div');
    holder.className = 'sf-offscreen';
    holder.innerHTML = '<div class="sf-pages">' + build(key, activity) + '</div>';
    document.body.appendChild(holder);
    var page = holder.firstChild;
    return window.html2pdf().set({
      margin: 0,
      filename: fileName(key, activity),
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: [] }
    }).from(page).save().then(function () {
      holder.remove();
      return true;
    }, function (err) {
      holder.remove();
      throw err;
    });
  }

  /* Which form a requirement row downloads, if any. */
  function formForRequirement(name, activity) {
    if (/^Permission to Conduct/.test(name)) { return ptcKey(activity); }
    if (/^Responsibility Acceptance Slip/.test(name)) { return 'slip'; }
    if (/^CMO 63/.test(name) && activity && activity.venueType === C.VENUE.OFF_CAMPUS) { return 'cmo63'; }
    return null;
  }

  return { FORMS: FORMS, formsFor: formsFor, ptcKey: ptcKey, build: build, downloadPdf: downloadPdf,
           fileName: fileName, formForRequirement: formForRequirement,
           /* Shared with saso-docx.js, which writes the same forms as Word files. */
           helpers: { time12: time12, reqSubmitted: reqSubmitted, leg: leg, responsible: responsible,
                      prepared: prepared, president: president, personnel: personnel,
                      CERTIFY: CERTIFY, COMPLIANCE_ROWS: COMPLIANCE_ROWS } };
})();
