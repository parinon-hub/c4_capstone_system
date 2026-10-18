/* =========================================================================
   seed.js  —  Demonstration data.

   DATA PROVENANCE
   Organization names, acronyms and accreditation levels are taken from the
   SASO List of Recognized and Accredited Student Organizations, AY 2025-2026.
   Requirement names, activity categories, venue types and the five-day
   reporting deadline are taken from documents and interview answers supplied
   by SASO.

   Everything else is fictional: advisers, officers, activity titles,
   submission records, comments and compliance states are invented for
   demonstration. No real person is named, and no real organization's
   compliance record is represented.

   Dates are generated relative to the day the prototype is opened, so the
   demonstration does not go stale.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.buildSeed = function () {
  'use strict';

  var C = SASO.config;

  function shift(d) { var x = new Date(); x.setHours(9,0,0,0); x.setDate(x.getDate()+d); return x.toISOString(); }
  function dateOnly(d) { return shift(d).slice(0,10); }
  function hoursAgo(h) { var x = new Date(); x.setHours(x.getHours()-h); return x.toISOString(); }

  var uid = 0;
  function nextId(p) { uid += 1; return p + '-' + uid; }

  /* ---- Organizations (real names and levels; fictional advisers) ---------- */
  var organizations = [
    { id:'org-1', name:'Junior Philippine Computer Society - CSPC Chapter', acronym:'JPCS - CSPC',
      entityType:C.ENTITY.STUDENT_ORG, college:'College of Computer Studies', adviser:'Prof. R. Almeda',
      accreditationLevel:C.ACCREDITATION_LEVEL.LEVEL_II, accreditationType:C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY:'2025-2026', accreditationExpires:dateOnly(175) },

    { id:'org-2', name:'College of Computer Studies - Student Council', acronym:'CCS-SC',
      entityType:C.ENTITY.STUDENT_ORG, college:'College of Computer Studies', adviser:'Prof. M. Bernales',
      accreditationLevel:C.ACCREDITATION_LEVEL.LEVEL_II, accreditationType:C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY:'2025-2026', accreditationExpires:dateOnly(160) },

    { id:'org-3', name:'College of Health Sciences - Student Council', acronym:'CHS-SC',
      entityType:C.ENTITY.STUDENT_ORG, college:'College of Health Sciences', adviser:'Dr. L. Sarmiento',
      accreditationLevel:C.ACCREDITATION_LEVEL.LEVEL_III, accreditationType:C.ACCREDITATION_TYPE.ACCREDITED,
      accreditationAY:'2025-2026', accreditationExpires:dateOnly(25) },

    { id:'org-4', name:'CSPC - Supreme Student Council', acronym:'CSPC-SSC',
      entityType:C.ENTITY.STUDENT_ORG, college:'Institution-wide', adviser:'Prof. J. Ocampo',
      accreditationLevel:C.ACCREDITATION_LEVEL.RECOGNIZED, accreditationType:C.ACCREDITATION_TYPE.NOT_APPLICABLE,
      accreditationAY:'2025-2026', accreditationExpires:dateOnly(185) },

    { id:'org-5', name:'College of Arts and Sciences - College Student Council', acronym:'CAS-CSC',
      entityType:C.ENTITY.STUDENT_ORG, college:'College of Arts and Sciences', adviser:'Prof. D. Villanueva',
      accreditationLevel:C.ACCREDITATION_LEVEL.LEVEL_I, accreditationType:C.ACCREDITATION_TYPE.RE_ACCREDITED,
      accreditationAY:'2025-2026', accreditationExpires:dateOnly(320) }
  ];

  var users = [
    { id:'usr-1', username:'admin', password:'admin123', name:'M. Delfin',
      position:'Head, Student Affairs and Services Office', role:C.ROLE.SASO, organizationId:null },
    { id:'usr-2', username:'aide', password:'aide123', name:'C. Bermudo',
      position:'Administrative Aide II, SASO', role:C.ROLE.SASO, organizationId:null },
    { id:'usr-8', username:'coord', password:'coord123', name:'G. Peñaflor',
      position:'Student Activities Coordinator, SASO', role:C.ROLE.SASO, organizationId:null },
    { id:'usr-9', username:'records', password:'records123', name:'A. Cordial',
      position:'Records Officer, SASO', role:C.ROLE.SASO, organizationId:null },

    { id:'usr-3', username:'jpcs', password:'jpcs123', name:'K. Mercado', position:'President, JPCS - CSPC',      role:C.ROLE.ORG, organizationId:'org-1' },
    { id:'usr-4', username:'ccs',  password:'ccs123',  name:'N. Ramos',   position:'Secretary, CCS-SC',           role:C.ROLE.ORG, organizationId:'org-2' },
    { id:'usr-5', username:'chs',  password:'chs123',  name:'B. Alcantara',position:'President, CHS-SC',          role:C.ROLE.ORG, organizationId:'org-3' },
    { id:'usr-6', username:'ssc',  password:'ssc123',  name:'M. Tanaka',  position:'President, CSPC-SSC',         role:C.ROLE.ORG, organizationId:'org-4' },
    { id:'usr-7', username:'cas',  password:'cas123',  name:'T. Lorenzo', position:'Secretary, CAS-CSC',          role:C.ROLE.ORG, organizationId:'org-5' }
  ];

  var activities = [], requirements = [], comments = [],
      notifications = [], statusHistory = [], routing = [];

  /* ---- builders ----------------------------------------------------------- */

  function addRequirements(activityId, venueType, phase, fallback, states, remarksMap) {
    var tpl;
    if (phase === C.PHASE.PRE_APPROVAL) {
      tpl = C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_COMMON.slice();
      if (venueType === C.VENUE.OFF_CAMPUS) {
        tpl = tpl.concat(C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_OFF_CAMPUS_EXTRA);
      }
    } else {
      tpl = C.REQUIREMENT_TEMPLATES.POST_ACTIVITY.slice();
    }

    tpl.forEach(function (t) {
      var status = (states && states[t.name]) || fallback;
      var submitted = status !== C.REQUIREMENT.NOT_SUBMITTED;
      requirements.push({
        id: nextId('req'), activityId: activityId, phase: phase,
        name: t.name, mandatory: t.mandatory, source: t.source, status: status,
        fileName: submitted ? t.name.replace(/[^A-Za-z0-9]+/g,'_') + '.pdf' : null,
        submittedAt: submitted ? hoursAgo(60) : null,
        reviewedAt: (status===C.REQUIREMENT.APPROVED || status===C.REQUIREMENT.NEEDS_REVISION) ? hoursAgo(40) : null,
        reviewedBy: (status===C.REQUIREMENT.APPROVED || status===C.REQUIREMENT.NEEDS_REVISION) ? 'M. Delfin' : null,
        remarks: (remarksMap && remarksMap[t.name]) || null,
        requestedBySaso: false
      });
    });
  }

  function history(activityId, field, from, to, actor, role, hrs, remarks) {
    statusHistory.push({ id:nextId('hist'), activityId:activityId, field:field,
      fromValue:from, toValue:to, actorName:actor, actorRole:role,
      remarks:remarks||null, timestamp:hoursAgo(hrs) });
  }

  /* One row per office in the approval route. SASO acts inside the system;
     the VPAA and President stages are recorded, not enacted. */
  function route(activityId, office, transmittedHrs, decidedHrs, decision, remarks) {
    routing.push({ id:nextId('rt'), activityId:activityId, office:office,
      transmittedAt: transmittedHrs===null ? null : hoursAgo(transmittedHrs),
      decidedAt: decidedHrs===null ? null : hoursAgo(decidedHrs),
      decision: decision || null, remarks: remarks || null });
  }

  function notify(role, orgId, activityId, type, message, hrs, read) {
    notifications.push({ id:nextId('ntf'), recipientRole:role, recipientOrgId:orgId,
      activityId:activityId, type:type, message:message,
      timestamp:hoursAgo(hrs), read:!!read });
  }

  function activity(o) {
    activities.push({
      id:o.id, organizationId:o.org, title:o.title, category:o.category,
      venueType:o.venueType, venue:o.venue,
      dateStart:o.dateStart, dateEnd:o.dateEnd||o.dateStart,
      timeStart:o.timeStart||'08:00', timeEnd:o.timeEnd||'17:00',
      expectedParticipants:o.participants, participantDescription:o.participantDescription,
      rationale:o.rationale, objectives:o.objectives, description:o.description,
      budget:o.budget||null, fundSource:o.fundSource||null,
      proposalStatus:o.proposalStatus, eventStatus:o.eventStatus,
      reportDeadline:o.reportDeadline||null,
      createdAt:o.createdAt, submittedAt:o.submittedAt||null,
      approvedAt:o.approvedAt||null, updatedAt:o.updatedAt
    });
  }

  var APPROVED_ALL = C.REQUIREMENT.APPROVED;

  /* ===================== JPCS - CSPC ====================================== */

  activity({ id:'act-1', org:'org-1', title:'JPCS Leadership Seminar', category:'Leadership',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC Auditorium', dateStart:dateOnly(12), participants:120,
    participantDescription:'CCS students', budget:'8,500', fundSource:'JPCS - CSPC Chapter Fund',
    rationale:'Chapter officers require structured leadership training before the second semester project cycle.',
    objectives:['Develop leadership and delegation skills among chapter officers','Introduce project planning tools'],
    description:'One-day seminar with two resource speakers and a planning workshop.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.UPCOMING,
    createdAt:hoursAgo(300), submittedAt:hoursAgo(290), approvedAt:hoursAgo(120), updatedAt:hoursAgo(120) });
  addRequirements('act-1', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  route('act-1', C.OFFICE.SASO, 280, 240, 'Endorsed');
  route('act-1', C.OFFICE.VPAA, 240, 180, 'Approved');
  route('act-1', C.OFFICE.PRESIDENT, 180, 120, 'Approved');
  history('act-1','proposalStatus',C.PROPOSAL.DRAFT,C.PROPOSAL.SUBMITTED,'K. Mercado',C.ROLE.ORG,290);
  history('act-1','proposalStatus',C.PROPOSAL.FOR_REVIEW,C.PROPOSAL.SASO_ENDORSED,'M. Delfin',C.ROLE.SASO,240,'Requirements complete. Endorsed to VPAA.');
  history('act-1','proposalStatus',C.PROPOSAL.WITH_PRESIDENT,C.PROPOSAL.APPROVED,'M. Delfin',C.ROLE.SASO,120,'Approval received from the President\u2019s Office.');
  notify(C.ROLE.ORG,'org-1','act-1',C.NOTIF.PROPOSAL_APPROVED,'Activity approved \u2014 you may proceed with JPCS Leadership Seminar.',120,true);

  activity({ id:'act-2', org:'org-1', title:'JPCS Code Camp 2026', category:'Life Skills',
    venueType:C.VENUE.ON_CAMPUS, venue:'CCS Computer Laboratory 1', dateStart:dateOnly(-1), dateEnd:dateOnly(1),
    participants:60, participantDescription:'CCS students', budget:'4,200', fundSource:'JPCS - CSPC Chapter Fund',
    rationale:'Members need hands-on competitive programming practice before the regional qualifiers.',
    objectives:['Provide intensive coding practice','Identify members for the regional roster'],
    description:'Three-day bootcamp with daily elimination rounds.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.ONGOING,
    createdAt:hoursAgo(600), submittedAt:hoursAgo(590), approvedAt:hoursAgo(400), updatedAt:hoursAgo(24) });
  addRequirements('act-2', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  route('act-2', C.OFFICE.SASO, 580, 540, 'Endorsed');
  route('act-2', C.OFFICE.VPAA, 540, 470, 'Approved');
  route('act-2', C.OFFICE.PRESIDENT, 470, 400, 'Approved');
  history('act-2','eventStatus',C.EVENT.UPCOMING,C.EVENT.ONGOING,'M. Delfin',C.ROLE.SASO,24);

  activity({ id:'act-3', org:'org-1', title:'JPCS General Assembly \u2014 Second Semester', category:'Leadership',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC Gymnasium', dateStart:dateOnly(21), participants:300,
    participantDescription:'All JPCS members', budget:'3,100', fundSource:'JPCS - CSPC Chapter Fund',
    rationale:'The chapter must convene all members to present the annual plan and financial report.',
    objectives:['Present the approved annual plan','Elect committee representatives'],
    description:'Regular general assembly with open forum and committee sign-ups.',
    proposalStatus:C.PROPOSAL.REQUIREMENTS_NEEDED, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(80), submittedAt:hoursAgo(74), updatedAt:hoursAgo(20) });
  addRequirements('act-3', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL, {
    'Permission to Conduct (PTC)': C.REQUIREMENT.NOT_SUBMITTED,
    'List of Participants (year level, section)': C.REQUIREMENT.UNDER_REVIEW,
    'Excuse Letter': C.REQUIREMENT.NOT_SUBMITTED
  });
  route('act-3', C.OFFICE.SASO, 70, null, null);
  history('act-3','proposalStatus',C.PROPOSAL.DRAFT,C.PROPOSAL.SUBMITTED,'K. Mercado',C.ROLE.ORG,74);
  history('act-3','proposalStatus',C.PROPOSAL.FOR_REVIEW,C.PROPOSAL.REQUIREMENTS_NEEDED,'M. Delfin',C.ROLE.SASO,22,'Permission to Conduct still missing.');
  comments.push(
    { id:nextId('cmt'), activityId:'act-3', senderId:'usr-1', senderName:'M. Delfin', role:C.ROLE.SASO,
      message:'Please upload the signed Permission to Conduct document.', requirementId:null,
      timestamp:hoursAgo(22), readByCounterpart:true },
    { id:nextId('cmt'), activityId:'act-3', senderId:'usr-3', senderName:'K. Mercado', role:C.ROLE.ORG,
      message:'Ma\u2019am, should the document be signed by the organization adviser?', requirementId:null,
      timestamp:hoursAgo(21), readByCounterpart:true },
    { id:nextId('cmt'), activityId:'act-3', senderId:'usr-1', senderName:'M. Delfin', role:C.ROLE.SASO,
      message:'Yes. Please upload the adviser-signed copy.', requirementId:null,
      timestamp:hoursAgo(20), readByCounterpart:false }
  );
  notify(C.ROLE.ORG,'org-1','act-3',C.NOTIF.REQUIREMENT_REQUESTED,'SASO requested: Permission to Conduct (PTC).',22,false);
  notify(C.ROLE.ORG,'org-1','act-3',C.NOTIF.COMMENT_POSTED,'SASO commented on JPCS General Assembly.',20,false);
  notify(C.ROLE.SASO,null,'act-3',C.NOTIF.COMMENT_POSTED,'JPCS - CSPC replied on JPCS General Assembly.',21,true);

  activity({ id:'act-11', org:'org-1', title:'JPCS Industry Immersion Visit', category:'Life Skills',
    venueType:C.VENUE.OFF_CAMPUS, venue:'Naga City IT Park', dateStart:dateOnly(-62), participants:45,
    participantDescription:'Third and fourth year CCS students', budget:'22,000', fundSource:'JPCS Fund, participant share',
    rationale:'Members requested exposure to current industry practice from local practitioners.',
    objectives:['Expose members to current industry tooling and practice'],
    description:'One-day company visit with three briefing sessions.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.FINISHED,
    reportDeadline:dateOnly(-57),
    createdAt:hoursAgo(2200), submittedAt:hoursAgo(2180), approvedAt:hoursAgo(1900), updatedAt:hoursAgo(1200) });
  addRequirements('act-11', C.VENUE.OFF_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  addRequirements('act-11', C.VENUE.OFF_CAMPUS, C.PHASE.POST_ACTIVITY, APPROVED_ALL);
  route('act-11', C.OFFICE.SASO, 2150, 2100, 'Endorsed');
  route('act-11', C.OFFICE.VPAA, 2100, 2000, 'Approved');
  route('act-11', C.OFFICE.PRESIDENT, 2000, 1900, 'Approved');
  history('act-11','proposalStatus',C.PROPOSAL.WITH_PRESIDENT,C.PROPOSAL.APPROVED,'M. Delfin',C.ROLE.SASO,1900);

  /* ===================== CCS-SC =========================================== */

  activity({ id:'act-4', org:'org-2', title:'CCS Acquaintance Party 2026', category:'Socio-Civic',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC Covered Court', dateStart:dateOnly(18), participants:450,
    participantDescription:'CCS students, all year levels', budget:'31,000', fundSource:'CCS-SC Fund',
    rationale:'First-year students require a formal introduction to the college and its organizations.',
    objectives:['Introduce first-year students to the college community','Present council programs for the year'],
    description:'Evening programme with organization booths and a cultural presentation.',
    proposalStatus:C.PROPOSAL.WITH_VPAA, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(300), submittedAt:hoursAgo(290), updatedAt:hoursAgo(96) });
  addRequirements('act-4', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  route('act-4', C.OFFICE.SASO, 280, 100, 'Endorsed', 'Requirements complete.');
  route('act-4', C.OFFICE.VPAA, 96, null, null);
  history('act-4','proposalStatus',C.PROPOSAL.FOR_REVIEW,C.PROPOSAL.SASO_ENDORSED,'M. Delfin',C.ROLE.SASO,100,'Endorsed to VPAA.');
  history('act-4','proposalStatus',C.PROPOSAL.SASO_ENDORSED,C.PROPOSAL.WITH_VPAA,'C. Bermudo',C.ROLE.SASO,96,'Transmitted to the Office of the VPAA.');
  notify(C.ROLE.ORG,'org-2','act-4',C.NOTIF.ROUTED,'Your proposal has been endorsed by SASO and is now with the VPAA.',96,false);

  activity({ id:'act-5', org:'org-2', title:'CCS Research Colloquium', category:'Life Skills',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC AVR 1', dateStart:dateOnly(-30), participants:150,
    participantDescription:'Graduating CCS students and faculty', budget:'6,400', fundSource:'CCS-SC Fund',
    rationale:'Graduating students require a venue to present capstone research to a wider audience.',
    objectives:['Provide a presentation venue for capstone research','Gather feedback from faculty and guests'],
    description:'Full-day colloquium with parallel presentation sessions.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.FINISHED, reportDeadline:dateOnly(-25),
    createdAt:hoursAgo(1400), submittedAt:hoursAgo(1380), approvedAt:hoursAgo(1000), updatedAt:hoursAgo(400) });
  addRequirements('act-5', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  addRequirements('act-5', C.VENUE.ON_CAMPUS, C.PHASE.POST_ACTIVITY, APPROVED_ALL);
  route('act-5', C.OFFICE.SASO, 1350, 1300, 'Endorsed');
  route('act-5', C.OFFICE.VPAA, 1300, 1150, 'Approved');
  route('act-5', C.OFFICE.PRESIDENT, 1150, 1000, 'Approved');
  history('act-5','eventStatus',C.EVENT.ONGOING,C.EVENT.FINISHED,'M. Delfin',C.ROLE.SASO,700);

  /* ===================== CHS-SC =========================================== */

  activity({ id:'act-6', org:'org-3', title:'Health Awareness Week', category:'Volunteer',
    venueType:C.VENUE.OFF_CAMPUS, venue:'CSPC Quadrangle and Barangay San Jose',
    dateStart:dateOnly(-9), dateEnd:dateOnly(-5), participants:500,
    participantDescription:'CHS students and barangay residents', budget:'48,000', fundSource:'CHS-SC Fund, external partners',
    rationale:'The college conducts annual community health outreach as part of its extension programme.',
    objectives:['Deliver free basic health screening to the host barangay','Raise awareness of preventive health practices'],
    description:'Week-long health campaign with screening stations and a community outreach day.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.FINISHED, reportDeadline:dateOnly(0),
    createdAt:hoursAgo(900), submittedAt:hoursAgo(880), approvedAt:hoursAgo(600), updatedAt:hoursAgo(120) });
  addRequirements('act-6', C.VENUE.OFF_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  addRequirements('act-6', C.VENUE.OFF_CAMPUS, C.PHASE.POST_ACTIVITY, C.REQUIREMENT.NOT_SUBMITTED, {
    'Narrative Report with Documentation': C.REQUIREMENT.UNDER_REVIEW
  });
  route('act-6', C.OFFICE.SASO, 860, 800, 'Endorsed');
  route('act-6', C.OFFICE.VPAA, 800, 700, 'Approved');
  route('act-6', C.OFFICE.PRESIDENT, 700, 600, 'Approved');
  history('act-6','eventStatus',C.EVENT.ONGOING,C.EVENT.FINISHED,'M. Delfin',C.ROLE.SASO,120);
  notify(C.ROLE.ORG,'org-3','act-6',C.NOTIF.EVENT_FINISHED,'Health Awareness Week has finished. Post-activity reports are due today.',120,false);
  notify(C.ROLE.SASO,null,'act-6',C.NOTIF.EVENT_FINISHED,'Health Awareness Week finished \u2014 reports pending from CHS-SC.',120,true);

  /* ===================== CSPC-SSC ========================================= */

  activity({ id:'act-7', org:'org-4', title:'Student Leaders Congress 2026', category:'Leadership',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC Auditorium', dateStart:dateOnly(34), participants:200,
    participantDescription:'Officers of recognized organizations', budget:'18,700', fundSource:'CSPC-SSC Fund',
    rationale:'Officers of all recognized organizations require a common orientation on institutional policies and reporting requirements.',
    objectives:['Orient officers on SASO documentary requirements','Align the institution-wide calendar of activities'],
    description:'Two-day congress with policy sessions and calendar consolidation workshops.',
    proposalStatus:C.PROPOSAL.FOR_REVIEW, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(40), submittedAt:hoursAgo(34), updatedAt:hoursAgo(30) });
  addRequirements('act-7', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, C.REQUIREMENT.UNDER_REVIEW, {
    'Activity Proposal': C.REQUIREMENT.APPROVED,
    'Permission to Conduct (PTC)': C.REQUIREMENT.APPROVED,
    'Excuse Letter': C.REQUIREMENT.NOT_SUBMITTED
  });
  route('act-7', C.OFFICE.SASO, 32, null, null);
  history('act-7','proposalStatus',C.PROPOSAL.SUBMITTED,C.PROPOSAL.FOR_REVIEW,'M. Delfin',C.ROLE.SASO,30);
  notify(C.ROLE.SASO,null,'act-7',C.NOTIF.PROPOSAL_SUBMITTED,'New proposal submitted by CSPC-SSC \u2014 Student Leaders Congress 2026.',34,false);

  activity({ id:'act-8', org:'org-4', title:'SSC Intramural Sportsfest 2026', category:'Sports',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC Sports Complex', dateStart:dateOnly(-40), dateEnd:dateOnly(-36),
    participants:1200, participantDescription:'All colleges', budget:'145,000', fundSource:'CSPC-SSC Fund',
    rationale:'The annual intramurals are a mandated institutional activity promoting student wellness.',
    objectives:['Promote physical wellness and sportsmanship','Strengthen inter-college camaraderie'],
    description:'Five-day institution-wide meet across nine sporting events.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.FINISHED, reportDeadline:dateOnly(-31),
    createdAt:hoursAgo(1800), submittedAt:hoursAgo(1780), approvedAt:hoursAgo(1400), updatedAt:hoursAgo(840) });
  addRequirements('act-8', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  addRequirements('act-8', C.VENUE.ON_CAMPUS, C.PHASE.POST_ACTIVITY, C.REQUIREMENT.NOT_SUBMITTED);
  route('act-8', C.OFFICE.SASO, 1750, 1700, 'Endorsed');
  route('act-8', C.OFFICE.VPAA, 1700, 1550, 'Approved');
  route('act-8', C.OFFICE.PRESIDENT, 1550, 1400, 'Approved');
  history('act-8','eventStatus',C.EVENT.ONGOING,C.EVENT.FINISHED,'M. Delfin',C.ROLE.SASO,840);
  notify(C.ROLE.SASO,null,'act-8',C.NOTIF.TR_OVERDUE,'CSPC-SSC post-activity reports for Intramural Sportsfest 2026 are overdue.',200,false);
  notify(C.ROLE.ORG,'org-4','act-8',C.NOTIF.TR_OVERDUE,'Post-activity reports for SSC Intramural Sportsfest 2026 are overdue.',200,false);

  /* ===================== CAS-CSC ========================================== */

  activity({ id:'act-9', org:'org-5', title:'CAS Literary Night', category:'Student Publication',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC AVR 2', dateStart:dateOnly(-21), participants:180,
    participantDescription:'CAS students', budget:'5,200', fundSource:'CAS-CSC Fund',
    rationale:'The college seeks a venue for student writers to present original work.',
    objectives:['Showcase original student literary work','Encourage participation in the campus publication'],
    description:'Evening of readings, spoken word performances and awarding.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.FINISHED, reportDeadline:dateOnly(-16),
    createdAt:hoursAgo(1100), submittedAt:hoursAgo(1080), approvedAt:hoursAgo(800), updatedAt:hoursAgo(300) });
  addRequirements('act-9', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  addRequirements('act-9', C.VENUE.ON_CAMPUS, C.PHASE.POST_ACTIVITY, APPROVED_ALL);
  route('act-9', C.OFFICE.SASO, 1050, 1000, 'Endorsed');
  route('act-9', C.OFFICE.VPAA, 1000, 900, 'Approved');
  route('act-9', C.OFFICE.PRESIDENT, 900, 800, 'Approved');
  history('act-9','eventStatus',C.EVENT.ONGOING,C.EVENT.FINISHED,'M. Delfin',C.ROLE.SASO,500);

  activity({ id:'act-10', org:'org-5', title:'CAS Career Talk', category:'Life Skills',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC AVR 1', dateStart:dateOnly(40), participants:220,
    participantDescription:'Graduating CAS students', budget:'9,800', fundSource:'CAS-CSC Fund',
    rationale:'Graduating students require guidance on employment options and further studies.',
    objectives:['Present career pathways for arts and sciences graduates','Connect students with alumni practitioners'],
    description:'Half-day career orientation with an alumni panel.',
    proposalStatus:C.PROPOSAL.APPROVED, eventStatus:C.EVENT.POSTPONED,
    createdAt:hoursAgo(700), submittedAt:hoursAgo(690), approvedAt:hoursAgo(450), updatedAt:hoursAgo(96) });
  addRequirements('act-10', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  route('act-10', C.OFFICE.SASO, 660, 620, 'Endorsed');
  route('act-10', C.OFFICE.VPAA, 620, 530, 'Approved');
  route('act-10', C.OFFICE.PRESIDENT, 530, 450, 'Approved');
  history('act-10','eventStatus',C.EVENT.UPCOMING,C.EVENT.POSTPONED,'M. Delfin',C.ROLE.SASO,96,'Moved at the request of the college dean.');

  activity({ id:'act-12', org:'org-5', title:'CAS Community Outreach Program', category:'Volunteer',
    venueType:C.VENUE.OFF_CAMPUS, venue:'Barangay Sto. Domingo, Nabua', dateStart:dateOnly(28), participants:90,
    participantDescription:'CAS-CSC officers and volunteers', budget:'14,300', fundSource:'CAS-CSC Fund',
    rationale:'The council conducts an annual outreach as part of its socio-civic commitments.',
    objectives:['Deliver school supplies and a literacy session to the host barangay'],
    description:'One-day outreach with a literacy session and distribution.',
    proposalStatus:C.PROPOSAL.WITH_PRESIDENT, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(400), submittedAt:hoursAgo(380), updatedAt:hoursAgo(48) });
  addRequirements('act-12', C.VENUE.OFF_CAMPUS, C.PHASE.PRE_APPROVAL, APPROVED_ALL);
  route('act-12', C.OFFICE.SASO, 370, 200, 'Endorsed', 'CMO 63 documents complete.');
  route('act-12', C.OFFICE.VPAA, 200, 60, 'Approved');
  route('act-12', C.OFFICE.PRESIDENT, 48, null, null);
  history('act-12','proposalStatus',C.PROPOSAL.WITH_VPAA,C.PROPOSAL.WITH_PRESIDENT,'C. Bermudo',C.ROLE.SASO,48,'Transmitted to the Office of the President.');
  notify(C.ROLE.ORG,'org-5','act-12',C.NOTIF.ROUTED,'Your proposal is now with the President\u2019s Office.',48,false);

  /* ---- post-activity (terminal) report submissions -------------------------
     Worked examples of organizations filing their reports after an activity:
     CCS-SC on time and accepted, CAS-CSC accepted after one returned report,
     JPCS accepted for an off-campus visit, and CHS-SC mid-review on the day
     the reports are due. CSPC-SSC (act-8) is left as the overdue case. */

  function reqFor(activityId, name) {
    return requirements.filter(function (r) {
      return r.activityId === activityId && r.phase === C.PHASE.POST_ACTIVITY && r.name === name;
    })[0];
  }

  /* Overwrites the generic post-activity records with what was filed.
     Each entry: file, submitted (hours ago), status, reviewed (hours ago),
     by (SASO reviewer), remarks (SASO's note to the organization). */
  function fileReports(activityId, entries) {
    Object.keys(entries).forEach(function (name) {
      var e = entries[name], r = reqFor(activityId, name);
      r.status = e.status;
      r.fileName = e.file;
      r.submittedAt = hoursAgo(e.submitted);
      r.reviewedAt = e.reviewed ? hoursAgo(e.reviewed) : null;
      r.reviewedBy = e.reviewed ? e.by : null;
      r.remarks = e.remarks || null;
    });
  }

  function reportComment(activityId, name, sender, message, hrs) {
    var r = reqFor(activityId, name);
    comments.push({ id:nextId('cmt'), activityId:activityId, senderId:sender.id,
      senderName:sender.name, role:sender.role, message:message,
      requirementId:r ? r.id : null, timestamp:hoursAgo(hrs), readByCounterpart:true });
  }

  function outcome(activityId, participants, summary, issues, hrs) {
    var a = activities.filter(function (x) { return x.id === activityId; })[0];
    a.outcome = { actualParticipants:participants, summary:summary, issues:issues || null,
      recordedAt:hoursAgo(hrs) };
  }

  var U = {};
  users.forEach(function (u) { U[u.username] = u; });

  /* CCS-SC \u2014 CCS Research Colloquium: all four filed within the five days,
     accepted on first review. */
  fileReports('act-5', {
    'Narrative Report with Documentation': { status:APPROVED_ALL,
      file:'CCS-SC_Research-Colloquium_Narrative-Report_with_Photos.pdf', submitted:660, reviewed:430, by:'M. Delfin',
      remarks:'Complete. Photos, attendance sheets and programme are attached.' },
    'Evaluation': { status:APPROVED_ALL,
      file:'CCS-SC_Research-Colloquium_Evaluation-Summary.pdf', submitted:655, reviewed:430, by:'M. Delfin',
      remarks:'Summary of 132 evaluation forms received. Overall rating 4.6 / 5.' },
    'Financial Report': { status:APPROVED_ALL,
      file:'CCS-SC_Research-Colloquium_Financial-Report.pdf', submitted:640, reviewed:410, by:'C. Bermudo',
      remarks:'Expenses of PHP 6,120 against the PHP 6,400 budget. Figures tally with the receipts.' },
    'Liquidation': { status:APPROVED_ALL,
      file:'CCS-SC_Research-Colloquium_Liquidation_with_ORs.pdf', submitted:640, reviewed:405, by:'C. Bermudo' }
  });
  outcome('act-5', 141,
    'Twenty-four capstone groups presented across three parallel sessions. Faculty panels gave written feedback to each group.',
    'Session B started 30 minutes late because of a projector fault in AVR 1.', 650);
  reportComment('act-5', 'Narrative Report with Documentation', U.ccs,
    'Good day, Ma\u2019am. Attached are the narrative report, evaluation summary, financial report and liquidation for the Research Colloquium.', 660);
  notify(C.ROLE.SASO,null,'act-5',C.NOTIF.TR_SUBMITTED,'CCS-SC submitted Narrative Report with Documentation for CCS Research Colloquium.',660,true);
  notify(C.ROLE.SASO,null,'act-5',C.NOTIF.TR_SUBMITTED,'CCS-SC submitted Financial Report for CCS Research Colloquium.',640,true);

  /* CAS-CSC \u2014 CAS Literary Night: Financial Report returned once for missing
     receipts, resubmitted, then the whole set accepted. */
  fileReports('act-9', {
    'Narrative Report with Documentation': { status:APPROVED_ALL,
      file:'CAS-CSC_Literary-Night_Narrative-Report.pdf', submitted:470, reviewed:340, by:'G. Pe\u00f1aflor',
      remarks:'Accepted. Include the names of the awardees in future narratives.' },
    'Evaluation': { status:APPROVED_ALL,
      file:'CAS-CSC_Literary-Night_Evaluation-Results.pdf', submitted:465, reviewed:340, by:'G. Pe\u00f1aflor' },
    'Financial Report': { status:APPROVED_ALL,
      file:'CAS-CSC_Literary-Night_Financial-Report_REVISED.pdf', submitted:330, reviewed:305, by:'C. Bermudo',
      remarks:'Accepted on resubmission. Official receipts for sound system rental are now attached.' },
    'Liquidation': { status:APPROVED_ALL,
      file:'CAS-CSC_Literary-Night_Liquidation.pdf', submitted:330, reviewed:300, by:'C. Bermudo' }
  });
  outcome('act-9', 164,
    'Eighteen readings and six spoken word pieces were performed. Three works were selected for the campus publication.',
    null, 460);
  reportComment('act-9', 'Financial Report', U.aide,
    'The Financial Report lists PHP 1,500 for sound system rental but no official receipt is attached. Please resubmit with the receipt.', 400);
  reportComment('act-9', 'Financial Report', U.cas,
    'Noted, Sir. The supplier has issued the receipt; we resubmitted the report together with the liquidation.', 330);
  notify(C.ROLE.ORG,'org-5','act-9',C.NOTIF.TR_RETURNED,'Financial Report for CAS Literary Night needs revision: attach the official receipt for sound system rental.',400,true);
  notify(C.ROLE.SASO,null,'act-9',C.NOTIF.TR_SUBMITTED,'CAS-CSC resubmitted Financial Report for CAS Literary Night.',330,true);
  notify(C.ROLE.ORG,'org-5','act-9',C.NOTIF.TR_ACCEPTED,'Post-activity reports accepted \u2014 CAS Literary Night is completed.',300,true);

  /* JPCS - CSPC \u2014 Industry Immersion Visit (off campus). */
  fileReports('act-11', {
    'Narrative Report with Documentation': { status:APPROVED_ALL,
      file:'JPCS_Industry-Immersion_Narrative-Report_and_Learning-Journals.pdf', submitted:1420, reviewed:1230, by:'M. Delfin',
      remarks:'Accepted. Learning journals from all 43 participants are included.' },
    'Evaluation': { status:APPROVED_ALL,
      file:'JPCS_Industry-Immersion_Evaluation.pdf', submitted:1420, reviewed:1230, by:'M. Delfin' },
    'Financial Report': { status:APPROVED_ALL,
      file:'JPCS_Industry-Immersion_Financial-Report.pdf', submitted:1390, reviewed:1210, by:'C. Bermudo',
      remarks:'Transport and meals tally with the PHP 22,000 budget; participant shares are itemized.' },
    'Liquidation': { status:APPROVED_ALL,
      file:'JPCS_Industry-Immersion_Liquidation_with_ORs.pdf', submitted:1390, reviewed:1200, by:'C. Bermudo' }
  });
  outcome('act-11', 43,
    'Forty-three students attended three company briefings on software delivery, cloud operations and QA practice.',
    'Two registered students did not join because of a class conflict.', 1410);
  notify(C.ROLE.ORG,'org-1','act-11',C.NOTIF.TR_ACCEPTED,'Post-activity reports accepted \u2014 JPCS Industry Immersion Visit is completed.',1200,true);

  /* CHS-SC \u2014 Health Awareness Week, due today: two reports with SASO, the
     Financial Report returned, the Liquidation not yet filed. */
  fileReports('act-6', {
    'Narrative Report with Documentation': { status:C.REQUIREMENT.UNDER_REVIEW,
      file:'CHS-SC_Health-Awareness-Week_Narrative-Report.pdf', submitted:70 },
    'Evaluation': { status:C.REQUIREMENT.UNDER_REVIEW,
      file:'CHS-SC_Health-Awareness-Week_Evaluation-Summary.pdf', submitted:50 },
    'Financial Report': { status:C.REQUIREMENT.NEEDS_REVISION,
      file:'CHS-SC_Health-Awareness-Week_Financial-Report.pdf', submitted:60, reviewed:20, by:'C. Bermudo',
      remarks:'Total expenses do not match the attached receipts (PHP 46,350 vs PHP 44,900). Please reconcile and separate the external partner contributions.' }
  });
  outcome('act-6', 468,
    'Free blood pressure, blood sugar and BMI screening for 312 residents of Barangay San Jose, plus four health talks on campus.',
    'The outreach day was shortened by two hours due to rain.', 65);
  reportComment('act-6', 'Narrative Report with Documentation', U.chs,
    'Good morning, Ma\u2019am. We have submitted the narrative report. The evaluation summary follows once all forms are encoded.', 70);
  reportComment('act-6', 'Financial Report', U.aide,
    'Returned: the total does not match the receipts. Please reconcile before the deadline today.', 20);
  notify(C.ROLE.SASO,null,'act-6',C.NOTIF.TR_SUBMITTED,'CHS-SC submitted Narrative Report with Documentation for Health Awareness Week.',70,true);
  notify(C.ROLE.SASO,null,'act-6',C.NOTIF.TR_SUBMITTED,'CHS-SC submitted Financial Report for Health Awareness Week.',60,true);
  notify(C.ROLE.SASO,null,'act-6',C.NOTIF.TR_SUBMITTED,'CHS-SC submitted Evaluation for Health Awareness Week.',50,false);
  notify(C.ROLE.ORG,'org-3','act-6',C.NOTIF.TR_RETURNED,'Financial Report for Health Awareness Week needs revision: totals do not match the receipts.',20,false);

  /* ---- assorted notifications --------------------------------------------- */
  notify(C.ROLE.SASO,null,'act-6',C.NOTIF.TR_DUE_SOON,'CHS-SC post-activity reports are due today.',12,false);
  notify(C.ROLE.SASO,null,'act-4',C.NOTIF.ENDORSED,'You endorsed CCS Acquaintance Party 2026 to the VPAA.',100,true);
  notify(C.ROLE.ORG,'org-2','act-5',C.NOTIF.TR_ACCEPTED,'Post-activity reports accepted \u2014 CCS Research Colloquium is completed.',400,true);

  /* ---- proposal edits and the trash bin -------------------------------------
     Edits and deletions notify the organization and, individually, the three
     SASO accounts allowed to make them (config.PROPOSAL_MANAGERS). */

  var MANAGERS = users.filter(function (u) {
    return C.PROPOSAL_MANAGERS.indexOf(u.username) !== -1;
  });

  /* One notification to the organization and one to each SASO manager. The
     account that made the change reads the `self` wording. */
  function notifyChange(activityId, orgId, type, others, self, actorUserId, orgIsActor, hrs) {
    notify(C.ROLE.ORG, orgId, activityId, type, orgIsActor ? self : others, hrs, false);
    MANAGERS.forEach(function (u) {
      notifications.push({ id:nextId('ntf'), recipientRole:C.ROLE.SASO, recipientOrgId:null,
        recipientUserId:u.id, activityId:activityId, type:type,
        message: u.id === actorUserId ? self : others,
        timestamp:hoursAgo(hrs), read: u.id === actorUserId });
    });
  }

  /* SASO's Coordinator changed the venue of a proposal still under review. */
  (function () {
    var a = activities.filter(function (x) { return x.id === 'act-7'; })[0];
    a.venue = 'CSPC Gymnasium';
    a.lastEditedAt = hoursAgo(6); a.lastEditedBy = 'G. Peñaflor'; a.lastEditedByRole = C.ROLE.SASO;
    a.updatedAt = hoursAgo(6);
    var summary = 'Changed venue. Reason: The Auditorium is booked on that date; moved to the Gymnasium.';
    history('act-7','record',null,'EDITED','G. Peñaflor',C.ROLE.SASO,6,summary);
    notifyChange('act-7','org-4',C.NOTIF.PROPOSAL_EDITED,
      'G. Peñaflor (SASO) edited the proposal Student Leaders Congress 2026 — ' + summary,
      'You edited the proposal Student Leaders Congress 2026 — ' + summary,
      'usr-8', false, 6);
  })();

  /* Moves a seeded activity and its records into the trash bin. */
  var trash = [];
  function trashActivity(activityId, by, byRole, byUserId, hrsAgo, reason) {
    function take(list) { return list.filter(function (r) { return r.activityId === activityId; }); }
    function keep(list) { return list.filter(function (r) { return r.activityId !== activityId; }); }

    var deletedAt = hoursAgo(hrsAgo);
    var act = activities.filter(function (a) { return a.id === activityId; })[0];
    history(activityId,'record',act.proposalStatus,'DELETED',by,byRole,hrsAgo,reason);

    trash.push({ id:nextId('trash'), activity:act,
      requirements:take(requirements), comments:take(comments),
      routing:take(routing), statusHistory:take(statusHistory),
      deletedAt:deletedAt, deletedBy:by, deletedByRole:byRole, deletedByUserId:byUserId,
      reason:reason || null,
      purgeAt:new Date(Date.parse(deletedAt) + C.TRASH_RETENTION_DAYS * 86400000).toISOString() });

    activities = activities.filter(function (a) { return a.id !== activityId; });
    requirements = keep(requirements); comments = keep(comments);
    routing = keep(routing); statusHistory = keep(statusHistory);
  }

  /* Deleted by the organization 26 days ago — four days left before it is
     permanently deleted, so the countdown warning is visible. */
  activity({ id:'act-13', org:'org-2', title:'CCS Tech Quiz Bee 2026', category:'Life Skills',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC AVR 2', dateStart:dateOnly(20), participants:80,
    participantDescription:'CCS students, all year levels', budget:'3,500', fundSource:'CCS-SC Fund',
    rationale:'The council holds an annual quiz bee to encourage academic excellence in computing.',
    objectives:['Recognize outstanding students in computing'],
    description:'Half-day elimination and final rounds.',
    proposalStatus:C.PROPOSAL.SUBMITTED, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(700), submittedAt:hoursAgo(690), updatedAt:hoursAgo(624) });
  addRequirements('act-13', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, C.REQUIREMENT.UNDER_REVIEW, {
    'Excuse Letter': C.REQUIREMENT.NOT_SUBMITTED });
  route('act-13', C.OFFICE.SASO, 690, null, null);
  history('act-13','proposalStatus',C.PROPOSAL.DRAFT,C.PROPOSAL.SUBMITTED,'N. Ramos',C.ROLE.ORG,690);
  trashActivity('act-13','N. Ramos',C.ROLE.ORG,'usr-4',624,
    'Merged into the CCS Research Colloquium programme instead.');
  notifyChange('act-13','org-2',C.NOTIF.PROPOSAL_DELETED,
    'CCS-SC deleted the proposal CCS Tech Quiz Bee 2026 — Merged into the CCS Research Colloquium programme instead. It stays in the trash bin for 30 days.',
    'You deleted the proposal CCS Tech Quiz Bee 2026. It stays in the trash bin for 30 days.',
    null, true, 624);

  /* Deleted by the Administrative Aide two days ago as a duplicate filing. */
  activity({ id:'act-14', org:'org-5', title:'CAS Film Screening Night', category:'Socio-Civic',
    venueType:C.VENUE.ON_CAMPUS, venue:'CSPC AVR 1', dateStart:dateOnly(26), participants:150,
    participantDescription:'CAS students', budget:'2,800', fundSource:'CAS-CSC Fund',
    rationale:'Students requested a film forum on social issues.',
    objectives:['Facilitate discussion of social issues through film'],
    description:'Evening screening followed by a moderated open forum.',
    proposalStatus:C.PROPOSAL.FOR_REVIEW, eventStatus:C.EVENT.NOT_APPLICABLE,
    createdAt:hoursAgo(120), submittedAt:hoursAgo(110), updatedAt:hoursAgo(48) });
  addRequirements('act-14', C.VENUE.ON_CAMPUS, C.PHASE.PRE_APPROVAL, C.REQUIREMENT.UNDER_REVIEW);
  route('act-14', C.OFFICE.SASO, 110, null, null);
  history('act-14','proposalStatus',C.PROPOSAL.SUBMITTED,C.PROPOSAL.FOR_REVIEW,'C. Bermudo',C.ROLE.SASO,100);
  trashActivity('act-14','C. Bermudo',C.ROLE.SASO,'usr-2',48,
    'Duplicate submission — the same activity was filed twice. Please follow the other entry.');
  notifyChange('act-14','org-5',C.NOTIF.PROPOSAL_DELETED,
    'C. Bermudo (SASO) deleted the proposal CAS Film Screening Night — Duplicate submission — the same activity was filed twice. Please follow the other entry. It stays in the trash bin for 30 days.',
    'You deleted the proposal CAS Film Screening Night. It stays in the trash bin for 30 days.',
    'usr-2', false, 48);

  /* ---- organization account requests -----------------------------------------
     No open sign-up: organizations request an account from the sign-in screen
     and SASO approves or declines. The requesting organizations below are
     fictional demonstration entries, like every officer in this file. */

  var year = new Date().getFullYear();
  var accountRequests = [];
  function accountRequest(o) {
    var r = { id:nextId('areq'), ref:'AR-' + year + '-' + o.n, status:o.status,
      name:o.name, acronym:o.acronym, entityType:C.ENTITY.STUDENT_ORG, college:o.college, adviser:o.adviser,
      officerName:o.officer, officerPosition:o.position, email:o.email, contact:o.contact || '',
      username:o.username, password:o.password, proofFileName:o.proof, notes:o.notes || null,
      submittedAt:hoursAgo(o.hrs), reviewedAt:o.reviewedHrs ? hoursAgo(o.reviewedHrs) : null,
      reviewedBy:o.reviewedBy || null, remarks:o.remarks || null, createdOrgId:null, createdUserId:null };
    accountRequests.push(r);
    return r;
  }
  function notifyManagers(type, message, hrs, requestId, readBy) {
    MANAGERS.forEach(function (u) {
      notifications.push({ id:nextId('ntf'), recipientRole:C.ROLE.SASO, recipientOrgId:null,
        recipientUserId:u.id, activityId:null, requestId:requestId, type:type, message:message,
        timestamp:hoursAgo(hrs), read: readBy === u.id });
    });
  }

  /* Declined: the chapter already has an account. */
  var dup = accountRequest({ n:'0001', status:C.ACCOUNT_REQUEST.DECLINED, hrs:240, reviewedHrs:220,
    reviewedBy:'C. Bermudo',
    remarks:'JPCS - CSPC already has an account (username jpcs). Please ask your president for access instead of opening a second one.',
    name:'Junior Philippine Computer Society - CSPC Chapter', acronym:'JPCS-CSPC2', college:'College of Computer Studies',
    adviser:'Prof. R. Almeda', officer:'L. Fajardo', position:'Vice President', email:'lfajardo@example.com',
    username:'jpcs.vp', password:'request123', proof:'JPCS_Recognition_2025.pdf' });
  notifyManagers(C.NOTIF.ACCOUNT_DECLINED, 'C. Bermudo declined the account request of JPCS-CSPC2 (' + dup.ref + '): duplicate of an existing account.', 220, dup.id, 'usr-2');

  var chess = accountRequest({ n:'0002', status:C.ACCOUNT_REQUEST.PENDING, hrs:74,
    name:'CSPC Chess and Mind Sports Club', acronym:'CMSC', college:'Institution-wide',
    adviser:'Prof. E. Navarro', officer:'R. Villareal', position:'President', email:'rvillareal@example.com',
    contact:'0917 000 0000', username:'cmsc', password:'cmsc123', proof:'CMSC_Certificate_of_Recognition.pdf',
    notes:'Newly recognized this semester. We plan to hold an inter-college tournament next month.' });
  notifyManagers(C.NOTIF.ACCOUNT_REQUESTED, 'CMSC (CSPC Chess and Mind Sports Club) requested an organization account \u2014 ' + chess.ref + '.', 74, chess.id, null);

  var tour = accountRequest({ n:'0003', status:C.ACCOUNT_REQUEST.PENDING, hrs:5,
    name:'Junior Tourism Professionals Society', acronym:'JTPS', college:'College of Arts and Sciences',
    adviser:'Prof. H. Santiago', officer:'P. Caballero', position:'Secretary', email:'pcaballero@example.com',
    username:'jtps', password:'jtps123', proof:'JTPS_Recognition_AY2025-2026.pdf' });
  notifyManagers(C.NOTIF.ACCOUNT_REQUESTED, 'JTPS (Junior Tourism Professionals Society) requested an organization account \u2014 ' + tour.ref + '.', 5, tour.id, null);

  return {
    meta:{ seededAt:new Date().toISOString(), version:4 },
    /* Office policy values. Seeded from what SASO stated; adjustable in
       Settings so the prototype can be shown against a different policy. */
    settings:{
      reportDeadlineDays: C.TERMINAL_REPORT_DEADLINE_DAYS,
      proposalAlertDays: C.PROPOSAL_WAITING_ALERT_DAYS,
      accreditationAlertDays: 60
    },
    organizations:organizations, users:users, activities:activities,
    requirements:requirements, comments:comments, notifications:notifications,
    routing:routing, statusHistory:statusHistory, trash:trash, accountRequests:accountRequests
  };
};
