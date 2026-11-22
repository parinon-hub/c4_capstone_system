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
    checklist: { code: 'CSPC-F-SASO-59', label: 'Requirements checklist (on campus)', file: 'Requirements_Checklist' }
  };

  function formsFor(activity) {
    return activity && activity.venueType === C.VENUE.OFF_CAMPUS ? ['ptc-off'] : ['ptc-on', 'checklist'];
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

  function build(key, activity) {
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
    holder.innerHTML = build(key, activity);
    document.body.appendChild(holder);
    var page = holder.firstChild;
    return window.html2pdf().set({
      margin: 0,
      filename: fileName(key, activity),
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css'] }
    }).from(page).save().then(function () {
      holder.remove();
      return true;
    }, function (err) {
      holder.remove();
      throw err;
    });
  }

  return { FORMS: FORMS, formsFor: formsFor, ptcKey: ptcKey, build: build, downloadPdf: downloadPdf, fileName: fileName };
})();
