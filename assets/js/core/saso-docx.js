/* =========================================================================
   saso-docx.js  -  SASO's forms as editable Word (.docx) files.

   The same forms as saso-forms.js (PTC on and off campus, requirements
   checklist, Responsibility Acceptance Slip and the CMO No. 63 documents),
   filled in from the proposal and saved as real Word documents, so the
   organization can still correct or add to them before printing and signing.
   Built in the browser with the docx library (window.docx).

     SASO.sasoDocx.download(key, activity)  saves the form; returns a promise
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.sasoDocx = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var F = SASO.sasoForms;
  var H = F.helpers;

  function D() { return window.docx; }
  function available() { return !!window.docx; }

  /* ---- building blocks ---------------------------------------------------------- */

  var BLUE = '1F5FB3';

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  function R(text, o) { return new (D().TextRun)(Object.assign({ text: str(text) }, o || {})); }

  /* P('text') or P([runs], { center, right, bold, size, before, after, ... }) */
  function P(runs, o) {
    o = o || {};
    var kids = (Array.isArray(runs) ? runs : [runs]).map(function (r) {
      return typeof r === 'string' ? R(r, { bold: o.bold, italics: o.italics, size: o.size, underline: o.underline }) : r;
    });
    var opts = { children: kids, spacing: { before: o.before || 0, after: o.after === undefined ? 40 : o.after, line: o.line } };
    if (o.center) { opts.alignment = D().AlignmentType.CENTER; }
    if (o.right) { opts.alignment = D().AlignmentType.RIGHT; }
    if (o.justify) { opts.alignment = D().AlignmentType.JUSTIFIED; }
    if (o.indent) { opts.indent = { left: o.indent }; }
    if (o.bottomLine) { opts.border = { bottom: { style: D().BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } }; }
    if (o.blueLine) { opts.border = { bottom: { style: D().BorderStyle.SINGLE, size: 18, color: BLUE, space: 1 } }; }
    if (o.topBlue) { opts.border = { top: { style: D().BorderStyle.SINGLE, size: 18, color: BLUE, space: 1 } }; }
    if (o.pageBreak) { opts.pageBreakBefore = true; }
    return new (D().Paragraph)(opts);
  }

  /* A filled-in blank: the value underlined, or a line when empty. */
  function fill(value, o) {
    var v = str(value);
    return R(v ? ' ' + v + ' ' : '                              ', Object.assign({ underline: {} }, o || {}));
  }

  function box(on) { return R(on ? '☒ ' : '☐ ', { font: 'Segoe UI Symbol' }); }

  var NONE = { style: 'none', size: 0, color: 'FFFFFF' };
  function borders(on) {
    var b = on ? { style: 'single', size: 6, color: '000000' } : NONE;
    return { top: b, bottom: b, left: b, right: b };
  }

  /* cell(children, { span, width (percent), border, shade, vAlign }) */
  function cell(children, o) {
    o = o || {};
    var opts = {
      children: (Array.isArray(children) ? children : [children]).map(function (c) { return typeof c === 'string' ? P(c) : c; }),
      borders: o.borders || borders(o.border !== false),
      margins: { top: 30, bottom: 30, left: 90, right: 90 }
    };
    if (o.span) { opts.columnSpan = o.span; }
    if (o.rowSpan) { opts.rowSpan = o.rowSpan; }
    if (o.width) { opts.width = { size: o.width, type: D().WidthType.PERCENTAGE }; }
    if (o.shade) { opts.shading = { fill: o.shade, type: D().ShadingType.CLEAR, color: 'auto' }; }
    if (o.vCenter) { opts.verticalAlign = D().VerticalAlign.CENTER; }
    return new (D().TableCell)(opts);
  }

  function table(rows, o) {
    o = o || {};
    return new (D().Table)({
      width: { size: o.width || 100, type: D().WidthType.PERCENTAGE },
      columnWidths: o.cols,
      rows: rows.map(function (r) { return new (D().TableRow)({ children: r, cantSplit: !o.split }); })
    });
  }

  function b64ToBytes(dataUrl) {
    var b64 = dataUrl.split(',')[1] || '';
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) { out[i] = bin.charCodeAt(i); }
    return out;
  }

  function sealRun(w) {
    if (!SASO.CSPC_SEAL) { return R(''); }
    return new (D().ImageRun)({ data: b64ToBytes(SASO.CSPC_SEAL), transformation: { width: w || 56, height: Math.round((w || 56) * 0.885) } });
  }

  /* CSPC letterhead with the form code on the right of the blue rule. */
  function letterhead(code, centered) {
    var head = table([[
      cell(P([sealRun(56)], { right: !!centered, after: 0 }), { border: false, width: centered ? 30 : 12, vCenter: true }),
      cell([
        P('Republic of the Philippines', { size: 21, after: 0 }),
        P('CAMARINES SUR POLYTECHNIC COLLEGES', { bold: true, size: 23, after: 0 }),
        P('Nabua, Camarines Sur', { size: 21, after: 0 })
      ], { border: false, width: centered ? 70 : 88, vCenter: true })
    ]], { cols: centered ? [3000, 7106] : [1250, 8856] });
    return [head, P([R(code || '', { bold: true, size: 18 })], { right: true, blueLine: true, after: 120 })];
  }

  function footer(effectivity, rev) {
    return new (D().Footer)({ children: [table([[
      cell(P([R('Effectivity Date: ', { bold: true, size: 17 }), R(effectivity, { bold: true, size: 17 })], { after: 0 }),
        { borders: { top: { style: 'single', size: 18, color: BLUE }, bottom: NONE, left: NONE, right: NONE }, width: 40 }),
      cell(P(rev, { bold: true, size: 17, center: true, after: 0 }),
        { borders: { top: { style: 'single', size: 18, color: BLUE }, bottom: NONE, left: NONE, right: NONE }, width: 20 }),
      cell(P('Page: 1 of 1', { bold: true, size: 17, right: true, after: 0 }),
        { borders: { top: { style: 'single', size: 18, color: BLUE }, bottom: NONE, left: NONE, right: NONE }, width: 40 })
    ]])] });
  }

  /* A signature: name over a line, caption below. */
  function signature(name, caption, o) {
    o = o || {};
    return [
      name
        ? P([R(name, { bold: true, underline: {} })], { center: o.center !== false, before: o.before || 280, after: 0 })
        : P('_______________________________', { center: o.center !== false, before: o.before || 280, after: 0 }),
      P(caption, { center: o.center !== false, bold: o.boldCaption !== false, size: o.size || 20, after: 80 })
    ];
  }

  function section(children, foot, size) {
    var sec = {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 600, right: 900, bottom: 700, left: 900, footer: 300 } } },
      children: children
    };
    if (foot) { sec.footers = { default: foot }; }
    return sec;
  }

  function activityDate(a) { return M.activityDateText(a); }

  /* ---- CSPC-F-SASO-05 / -07 Permission to Conduct -------------------------------- */

  function ptc(a, off) {
    var org = M.orgById(a.organizationId) || {};
    var sig = M.signatories();
    var who = H.responsible(a);
    var sasoLeg = H.leg(a, C.OFFICE.SASO), vpaa = H.leg(a, C.OFFICE.VPAA), pres = H.leg(a, C.OFFICE.PRESIDENT);
    var cur = a.natureType === 'CURRICULAR', non = a.natureType === 'NON_CURRICULAR';
    var size = off ? 18 : 19;
    var time = a.timeStart ? H.time12(a.timeStart) + (a.timeEnd ? ' to ' + H.time12(a.timeEnd) : '') : '';

    function natureList(items, on) {
      return items.map(function (n) { return P([box(on && a.natureItem === n), R(n, { italics: true, size: size - 1 })], { after: 0 }); });
    }
    function label(t, v) { return [P(t, { bold: true, size: size, after: 0 }), P(str(v) || ' ', { size: size, indent: 120, after: 20 })]; }
    function office(heading, signer, l, decide) {
      var out = [];
      if (heading) { out.push(P(heading, { bold: true, size: size, after: 60 })); }
      if (decide) {
        out.push(P([box(l && l.decision === 'Approved'), R('APPROVED', { bold: true })], { indent: 240, after: 0 }));
        out.push(P([box(l && (l.decision === 'Rejected' || l.decision === 'Returned')), R('DISAPPROVED', { bold: true })], { indent: 240, after: 60 }));
      }
      out.push(P([R(signer.name, { bold: true, underline: {}, size: size + 1 })], { center: true, before: 140, after: 0 }));
      out.push(P(signer.title, { center: true, size: size, after: 40 }));
      out.push(P([R('Remarks: ', { bold: true, size: size }), R(l && l.remarks ? l.remarks : '', { size: size })], { after: off ? 80 : 200 }));
      return out;
    }
    function respRow(name, caption, position) {
      return table([[
        cell(P([R(name || ' ', { bold: true, size: size })], { center: true, after: 0 }), { borders: { top: NONE, left: NONE, right: NONE, bottom: { style: 'single', size: 6, color: '000000' } }, width: 62 }),
        cell(P(position || ' ', { center: true, size: size, after: 0 }), { borders: { top: NONE, left: NONE, right: NONE, bottom: { style: 'single', size: 6, color: '000000' } }, width: 38 })
      ], [
        cell(P(caption, { center: true, bold: true, size: size - 1, after: 0 }), { border: false }),
        cell(P('Designation', { center: true, bold: true, size: size - 1, after: 0 }), { border: false })
      ]]);
    }

    var nature = table([[
      cell([P([box(cur), R('Curricular', { bold: true, size: size })], { after: 10 })].concat(natureList(C.ACTIVITY_NATURE.CURRICULAR, cur)), { border: false, width: 45 }),
      cell([P([box(non), R('Non-Curricular', { bold: true, size: size })], { after: 10 })].concat(natureList(C.ACTIVITY_NATURE.NON_CURRICULAR, non)), { border: false, width: 55 })
    ]]);

    var left = [P(H.CERTIFY, { size: size, justify: true, after: 120 }),
      respRow(who.name, 'Person Responsible', who.position),
      P(' ', { after: 60 }),
      respRow(a.coResponsibleName, 'Co-Responsible', a.coResponsiblePosition),
      P('Noted:', { bold: true, size: size, before: 120, after: 0 })]
      .concat(signature('', 'SSC Representative (Academic Org.)', { size: size - 1, before: 160 }))
      .concat(signature(org.adviser || '', 'Adviser/s', { size: size - 1, before: 140 }))
      .concat(signature('', 'Dean', { size: size - 1, before: 160 }));
    var right = off
      ? office('RECOMMENDING APPROVAL:', sig.sasDirector, sasoLeg, false)
          .concat(office('Recommending Approval:', sig.vpaa, vpaa, false))
          .concat(office('', sig.president, pres, true))
      : office('RECOMMENDING APPROVAL:', sig.sasDirector, sasoLeg, false).concat(office('', sig.vpaa, vpaa, true));

    var rows = [
      [cell(label('Title of the Activity' + (off ? ':' : ''), a.title), { span: 2 })],
      [cell(label('Venue:', a.venue), { width: 50 }),
       cell([P([R('Date' + (off ? '' : ' of Activity') + ': ', { bold: true, size: size }), R(activityDate(a), { size: size })], { after: 40 }),
             P([R('Time: ', { bold: true, size: size }), R(time, { size: size })])], { width: 50 })],
      [cell(label('No. of Participants:', str(a.expectedParticipants) + (a.participantDescription ? ' (' + a.participantDescription + ')' : ''))),
       cell(label('Sponsoring Organization/Class:', (org.name || '') + (org.acronym ? ' (' + org.acronym + ')' : '')))]
    ];
    if (off) {
      rows.push([cell(label('Source of Funds:', [a.fundSource, a.budget ? 'PHP ' + a.budget : ''].filter(Boolean).join(', '))),
                 cell(label('Instructor/s joining the Convention:', a.instructors))]);
    }
    rows.push([cell([P('Objectives of the ' + (off ? 'Convention' : 'Activity') + ':', { bold: true, size: size, after: 20 })].concat(
      (a.objectives || []).filter(Boolean).map(function (o, i) { return P((i + 1) + '. ' + o, { size: size, indent: 120, after: 10 }); })
        .concat((a.objectives || []).length ? [] : [P(' ')])), { span: 2 })]);
    if (off) {
      var col = a.transportType === 'COLLEGE', priv = a.transportType === 'PRIVATE';
      rows.push([cell([P('Transportation to be used (Check):', { bold: true, size: size, after: 20 }),
        P([box(col), R('College Vehicle charged at P', { size: size }), fill(col ? a.transportRate : '', { size: size }), R(' rate/day.', { size: size })], { indent: 120, after: 10 }),
        P([box(priv), R('Private Vehicle P', { size: size }), fill(priv ? a.transportRate : '', { size: size }), R(' per student.', { size: size })], { indent: 120 })], { span: 2 })]);
    }
    rows.push([cell(left, { width: 50 }), cell(right, { width: 50 })]);

    var attach = [P('Attachments:', { bold: true, before: 80, after: 0 }),
      P([box(H.reqSubmitted(a, 'List of Participants')), R('List of Students', { size: size })], { indent: 400, after: 0 }),
      P([box(H.reqSubmitted(a, 'Activity Proposal') || H.reqSubmitted(a, 'Budget Proposal')), R('Activity/Budget Proposal', { size: size })], { indent: 400, after: 0 })];
    if (off) { attach.push(P([box(H.reqSubmitted(a, 'CMO 63')), R('Accomplished CMO No. 63', { size: size })], { indent: 400, after: 0 })); }

    var children = letterhead(off ? 'CSPC-F-SASO-07' : 'CSPC-F-SASO-05').concat([
      P(off ? 'PERMISSION TO CONDUCT OFF-CAMPUS ACTIVITY' : 'PERMISSION TO CONDUCT CAMPUS ACTIVITY', { bold: true, size: 28, center: true, after: 20 }),
      P([R('Date Prepared: ', { bold: true }), fill(F.helpers.prepared(a))], { right: true, after: 60 })
    ]).concat(off ? [P('Nature of the Activity: (Please check)', { bold: true, italics: true, after: 20 })] : [])
      .concat([nature, P(' ', { after: 0, size: 8 }), table(rows, { split: true })])
      .concat(attach)
      .concat([
        P([R('Note:   ', { bold: true, italics: true, size: 17 }), R('White - Org. copy;  Blue - VPAA/President’s Copy;  Yellow - SASO Copy', { bold: true, italics: true, size: 17 })], { before: 60, after: 20 }),
        P('Please get your approved permit to the Student Affairs and Services Office', { bold: true, italics: true, size: 17 })
      ]);
    return [section(children, footer('January 2021', 'Rev. 3'))];
  }

  /* ---- CSPC-F-SASO-59 Requirements for On-Campus Activities ---------------------- */

  function checklist(a) {
    var org = M.orgById(a.organizationId) || {};
    var saso = H.leg(a, C.OFFICE.SASO);
    var items = [['Responsibility Acceptance Slip', 'Responsibility Acceptance Slip'],
      ['Permission to Conduct On-Campus Activity', 'Permission to Conduct'], ['Activity Proposal', 'Activity Proposal'],
      ['Budget Proposal/ Source of funds', 'Budget Proposal'], ['List of student-participants', 'List of Participants']];
    var listed = items.map(function (i) { return i[1]; });
    var others = M.requirementsFor(a.id, C.PHASE.PRE_APPROVAL).filter(function (r) {
      return r.status !== C.REQUIREMENT.NOT_SUBMITTED && !listed.some(function (p) { return r.name.indexOf(p) === 0; });
    }).map(function (r) { return r.name; });
    function line(lbl, v) { return P([R(lbl + ' ', { size: 26 }), fill(v, { size: 26 })], { after: 80 }); }
    var children = letterhead('CSPC-F-SASO-59').concat([
      P('STUDENT AFFAIRS AND SERVICES OFFICE', { bold: true, size: 26, center: true, after: 200 }),
      P('REQUIREMENTS FOR THE CONDUCT OF', { bold: true, size: 32, center: true, after: 0 }),
      P('ON-CAMPUS ACTIVITIES', { bold: true, size: 32, center: true, after: 300 }),
      line('Name of Activity:', a.title), line('Date of Activity:', activityDate(a)), line('Venue:', a.venue),
      line('Sponsoring Organization:', (org.name || '') + (org.acronym ? ' (' + org.acronym + ')' : '')),
      P('Please attach the following duly signed documents:', { size: 26, before: 200, after: 120 })
    ]).concat(items.map(function (it, i) {
      return P([R((i + 1) + '.  ' + it[0] + '   ', { size: 26 }), fill(H.reqSubmitted(a, it[1]) ? '✓' : '', { size: 26 })], { indent: 600, after: 60 });
    })).concat([
      P('6.  Others (Please specify)', { size: 26, indent: 600, after: 60 }),
      P([fill(others.join(', '), { size: 24 })], { indent: 900, after: 300 }),
      P('Checked By:', { size: 26, indent: 2400, after: 300 }),
      P([fill(saso && saso.decidedAt ? M.formatDate(saso.decidedAt) : '', { size: 24 })], { center: true, after: 0 }),
      P('SASO Staff/Date', { size: 26, center: true })
    ]);
    return [section(children, footer('December 2022', 'Rev. 0'))];
  }

  /* ---- CSPC-F-SASO-14 Responsibility Acceptance Slip ----------------------------- */

  function slip(a) {
    var org = M.orgById(a.organizationId) || {};
    var who = H.responsible(a);
    var pres = /^(President|Adviser)/i.test(who.position || '') ? who : H.president(a.organizationId);
    var adviserRole = pres && /^Adviser/i.test(pres.position || '');
    var children = letterhead('CSPC-F-SASO-14', true).concat([
      P([R('RESPONSIBILITY ACCEPTANCE SLIP', { bold: true, underline: {}, size: 26 })], { center: true, before: 120, after: 360 }),
      P([fill(H.prepared(a), { size: 24 })], { right: true, after: 0 }),
      P('Date', { right: true, size: 24, after: 300 }),
      P([R('I, ', { size: 24 }), fill(pres ? pres.name : '', { size: 24, bold: true }),
         R(' vow to accept the responsibility as the ', { size: 24 }),
         R('President', { size: 24, bold: !adviserRole }), R('/', { size: 24 }), R('Adviser', { size: 24, bold: adviserRole }),
         R(' of the ', { size: 24 }), fill(org.name, { size: 24, bold: true }),
         R(' during the ', { size: 24 }), fill(a.title, { size: 24, bold: true }),
         R(' on ', { size: 24 }), fill(activityDate(a), { size: 24, bold: true }), R('.', { size: 24 })],
        { justify: true, line: 420, after: 200 }),
      P('Thank you very much.', { size: 24, after: 300 }),
      table([[cell(' ', { border: false, width: 55 }), cell(signature('', 'Signature', { boldCaption: false, size: 24 }), { border: false, width: 45 })]]),
      P('Attested:', { italics: true, size: 24, before: 200 }),
      table([[cell(signature(org.adviser || '', 'Adviser', { boldCaption: false, size: 24 }), { border: false, width: 45 }),
              cell(' ', { border: false, width: 10 }),
              cell(signature('', 'Dean', { boldCaption: false, size: 24 }), { border: false, width: 45 })]])
    ]);
    return [section(children, footer('January 2021', 'Rev. 2'))];
  }

  /* ---- CMO No. 63, s. 2017 documents ---------------------------------------------- */

  var ORDER = [
    ['Responsibility Acceptance Slip', '', [], 'Responsibility Acceptance Slip'],
    ['Permission to Conduct Off-Campus Activity', '', [], 'Permission to Conduct'],
    ['Certificate of Compliance', '', [], 'CMO 63'],
    ['Report of Compliance', '', [], 'CMO 63'],
    ['Transmittal Letter', '', ['Activity Proposal/Request Letter'], 'Activity Proposal'],
    ['Curriculum Development', 'A', []], ['Destination', 'B', []], ['Handbook or Manual', 'C', []],
    ['Students', 'D', ['Consent of the Parents/Guardians', 'Medical Clearance of the Students']],
    ['Personnel-In-Charge (PDS)', 'E', []], ['First Aid Kit', 'F', []], ['Fees/Funds', 'G', []], ['Insurance', 'H', []],
    ['Mobility of Student (vehicles)', 'I', ['Owned by the HEI', 'Third Party or Subcontracting', 'Franchisee/Travel Agency/Tour Operator']],
    ['LGUs/NGOs', 'J', []],
    ['Activities', 'K', ['Orientation to Students', 'Consultation', 'Announcements', 'Briefing before the trip', 'Learning Journals', 'Emergency Preparedness Plan']]
  ];

  function plainLetterhead() { return letterhead('', true); }

  function sigPair(l, r) {
    return table([[cell(l, { border: false, width: 50 }), cell(r, { border: false, width: 50 })]]);
  }
  function sigCol(caption, name, title, underlineName) {
    return [P(caption, { after: 0 }),
      name ? P([R(name, { bold: true, underline: {} })], { before: 280, after: 0 })
           : P('______________________________', { before: 280, after: 0 }),
      P(title, { after: 100 })];
  }

  function cmo63(a) {
    var sig = M.signatories();
    var org = M.orgById(a.organizationId) || {};
    var pic = H.personnel(a);
    var hdr = { bold: true, size: 20 };

    var order = [
      P('ORDER OF DOCUMENTARY REQUIREMENTS ON THE CONDUCT OF LOCAL OFF-CAMPUS ACTIVITIES', { bold: true, size: 26, center: true, after: 60 }),
      P(str(a.title) + ' · ' + activityDate(a) + ' · ' + str(a.venue), { center: true, size: 18, after: 120 }),
      table([[cell(P('ACTIVITIES', Object.assign({ center: true }, hdr)), { width: 55 }), cell(P('TAB', Object.assign({ center: true }, hdr)), { width: 15 }),
              cell(P('REMARKS', Object.assign({ center: true }, hdr)), { width: 30 })]].concat(ORDER.map(function (r) {
        return [cell([P(r[0], { size: 20, after: 0 })].concat(r[2].map(function (x) { return P(x, { italics: true, size: 20, indent: 360, after: 0 }); }))),
                cell(P(r[1], { center: true, bold: true, size: 20 }), { vCenter: true }),
                cell(P(r[3] && H.reqSubmitted(a, r[3]) ? 'Attached' : '', { size: 20 }), { vCenter: true })];
      }))),
      P('Checked by:', { before: 400, after: 360 }),
      P('______________________________', { after: 0 }),
      P('(To be filled-up by SASO Staff)', { size: 18 })
    ];

    var cert = plainLetterhead().concat([
      P('LOCAL OFF-CAMPUS ACTIVITIES', { bold: true, center: true, before: 200, after: 60 }),
      P('CERTIFICATE OF COMPLIANCE', { bold: true, italics: true, center: true, after: 300 }),
      P([R('This is to certify that all processes, procedures and requirements before the conduct of the off-campus activity/ies pursuant to '),
         R('CMO No. 63, s. 2017 entitled “Policies and Guidelines on the Local Off-Campus Activities”', { italics: true }),
         R(' have been duly complied with, and that by virtue thereof, we hereby assume full responsibility for the safety and welfare of the students.')],
        { justify: true, line: 340, after: 120 }),
      P([R('Activity: ', { size: 18 }), R(str(a.title), { bold: true, size: 18 }), R(', ' + activityDate(a) + ', ' + str(a.venue), { size: 18 })], { after: 200 }),
      sigPair(sigCol('Certified Correct:', pic, 'Personnel-in-Charge'), sigCol('Recommending approval:', sig.vpaa.name, sig.vpaa.title, true)),
      sigPair(sigCol('Approved by:', sig.president.name, 'President/Head of HEI/ Authorized Representative', true), [P(' ')]),
      P([R('SUBSCRIBED AND SWORN to before me, this '), fill(''), R(', by '), fill(''), R(' who exhibited to me (his/her) competent proof of identification '),
         fill(''), R(' issued at '), fill(''), R(', Philippines on '), fill(''), R('.')], { justify: true, line: 360, before: 300, after: 200 }),
      P('Notary Public', { after: 160 }),
      P('Doc. No. ______;', { after: 0 }), P('Page No. ______;', { after: 0 }), P('Book No. ______;', { after: 0 }), P('Series of ______;', { after: 0 })
    ]);

    var by = a.submittedBy && a.submittedBy.userId ? M.userById(a.submittedBy.userId) : null;
    var funds = a.fundSource ? a.fundSource + (a.budget ? ', PHP ' + a.budget : '') : '';
    var prefill = { 'Personnel-In-Charge': pic, 'Fees/Funds': funds, 'Destination': str(a.venue),
      'Mobility of Student (vehicles)': a.transportType === 'COLLEGE' ? 'College vehicle' : a.transportType === 'PRIVATE' ? 'Private vehicle' : '',
      'Owned by the HEI': a.transportType === 'COLLEGE' ? 'Yes' : '' };
    var small = { size: 17, center: true, bold: true };
    var report = [
      P('Republic of the Philippines', { center: true, after: 0 }), P('Office of the President', { center: true, after: 0 }),
      P('COMMISSION ON HIGHER EDUCATION', { center: true, bold: true, after: 160 }),
      P('LOCAL OFF-CAMPUS ACTIVITIES', { center: true, bold: true, after: 40 }), P('REPORT OF COMPLIANCE', { center: true, bold: true, after: 160 }),
      P([R('NAME OF HEI: '), R('CAMARINES SUR POLYTECHNIC COLLEGES', { bold: true }), R('          REGION: '), R('V', { bold: true })], { after: 0 }),
      P([R('ADDRESS: '), R('SAN MIGUEL NABUA, CAMARINES SUR', { bold: true })], { after: 120 }),
      P('BASIC INFORMATION:', { bold: true, italics: true, after: 40 }),
      table([[cell(P('PROGRAM NAME', small)), cell(P('COURSE', small)), cell(P('DESTINATION/S AND VENUE', small)),
              cell(P('INCLUSIVE DATES', small)), cell(P('NUMBER OF STUDENTS', small)), cell(P('LIST OF PERSONNEL-IN-CHARGE', small))],
             [cell(P((by && by.program) || org.name || '', { size: 18 })), cell(P(str(a.participantDescription), { size: 18 })), cell(P(str(a.venue), { size: 18 })),
              cell(P(activityDate(a), { size: 18 })), cell(P(str(a.expectedParticipants), { size: 18, center: true })), cell(P(pic, { size: 18 }))]]),
      P('REPORT BEFORE THE ACTIVITY:', { bold: true, before: 160, after: 40 }),
      table([[cell(P('ACTIVITIES', Object.assign({ center: true }, hdr)), { rowSpan: 2, width: 47, vCenter: true }), cell(P('COMPLIANCE', Object.assign({ center: true }, hdr)), { span: 2, width: 53 })],
             [cell(P('YES/NO', Object.assign({ center: true }, hdr)), { width: 11 }), cell(P('REMARKS', Object.assign({ center: true }, hdr)), { width: 42 })]]
        .concat(H.COMPLIANCE_ROWS.map(function (r, i) {
          return [cell(P((i + 1) + '. ' + r, { size: 18, after: 0 })), cell(P('', { after: 0 })), cell(P(prefill[r] || '', { size: 18, after: 0 }))];
        }))),
      sigPair(sigCol('Certified Correct:', pic, 'Personnel-In-Charge'), sigCol('Recommending Approval:', sig.vpaa.name, sig.vpaa.title, true)),
      sigPair(sigCol('Reviewed by:', '', 'Dean or Program Head'), sigCol('Approved by:', sig.president.name, 'President/Head of HEI/Authorized Representative', true))
    ];

    function bullets(items) { return items.map(function (t) { return P('➢  ' + t, { indent: 500, after: 60 }); }); }
    var role = plainLetterhead().concat([
      P('ROLE OF THE PERSONNEL-IN-CHARGE', { bold: true, size: 28, center: true, before: 200, after: 300 }),
      P('Before the off-campus activity', { bold: true, after: 80 })
    ]).concat(bullets(['Orient the students regarding the activity to be conducted.',
      'Check and submit the report of Compliance as stated in the CHED Memo No. 63.']))
      .concat([P('During the off-campus activity', { bold: true, before: 160, after: 80 })])
      .concat(bullets(['Accompany the students from the time they assemble for the off-campus activity to debriefing.',
        'Ensure the provision of the allowable seating capacity of the vehicle/s used.',
        'Ensure that program of activities is properly followed as planned or activities can be adjusted as the need arises.']))
      .concat([P('After the off-campus activity', { bold: true, before: 160, after: 80 })])
      .concat(bullets(['Prepare needed reports.', 'Debriefing of the concerned faculty to students to be able to assess acquisition of learning.']))
      .concat([P(' ', { after: 300 })]).concat(sigCol('Prepared by:', pic, 'Personnel-in-Charge'));

    return [section(order), section(cert), section(report), section(role)];
  }

  /* ---- assemble and save ------------------------------------------------------------ */

  function sections(key, a) {
    if (key === 'slip') { return slip(a); }
    if (key === 'cmo63') { return cmo63(a); }
    if (key === 'checklist') { return checklist(a); }
    return ptc(a, key === 'ptc-off');
  }

  function fileName(key, a) { return F.fileName(key, a).replace(/\.pdf$/, '.docx'); }

  function download(key, a) {
    if (!available()) { return Promise.reject(new Error('Word library not loaded')); }
    var doc = new (D().Document)({
      creator: 'CSPC SASO Activity Monitoring',
      title: F.FORMS[key].label,
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: sections(key, a)
    });
    return D().Packer.toBlob(doc).then(function (blob) {
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName(key, a);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
      return true;
    });
  }

  return { available: available, download: download, fileName: fileName };
})();
