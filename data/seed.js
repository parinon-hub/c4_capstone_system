/* =========================================================================
   seed.js  —  Demonstration data for the prototype.

   IMPORTANT: the five organizations below are SAMPLE organizations created
   for prototype demonstration. They are not a claim about the official
   roster of student organizations at CSPC.

   All dates are generated relative to the day the prototype is opened, so
   the demonstration never goes stale between now and the defense.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.buildSeed = function () {
  'use strict';

  var C = SASO.config;

  /* ---- relative date helpers ------------------------------------------ */
  function shift(days) {
    var d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  function dateOnly(days) {
    return shift(days).slice(0, 10);
  }
  function hoursAgo(h) {
    var d = new Date();
    d.setHours(d.getHours() - h);
    return d.toISOString();
  }

  var uid = 0;
  function nextId(prefix) {
    uid += 1;
    return prefix + '-' + uid;
  }

  /* ---- Organizations --------------------------------------------------- */
  /* ---- Organizations -----------------------------------------------------
     DATA PROVENANCE. Organization names, acronyms and accreditation levels
     are taken from the list of recognized and accredited student
     organizations published by CSPC for academic year 2025-2026. Everything
     else in this file — advisers, officers, activities, requirements,
     comments, terminal reports and compliance records — is fictional and
     created for demonstration only. No real person is named anywhere in this
     prototype, and no real organization's compliance record is represented.
     -------------------------------------------------------------------------- */
  var organizations = [
    { id: 'org-1', name: 'Junior Philippine Computer Society – CSPC Chapter', acronym: 'JPCS – CSPC',
      college: 'College of Computer Studies', adviser: 'Prof. R. Almeda', status: 'Active',
      accreditationLevel: C.ACCREDITATION_LEVEL.LEVEL_II,
      accreditationType: C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY: '2025-2026', accreditationExpires: dateOnly(175) },

    { id: 'org-2', name: 'College of Computer Studies – Student Council', acronym: 'CCS-SC',
      college: 'College of Computer Studies', adviser: 'Prof. M. Bernales', status: 'Active',
      accreditationLevel: C.ACCREDITATION_LEVEL.LEVEL_II,
      accreditationType: C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY: '2025-2026', accreditationExpires: dateOnly(160) },

    { id: 'org-3', name: 'College of Health Sciences – Student Council', acronym: 'CHS-SC',
      college: 'College of Health Sciences', adviser: 'Dr. L. Sarmiento', status: 'Active',
      accreditationLevel: C.ACCREDITATION_LEVEL.LEVEL_III,
      accreditationType: C.ACCREDITATION_TYPE.ACCREDITED,
      accreditationAY: '2025-2026', accreditationExpires: dateOnly(25) },

    { id: 'org-4', name: 'CSPC – Supreme Student Council', acronym: 'CSPC-SSC',
      college: 'Institution-wide', adviser: 'Prof. J. Ocampo', status: 'Active',
      accreditationLevel: C.ACCREDITATION_LEVEL.RECOGNIZED,
      accreditationType: C.ACCREDITATION_TYPE.NOT_APPLICABLE,
      accreditationAY: '2025-2026', accreditationExpires: dateOnly(185) },

    { id: 'org-5', name: 'College of Arts and Sciences – College Student Council', acronym: 'CAS-CSC',
      college: 'College of Arts and Sciences', adviser: 'Prof. D. Villanueva', status: 'Active',
      accreditationLevel: C.ACCREDITATION_LEVEL.LEVEL_I,
      accreditationType: C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY: '2025-2026', accreditationExpires: dateOnly(320) }
  ];

  /* ---- Users (prototype accounts, no real authentication) --------------- */
  var users = [
    { id: 'usr-1', username: 'admin', password: 'admin123', name: 'Ma. Rowena Delfin',
      position: 'Head, Student Affairs and Services Office', role: C.ROLE.SASO, organizationId: null },
    { id: 'usr-2', username: 'aide', password: 'aide123', name: 'Carlo Bermudo',
      position: 'Administrative Aide, SASO', role: C.ROLE.SASO, organizationId: null },
    { id: 'usr-8', username: 'coord', password: 'coord123', name: 'Gerald Peñaflor',
      position: 'Student Activities Coordinator, SASO', role: C.ROLE.SASO, organizationId: null },
    { id: 'usr-9', username: 'records', password: 'records123', name: 'Anna Liza Cordial',
      position: 'Records Officer, SASO', role: C.ROLE.SASO, organizationId: null },
    { id: 'usr-3', username: 'jpcs', password: 'jpcs123', name: 'Kyla Mercado',
      position: 'President, JPCS', role: C.ROLE.ORG, organizationId: 'org-1' },
    { id: 'usr-4', username: 'ccs', password: 'ccs123', name: 'Neil Ramos',
      position: 'Secretary, CCS Student Council', role: C.ROLE.ORG, organizationId: 'org-2' },
    { id: 'usr-5', username: 'chs', password: 'chs123', name: 'Bea Alcantara',
      position: 'President, CHS Student Council', role: C.ROLE.ORG, organizationId: 'org-3' },
    { id: 'usr-6', username: 'ssc', password: 'ssc123', name: 'Miguel Tanaka',
      position: 'President, Supreme Student Council', role: C.ROLE.ORG, organizationId: 'org-4' },
    { id: 'usr-7', username: 'cas', password: 'cas123', name: 'Trisha Lorenzo',
      position: 'Secretary, CAS Student Council', role: C.ROLE.ORG, organizationId: 'org-5' }
  ];

  var activities = [];
  var requirements = [];
  var comments = [];
  var notifications = [];
  var terminalReports = [];
  var statusHistory = [];

  /* ---- builders --------------------------------------------------------- */

  /* states: map of requirement name -> status. Anything not listed uses
     the fallback status. */
  function addRequirements(activityId, fallback, states, remarksMap) {
    C.REQUIREMENT_TEMPLATE.forEach(function (t) {
      var status = (states && states[t.name]) || fallback;
      var submitted = status !== C.REQUIREMENT.NOT_SUBMITTED;
      requirements.push({
        id: nextId('req'),
        activityId: activityId,
        name: t.name,
        mandatory: t.mandatory,
        source: t.source,
        status: status,
        fileName: submitted ? t.name.replace(/[^A-Za-z0-9]+/g, '_') + '.pdf' : null,
        submittedAt: submitted ? hoursAgo(60) : null,
        reviewedAt: (status === C.REQUIREMENT.APPROVED || status === C.REQUIREMENT.NEEDS_REVISION)
          ? hoursAgo(40) : null,
        reviewedBy: (status === C.REQUIREMENT.APPROVED || status === C.REQUIREMENT.NEEDS_REVISION)
          ? 'Ma. Rowena Delfin' : null,
        remarks: (remarksMap && remarksMap[t.name]) || null,
        requestedBySaso: false
      });
    });
  }

  function history(activityId, field, from, to, actorName, actorRole, hrsAgo, remarks) {
    statusHistory.push({
      id: nextId('hist'),
      activityId: activityId,
      field: field,
      fromValue: from,
      toValue: to,
      actorName: actorName,
      actorRole: actorRole,
      remarks: remarks || null,
      timestamp: hoursAgo(hrsAgo)
    });
  }

  function notify(role, orgId, activityId, type, message, hrsAgo, read) {
    notifications.push({
      id: nextId('ntf'),
      recipientRole: role,
      recipientOrgId: orgId,
      activityId: activityId,
      type: type,
      message: message,
      timestamp: hoursAgo(hrsAgo),
      read: !!read
    });
  }

  function activity(o) {
    activities.push({
      id: o.id,
      organizationId: o.org,
      title: o.title,
      type: o.type,
      dateStart: o.dateStart,
      dateEnd: o.dateEnd || o.dateStart,
      timeStart: o.timeStart || '08:00',
      timeEnd: o.timeEnd || '17:00',
      venue: o.venue,
      expectedParticipants: o.participants,
      rationale: o.rationale,
      objectives: o.objectives,
      description: o.description,
      proposalStatus: o.proposalStatus,
      eventStatus: o.eventStatus,
      terminalReportStatus: o.terminalReportStatus,
      createdAt: o.createdAt,
      submittedAt: o.submittedAt || null,
      approvedAt: o.approvedAt || null,
      updatedAt: o.updatedAt
    });
  }

  /* =====================================================================
     ORG 1 — JPCS : 1 approved/upcoming, 1 ongoing, 1 pending with queries
     ===================================================================== */

  activity({
    id: 'act-1', org: 'org-1', title: 'JPCS Leadership Seminar',
    type: 'Seminar / Training', dateStart: dateOnly(12), venue: 'CSPC AVR 2',
    participants: 120,
    rationale: 'Officers of the chapter require structured leadership training before the start of the second semester project cycle.',
    objectives: ['Develop leadership and delegation skills among chapter officers',
                 'Introduce project planning tools for organizational activities',
                 'Strengthen coordination between committees'],
    description: 'A one-day leadership seminar with two invited resource speakers, a workshop block and a planning session.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.UPCOMING,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(300), submittedAt: hoursAgo(290), approvedAt: hoursAgo(180),
    updatedAt: hoursAgo(180)
  });
  addRequirements('act-1', C.REQUIREMENT.APPROVED);
  history('act-1', 'proposalStatus', null, C.PROPOSAL.DRAFT, 'Kyla Mercado', C.ROLE.ORG, 300);
  history('act-1', 'proposalStatus', C.PROPOSAL.DRAFT, C.PROPOSAL.SUBMITTED, 'Kyla Mercado', C.ROLE.ORG, 290);
  history('act-1', 'proposalStatus', C.PROPOSAL.SUBMITTED, C.PROPOSAL.FOR_REVIEW, 'Ma. Rowena Delfin', C.ROLE.SASO, 260);
  history('act-1', 'proposalStatus', C.PROPOSAL.FOR_REVIEW, C.PROPOSAL.APPROVED, 'Ma. Rowena Delfin', C.ROLE.SASO, 180, 'All requirements complete.');
  notify(C.ROLE.ORG, 'org-1', 'act-1', C.NOTIF.PROPOSAL_APPROVED,
    'Activity approved — you may proceed with JPCS Leadership Seminar.', 180, true);

  activity({
    id: 'act-2', org: 'org-1', title: 'JPCS Code Camp 2026',
    type: 'Competition', dateStart: dateOnly(-1), dateEnd: dateOnly(1),
    venue: 'CCS Computer Laboratory 1', participants: 60,
    rationale: 'Members need hands-on competitive programming practice ahead of the regional qualifiers.',
    objectives: ['Provide intensive hands-on coding practice',
                 'Identify members for the regional competition roster'],
    description: 'Three-day competitive programming bootcamp with daily elimination rounds.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.ONGOING,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(600), submittedAt: hoursAgo(590), approvedAt: hoursAgo(400),
    updatedAt: hoursAgo(24)
  });
  addRequirements('act-2', C.REQUIREMENT.APPROVED);
  history('act-2', 'proposalStatus', C.PROPOSAL.FOR_REVIEW, C.PROPOSAL.APPROVED, 'Ma. Rowena Delfin', C.ROLE.SASO, 400);
  history('act-2', 'eventStatus', C.EVENT.UPCOMING, C.EVENT.ONGOING, 'Ma. Rowena Delfin', C.ROLE.SASO, 24);

  activity({
    id: 'act-3', org: 'org-1', title: 'JPCS General Assembly — First Semester',
    type: 'General Assembly', dateStart: dateOnly(21), venue: 'CSPC Gymnasium',
    participants: 300,
    rationale: 'The chapter is required to convene all members to present the annual plan and financial report.',
    objectives: ['Present the approved annual plan of activities',
                 'Elect committee representatives for the academic year'],
    description: 'Regular general assembly with an open forum and committee sign-ups.',
    proposalStatus: C.PROPOSAL.REQUIREMENTS_NEEDED,
    eventStatus: C.EVENT.NOT_APPLICABLE,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(80), submittedAt: hoursAgo(74),
    updatedAt: hoursAgo(20)
  });
  addRequirements('act-3', C.REQUIREMENT.APPROVED, {
    'R5 — Permission to Conduct': C.REQUIREMENT.NOT_SUBMITTED,
    'Adviser Endorsement': C.REQUIREMENT.UNDER_REVIEW,
    'Budget Proposal': C.REQUIREMENT.NOT_SUBMITTED
  });
  history('act-3', 'proposalStatus', C.PROPOSAL.DRAFT, C.PROPOSAL.SUBMITTED, 'Kyla Mercado', C.ROLE.ORG, 74);
  history('act-3', 'proposalStatus', C.PROPOSAL.SUBMITTED, C.PROPOSAL.FOR_REVIEW, 'Ma. Rowena Delfin', C.ROLE.SASO, 48);
  history('act-3', 'proposalStatus', C.PROPOSAL.FOR_REVIEW, C.PROPOSAL.REQUIREMENTS_NEEDED, 'Ma. Rowena Delfin', C.ROLE.SASO, 22,
    'Permission to Conduct still missing.');

  /* the panel's own example thread, seeded verbatim */
  comments.push(
    { id: nextId('cmt'), activityId: 'act-3', senderId: 'usr-1', senderName: 'Ma. Rowena Delfin',
      role: C.ROLE.SASO, message: 'Please upload the signed Permission to Conduct document.',
      requirementId: null, timestamp: hoursAgo(22), readByCounterpart: true },
    { id: nextId('cmt'), activityId: 'act-3', senderId: 'usr-3', senderName: 'Kyla Mercado',
      role: C.ROLE.ORG, message: 'Ma\u2019am, should the document be signed by the organization adviser?',
      requirementId: null, timestamp: hoursAgo(21), readByCounterpart: true },
    { id: nextId('cmt'), activityId: 'act-3', senderId: 'usr-1', senderName: 'Ma. Rowena Delfin',
      role: C.ROLE.SASO, message: 'Yes. Please upload the adviser-signed copy.',
      requirementId: null, timestamp: hoursAgo(20), readByCounterpart: false }
  );
  notify(C.ROLE.ORG, 'org-1', 'act-3', C.NOTIF.REQUIREMENT_REQUESTED,
    'SASO requested: R5 — Permission to Conduct for JPCS General Assembly.', 22, false);
  notify(C.ROLE.ORG, 'org-1', 'act-3', C.NOTIF.COMMENT_POSTED,
    'SASO commented on JPCS General Assembly — First Semester.', 20, false);
  notify(C.ROLE.SASO, null, 'act-3', C.NOTIF.COMMENT_POSTED,
    'JPCS replied on JPCS General Assembly — First Semester.', 21, true);

  /* a completed activity from two months back, so period reports return data */
  activity({
    id: 'act-11', org: 'org-1', title: 'JPCS Tech Talk Series',
    type: 'Seminar / Training', dateStart: dateOnly(-62), venue: 'CCS Lecture Hall',
    participants: 90,
    rationale: 'Members requested exposure to current industry practice from alumni practitioners.',
    objectives: ['Expose members to current industry tools and practices'],
    description: 'Three evening talks delivered by alumni working in the software industry.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.FINISHED,
    terminalReportStatus: C.TERMINAL.ACCEPTED,
    createdAt: hoursAgo(2200), submittedAt: hoursAgo(2180), approvedAt: hoursAgo(2000),
    updatedAt: hoursAgo(1200)
  });
  addRequirements('act-11', C.REQUIREMENT.APPROVED);
  terminalReports.push({
    id: nextId('tr'), activityId: 'act-11', deadline: dateOnly(-47),
    narrative: 'All three talks were delivered as scheduled with an average attendance of 78 members.',
    actualParticipants: 78,
    outcomes: 'Members reported improved awareness of current industry tooling.',
    issues: 'One speaker rescheduled from the first to the third evening.',
    attachments: ['Attendance_Sheets.pdf', 'Photo_Documentation.pdf'],
    submittedAt: hoursAgo(1300), status: C.TERMINAL.ACCEPTED,
    reviewedAt: hoursAgo(1200), remarks: 'Complete. Accepted.'
  });
  history('act-11', 'terminalReportStatus', C.TERMINAL.SUBMITTED, C.TERMINAL.ACCEPTED, 'Ma. Rowena Delfin', C.ROLE.SASO, 1200, 'Complete. Accepted.');

  /* =====================================================================
     ORG 2 — CCS-SC : 1 with missing requirements, 1 completed
     ===================================================================== */

  activity({
    id: 'act-4', org: 'org-2', title: 'CCS Acquaintance Party 2026',
    type: 'Cultural / Socio-civic', dateStart: dateOnly(18), venue: 'CSPC Covered Court',
    participants: 450,
    rationale: 'Incoming first-year students need a formal introduction to the college and its organizations.',
    objectives: ['Introduce first-year students to the college community',
                 'Present the student council programs for the academic year'],
    description: 'Evening acquaintance programme with organization booths and a cultural presentation.',
    proposalStatus: C.PROPOSAL.REQUIREMENTS_NEEDED,
    eventStatus: C.EVENT.NOT_APPLICABLE,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(120), submittedAt: hoursAgo(110),
    updatedAt: hoursAgo(50)
  });
  addRequirements('act-4', C.REQUIREMENT.APPROVED, {
    'R5 — Permission to Conduct': C.REQUIREMENT.NOT_SUBMITTED,
    'Program of Activities': C.REQUIREMENT.NEEDS_REVISION,
    'Budget Proposal': C.REQUIREMENT.NOT_SUBMITTED
  }, {
    'Program of Activities': 'Programme timings overlap with the evening class block. Please revise.'
  });
  history('act-4', 'proposalStatus', C.PROPOSAL.FOR_REVIEW, C.PROPOSAL.REQUIREMENTS_NEEDED, 'Ma. Rowena Delfin', C.ROLE.SASO, 50,
    'Two requirements outstanding.');
  notify(C.ROLE.ORG, 'org-2', 'act-4', C.NOTIF.REQUIREMENT_RETURNED,
    'Program of Activities needs revision for CCS Acquaintance Party 2026.', 50, false);

  activity({
    id: 'act-5', org: 'org-2', title: 'CCS Research Colloquium',
    type: 'Seminar / Training', dateStart: dateOnly(-30), venue: 'CSPC AVR 1',
    participants: 150,
    rationale: 'Graduating students require a venue to present capstone research to a wider audience.',
    objectives: ['Provide a presentation venue for capstone research',
                 'Gather feedback from faculty and industry guests'],
    description: 'Full-day colloquium with parallel presentation sessions.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.FINISHED,
    terminalReportStatus: C.TERMINAL.ACCEPTED,
    createdAt: hoursAgo(1400), submittedAt: hoursAgo(1380), approvedAt: hoursAgo(1100),
    updatedAt: hoursAgo(400)
  });
  addRequirements('act-5', C.REQUIREMENT.APPROVED);
  terminalReports.push({
    id: nextId('tr'), activityId: 'act-5', deadline: dateOnly(-15),
    narrative: 'Twenty-two capstone groups presented across three parallel sessions.',
    actualParticipants: 141,
    outcomes: 'All objectives met. Industry guests provided written feedback to each group.',
    issues: 'None.',
    attachments: ['Attendance_Sheets.pdf', 'Evaluation_Summary.pdf'],
    submittedAt: hoursAgo(460), status: C.TERMINAL.ACCEPTED,
    reviewedAt: hoursAgo(400), remarks: 'Accepted with commendation.'
  });
  history('act-5', 'terminalReportStatus', C.TERMINAL.SUBMITTED, C.TERMINAL.ACCEPTED, 'Ma. Rowena Delfin', C.ROLE.SASO, 400);

  /* =====================================================================
     ORG 3 — CHS-SC : finished, terminal report pending, deadline near
     ===================================================================== */

  activity({
    id: 'act-6', org: 'org-3', title: 'Health Awareness Week',
    type: 'Community Extension', dateStart: dateOnly(-9), dateEnd: dateOnly(-5),
    venue: 'CSPC Quadrangle and Barangay San Jose', participants: 500,
    rationale: 'The college is mandated to conduct annual community health outreach as part of its extension programme.',
    objectives: ['Deliver free basic health screening to the host barangay',
                 'Raise student awareness of preventive health practices'],
    description: 'Week-long health campaign with screening stations, lectures and a community outreach day.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.FINISHED,
    terminalReportStatus: C.TERMINAL.REQUIRED,
    createdAt: hoursAgo(900), submittedAt: hoursAgo(880), approvedAt: hoursAgo(700),
    updatedAt: hoursAgo(120)
  });
  addRequirements('act-6', C.REQUIREMENT.APPROVED);
  terminalReports.push({
    id: nextId('tr'), activityId: 'act-6', deadline: dateOnly(6),
    narrative: null, actualParticipants: null, outcomes: null, issues: null,
    attachments: [], submittedAt: null, status: C.TERMINAL.REQUIRED,
    reviewedAt: null, remarks: null
  });
  history('act-6', 'eventStatus', C.EVENT.ONGOING, C.EVENT.FINISHED, 'Ma. Rowena Delfin', C.ROLE.SASO, 120);
  history('act-6', 'terminalReportStatus', C.TERMINAL.NOT_APPLICABLE, C.TERMINAL.REQUIRED, 'System', C.ROLE.SASO, 120);
  notify(C.ROLE.ORG, 'org-3', 'act-6', C.NOTIF.EVENT_FINISHED,
    'Health Awareness Week has finished. Terminal report due in 6 days.', 120, false);
  notify(C.ROLE.SASO, null, 'act-6', C.NOTIF.EVENT_FINISHED,
    'Health Awareness Week finished — terminal report pending from CHS-SC.', 120, true);

  /* =====================================================================
     ORG 4 — SSC : 1 proposal for review, 1 overdue terminal report
     ===================================================================== */

  activity({
    id: 'act-7', org: 'org-4', title: 'Student Leaders Congress 2026',
    type: 'Seminar / Training', dateStart: dateOnly(34), venue: 'CSPC Function Hall',
    participants: 200,
    rationale: 'Officers of all recognised organizations require a common orientation on institutional policies and reporting requirements.',
    objectives: ['Orient organization officers on SASO documentary requirements',
                 'Align the institution-wide calendar of activities'],
    description: 'Two-day congress with policy sessions and calendar consolidation workshops.',
    proposalStatus: C.PROPOSAL.FOR_REVIEW,
    eventStatus: C.EVENT.NOT_APPLICABLE,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(40), submittedAt: hoursAgo(34),
    updatedAt: hoursAgo(30)
  });
  addRequirements('act-7', C.REQUIREMENT.UNDER_REVIEW, {
    'Activity Proposal Form': C.REQUIREMENT.APPROVED,
    'Rationale': C.REQUIREMENT.APPROVED,
    'Budget Proposal': C.REQUIREMENT.NOT_SUBMITTED
  });
  history('act-7', 'proposalStatus', C.PROPOSAL.DRAFT, C.PROPOSAL.SUBMITTED, 'Miguel Tanaka', C.ROLE.ORG, 34);
  history('act-7', 'proposalStatus', C.PROPOSAL.SUBMITTED, C.PROPOSAL.FOR_REVIEW, 'Ma. Rowena Delfin', C.ROLE.SASO, 30);
  notify(C.ROLE.SASO, null, 'act-7', C.NOTIF.PROPOSAL_SUBMITTED,
    'New proposal submitted by SSC — Student Leaders Congress 2026.', 34, false);
  notify(C.ROLE.ORG, 'org-4', 'act-7', C.NOTIF.PROPOSAL_UNDER_REVIEW,
    'Your proposal is under review.', 30, true);

  activity({
    id: 'act-8', org: 'org-4', title: 'SSC Intramural Sportsfest 2026',
    type: 'Sports / Recreation', dateStart: dateOnly(-40), dateEnd: dateOnly(-36),
    venue: 'CSPC Sports Complex', participants: 1200,
    rationale: 'The annual intramurals are a mandated institutional activity promoting student wellness and college camaraderie.',
    objectives: ['Promote physical wellness and sportsmanship',
                 'Strengthen inter-college camaraderie'],
    description: 'Five-day institution-wide intramural meet across nine sporting events.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.FINISHED,
    terminalReportStatus: C.TERMINAL.OVERDUE,
    createdAt: hoursAgo(1800), submittedAt: hoursAgo(1780), approvedAt: hoursAgo(1500),
    updatedAt: hoursAgo(840)
  });
  addRequirements('act-8', C.REQUIREMENT.APPROVED);
  terminalReports.push({
    id: nextId('tr'), activityId: 'act-8', deadline: dateOnly(-25),
    narrative: null, actualParticipants: null, outcomes: null, issues: null,
    attachments: [], submittedAt: null, status: C.TERMINAL.OVERDUE,
    reviewedAt: null, remarks: null
  });
  history('act-8', 'eventStatus', C.EVENT.ONGOING, C.EVENT.FINISHED, 'Ma. Rowena Delfin', C.ROLE.SASO, 840);
  history('act-8', 'terminalReportStatus', C.TERMINAL.NOT_APPLICABLE, C.TERMINAL.REQUIRED, 'System', C.ROLE.SASO, 840);
  notify(C.ROLE.SASO, null, 'act-8', C.NOTIF.TR_OVERDUE,
    'SSC terminal report for Intramural Sportsfest 2026 is overdue.', 200, false);
  notify(C.ROLE.ORG, 'org-4', 'act-8', C.NOTIF.TR_OVERDUE,
    'Terminal report for SSC Intramural Sportsfest 2026 is overdue.', 200, false);

  /* =====================================================================
     ORG 5 — CAS-SC : 1 completed, 1 postponed
     ===================================================================== */

  activity({
    id: 'act-9', org: 'org-5', title: 'CAS Literary Night',
    type: 'Cultural / Socio-civic', dateStart: dateOnly(-21), venue: 'CSPC AVR 2',
    participants: 180,
    rationale: 'The college seeks a venue for student writers to present original work to the campus community.',
    objectives: ['Showcase original student literary work',
                 'Encourage participation in the campus publication'],
    description: 'Evening of readings, spoken word performances and an awarding ceremony.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.FINISHED,
    terminalReportStatus: C.TERMINAL.ACCEPTED,
    createdAt: hoursAgo(1100), submittedAt: hoursAgo(1080), approvedAt: hoursAgo(900),
    updatedAt: hoursAgo(300)
  });
  addRequirements('act-9', C.REQUIREMENT.APPROVED);
  terminalReports.push({
    id: nextId('tr'), activityId: 'act-9', deadline: dateOnly(-6),
    narrative: 'Fourteen student writers presented across two sets. Attendance reached 165.',
    actualParticipants: 165,
    outcomes: 'Six new contributors signed up for the campus publication.',
    issues: 'Programme ran thirty minutes past the approved end time.',
    attachments: ['Attendance_Sheets.pdf', 'Programme.pdf'],
    submittedAt: hoursAgo(340), status: C.TERMINAL.ACCEPTED,
    reviewedAt: hoursAgo(300), remarks: 'Accepted. Please observe approved end times in future activities.'
  });
  history('act-9', 'terminalReportStatus', C.TERMINAL.SUBMITTED, C.TERMINAL.ACCEPTED, 'Ma. Rowena Delfin', C.ROLE.SASO, 300);

  activity({
    id: 'act-10', org: 'org-5', title: 'CAS Career Talk',
    type: 'Seminar / Training', dateStart: dateOnly(40), venue: 'CSPC AVR 1',
    participants: 220,
    rationale: 'Graduating students require guidance on employment options and further studies within their disciplines.',
    objectives: ['Present career pathways for arts and sciences graduates',
                 'Connect students with alumni practitioners'],
    description: 'Half-day career orientation with an alumni panel and a jobs fair corner.',
    proposalStatus: C.PROPOSAL.APPROVED,
    eventStatus: C.EVENT.POSTPONED,
    terminalReportStatus: C.TERMINAL.NOT_APPLICABLE,
    createdAt: hoursAgo(700), submittedAt: hoursAgo(690), approvedAt: hoursAgo(520),
    updatedAt: hoursAgo(96)
  });
  addRequirements('act-10', C.REQUIREMENT.APPROVED);
  history('act-10', 'eventStatus', C.EVENT.UPCOMING, C.EVENT.POSTPONED, 'Ma. Rowena Delfin', C.ROLE.SASO, 96,
    'Moved at the request of the college dean due to a schedule conflict.');

  /* ---- assorted older notifications so the centre is not thin ----------- */
  notify(C.ROLE.SASO, null, 'act-1', C.NOTIF.PROPOSAL_APPROVED, 'You approved JPCS Leadership Seminar.', 180, true);
  notify(C.ROLE.SASO, null, 'act-4', C.NOTIF.REQUIREMENT_SUBMITTED, 'CCS-SC submitted Adviser Endorsement.', 60, true);
  notify(C.ROLE.SASO, null, 'act-6', C.NOTIF.TR_DUE_SOON, 'CHS-SC terminal report due in 6 days.', 24, false);
  notify(C.ROLE.ORG, 'org-5', 'act-10', C.NOTIF.PROPOSAL_APPROVED, 'CAS Career Talk has been postponed by SASO.', 96, true);
  notify(C.ROLE.ORG, 'org-2', 'act-5', C.NOTIF.TR_ACCEPTED, 'Terminal report accepted — CCS Research Colloquium is completed.', 400, true);

  return {
    meta: { seededAt: new Date().toISOString(), version: 1 },
    organizations: organizations,
    users: users,
    activities: activities,
    requirements: requirements,
    comments: comments,
    notifications: notifications,
    terminalReports: terminalReports,
    statusHistory: statusHistory
  };
};
