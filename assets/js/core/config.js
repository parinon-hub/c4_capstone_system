/* =========================================================================
   config.js  —  Single source of truth for the prototype's vocabulary.

   Every status, label, badge colour, category and requirement name used
   anywhere in the system is declared here. Values marked SASO were taken
   from documents supplied by the Student Affairs and Services Office;
   values marked ASSUMPTION are the researchers' own and are not claimed to
   be official.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.config = (function () {
  'use strict';

  var ROLE = { SASO: 'SASO', ORG: 'ORG' };

  /* ---- A. Proposal status ------------------------------------------------
     Approval does NOT end at SASO. On-campus activities are endorsed by SASO
     to the VPAA and then to the President; off-campus activities likewise
     conclude at the President's office. SASO acts inside this system; the
     later offices do not. The system therefore RECORDS the onward routing
     rather than enacting it, so an organization can see where its papers are.
     -------------------------------------------------------------------------- */
  var PROPOSAL = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    FOR_REVIEW: 'FOR_REVIEW',
    REQUIREMENTS_NEEDED: 'REQUIREMENTS_NEEDED',
    REVISION_REQUIRED: 'REVISION_REQUIRED',
    SASO_ENDORSED: 'SASO_ENDORSED',
    WITH_VPAA: 'WITH_VPAA',
    WITH_PRESIDENT: 'WITH_PRESIDENT',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  };

  /* Offices in the approval route. SASO is the only one that acts here. */
  var OFFICE = {
    SASO: 'SASO',
    VPAA: 'VPAA',
    PRESIDENT: 'PRESIDENT'
  };

  /* ---- B. Requirement status --------------------------------------------- */
  var REQUIREMENT = {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    NEEDS_REVISION: 'NEEDS_REVISION'
  };

  /* Requirements exist in two phases. Pre-approval requirements gate the
     approval; post-activity requirements gate completion. */
  var PHASE = {
    PRE_APPROVAL: 'PRE_APPROVAL',
    POST_ACTIVITY: 'POST_ACTIVITY'
  };

  /* ---- C. Event status ---------------------------------------------------- */
  var EVENT = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    UPCOMING: 'UPCOMING',
    ONGOING: 'ONGOING',
    FINISHED: 'FINISHED',
    POSTPONED: 'POSTPONED',
    CANCELLED: 'CANCELLED'
  };

  /* ---- D. Terminal report status ------------------------------------------
     DERIVED from the post-activity requirement set — never stored. SASO
     records a submission date per document, so completion is a property of
     the documents, not a separate flag.
     -------------------------------------------------------------------------- */
  var TERMINAL = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    REQUIRED: 'REQUIRED',
    OVERDUE: 'OVERDUE',
    PARTIAL: 'PARTIAL',
    UNDER_REVIEW: 'UNDER_REVIEW',
    NEEDS_REVISION: 'NEEDS_REVISION',
    ACCEPTED: 'ACCEPTED'
  };

  /* ---- E. Derived lifecycle stage ------------------------------------------ */
  var STAGE = {
    DRAFT: 'DRAFT',
    UNDER_SASO_REVIEW: 'UNDER_SASO_REVIEW',
    IN_APPROVAL_ROUTE: 'IN_APPROVAL_ROUTE',
    APPROVED: 'APPROVED',
    ONGOING: 'ONGOING',
    POSTPONED: 'POSTPONED',
    AWAITING_TERMINAL_REPORT: 'AWAITING_TERMINAL_REPORT',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED'
  };

  /* ---- F. Accreditation (SASO roster, AY 2025-2026) ------------------------ */
  var ACCREDITATION_LEVEL = {
    RECOGNIZED: 'RECOGNIZED',
    LEVEL_I: 'LEVEL_I',
    LEVEL_II: 'LEVEL_II',
    LEVEL_III: 'LEVEL_III',
    LEVEL_IV: 'LEVEL_IV'
  };

  var ACCREDITATION_TYPE = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    ACCREDITED: 'NEW_ACCREDITED',
    RE_ACCREDITED: 'RE_ACCREDITED'
  };

  /* Entities that conduct activities. SASO records offices and class
     sections on the same footing as student organizations. */
  var ENTITY = {
    STUDENT_ORG: 'STUDENT_ORG',
    OFFICE: 'OFFICE',
    CLASS_SECTION: 'CLASS_SECTION'
  };

  /* ---- G. Venue type — SASO records three, not two ------------------------- */
  var VENUE = {
    ON_CAMPUS: 'ON_CAMPUS',
    OFF_CAMPUS: 'OFF_CAMPUS',
    ONLINE: 'ONLINE'
  };

  /* ---- H. Activity categories (SASO) ---------------------------------------
     SASO maintains one consolidated list plus a separate list per category. */
  var ACTIVITY_CATEGORIES = [
    'Environmental',
    'IGP',
    'Leadership',
    'Life Skills',
    'Multi-Faith',
    'Socio-Civic',
    'Sports',
    'Student Publication',
    'Volunteer'
  ];

  /* ---- Human labels --------------------------------------------------------- */
  var LABEL = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    FOR_REVIEW: 'For Review',
    REQUIREMENTS_NEEDED: 'Requirements Needed',
    REVISION_REQUIRED: 'Revision Required',
    SASO_ENDORSED: 'Endorsed by SASO',
    WITH_VPAA: 'With VPAA',
    WITH_PRESIDENT: "With President's Office",
    APPROVED: 'Approved',
    REJECTED: 'Rejected',

    EDITED: 'Edited',

    PENDING: 'Awaiting SASO approval',
    DECLINED: 'Declined',
    DELETED: 'Moved to trash bin',
    RESTORED: 'Restored from trash bin',

    SASO: 'SASO',
    VPAA: 'VPAA',
    PRESIDENT: "President's Office",

    NOT_SUBMITTED: 'Not Submitted',
    UNDER_REVIEW: 'Under Review',
    NEEDS_REVISION: 'Needs Revision',

    PRE_APPROVAL: 'Pre-Approval',
    POST_ACTIVITY: 'Post-Activity',

    NOT_APPLICABLE: 'Not Applicable',
    UPCOMING: 'Upcoming',
    ONGOING: 'Ongoing',
    FINISHED: 'Finished',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',

    REQUIRED: 'Reports Required',
    OVERDUE: 'Reports Overdue',
    PARTIAL: 'Partially Submitted',
    ACCEPTED: 'Accepted',

    RECOGNIZED: 'Recognized',
    LEVEL_I: 'Level I',
    LEVEL_II: 'Level II',
    LEVEL_III: 'Level III',
    LEVEL_IV: 'Level IV',
    NEW_ACCREDITED: 'Accredited',
    RE_ACCREDITED: 'Re-Accredited',

    STUDENT_ORG: 'Student Organization',
    OFFICE: 'Office',
    CLASS_SECTION: 'Class Section',

    ON_CAMPUS: 'On Campus',
    OFF_CAMPUS: 'Off Campus',
    ONLINE: 'Online',

    UNDER_SASO_REVIEW: 'Under SASO Review',
    IN_APPROVAL_ROUTE: 'In Approval Route',
    AWAITING_TERMINAL_REPORT: 'Awaiting Reports',
    COMPLETED: 'Completed',
    CLOSED: 'Closed'
  };

  var BADGE = {
    PENDING: 'warning',
    DECLINED: 'danger',
    DRAFT: 'secondary',
    SUBMITTED: 'info',
    FOR_REVIEW: 'info',
    REQUIREMENTS_NEEDED: 'warning',
    REVISION_REQUIRED: 'warning',
    SASO_ENDORSED: 'primary',
    WITH_VPAA: 'primary',
    WITH_PRESIDENT: 'primary',
    APPROVED: 'success',
    REJECTED: 'danger',

    SASO: 'info', VPAA: 'primary', PRESIDENT: 'primary',

    NOT_SUBMITTED: 'secondary',
    UNDER_REVIEW: 'info',
    NEEDS_REVISION: 'warning',

    PRE_APPROVAL: 'info', POST_ACTIVITY: 'warning',

    NOT_APPLICABLE: 'secondary',
    UPCOMING: 'primary',
    ONGOING: 'primary',
    FINISHED: 'info',
    POSTPONED: 'warning',
    CANCELLED: 'danger',

    REQUIRED: 'warning',
    OVERDUE: 'danger',
    PARTIAL: 'warning',
    ACCEPTED: 'success',

    RECOGNIZED: 'secondary',
    LEVEL_I: 'info', LEVEL_II: 'info',
    LEVEL_III: 'primary', LEVEL_IV: 'success',
    NEW_ACCREDITED: 'info', RE_ACCREDITED: 'success',

    STUDENT_ORG: 'info', OFFICE: 'secondary', CLASS_SECTION: 'secondary',

    ON_CAMPUS: 'info', OFF_CAMPUS: 'warning', ONLINE: 'secondary',

    UNDER_SASO_REVIEW: 'info',
    IN_APPROVAL_ROUTE: 'primary',
    AWAITING_TERMINAL_REPORT: 'warning',
    COMPLETED: 'success',
    CLOSED: 'secondary'
  };

  /* ---- Requirement templates -----------------------------------------------
     Pre-approval requirements were named by SASO. Off-campus activities add
     the CMO 63 documentation. Post-activity requirements are the three
     columns SASO tracks in its master workbook, plus liquidation where funds
     were disbursed.
     ---------------------------------------------------------------------------- */
  var REQUIREMENT_TEMPLATES = {
    PRE_APPROVAL_COMMON: [
      { name: 'Permission to Conduct (PTC)',              mandatory: true,  source: 'SASO' },
      { name: 'Activity Proposal',                        mandatory: true,  source: 'SASO' },
      { name: 'List of Participants (year level, section)',mandatory: true, source: 'SASO' },
      { name: 'Communication Letter',                     mandatory: true,  source: 'SASO' },
      { name: 'Letter to Enter / Supporting Letters',     mandatory: false, source: 'SASO' },
      { name: 'Excuse Letter',                            mandatory: false, source: 'SASO' }
    ],
    PRE_APPROVAL_OFF_CAMPUS_EXTRA: [
      { name: 'CMO 63 Documentary Requirements',          mandatory: true,  source: 'SASO' }
    ],
    POST_ACTIVITY: [
      { name: 'Narrative Report with Documentation',      mandatory: true,  source: 'SASO' },
      { name: 'Evaluation',                               mandatory: true,  source: 'SASO' },
      { name: 'Financial Report',                         mandatory: true,  source: 'SASO' },
      { name: 'Liquidation',                              mandatory: false, source: 'SASO' }
    ]
  };

  /* SASO policy: post-activity reports are due five days after the event.
     In practice submissions run late where receipts, class conflicts, or
     off-campus learning journals intervene, so overdue is a flag, not a bar. */
  var TERMINAL_REPORT_DEADLINE_DAYS = 5;
  var PROPOSAL_WAITING_ALERT_DAYS = 5;

  /* ---- Notifications --------------------------------------------------------- */
  var NOTIF = {
    PROPOSAL_SUBMITTED: 'PROPOSAL_SUBMITTED',
    PROPOSAL_UNDER_REVIEW: 'PROPOSAL_UNDER_REVIEW',
    REQUIREMENT_REQUESTED: 'REQUIREMENT_REQUESTED',
    REQUIREMENT_SUBMITTED: 'REQUIREMENT_SUBMITTED',
    REQUIREMENT_APPROVED: 'REQUIREMENT_APPROVED',
    REQUIREMENT_RETURNED: 'REQUIREMENT_RETURNED',
    ENDORSED: 'ENDORSED',
    ROUTED: 'ROUTED',
    PROPOSAL_APPROVED: 'PROPOSAL_APPROVED',
    PROPOSAL_RETURNED: 'PROPOSAL_RETURNED',
    PROPOSAL_REJECTED: 'PROPOSAL_REJECTED',
    COMMENT_POSTED: 'COMMENT_POSTED',
    EVENT_FINISHED: 'EVENT_FINISHED',
    TR_DUE_SOON: 'TR_DUE_SOON',
    TR_OVERDUE: 'TR_OVERDUE',
    TR_SUBMITTED: 'TR_SUBMITTED',
    TR_ACCEPTED: 'TR_ACCEPTED',
    TR_RETURNED: 'TR_RETURNED',
    PROPOSAL_EDITED: 'PROPOSAL_EDITED',
    PROPOSAL_DELETED: 'PROPOSAL_DELETED',
    PROPOSAL_RESTORED: 'PROPOSAL_RESTORED',
    PROPOSAL_PURGED: 'PROPOSAL_PURGED',
    ACCOUNT_REQUESTED: 'ACCOUNT_REQUESTED',
    ACCOUNT_APPROVED: 'ACCOUNT_APPROVED',
    ACCOUNT_DECLINED: 'ACCOUNT_DECLINED',
    ACCOUNT_CREATED: 'ACCOUNT_CREATED',
    ACCOUNT_UPDATED: 'ACCOUNT_UPDATED',
    ACCOUNT_DELETED: 'ACCOUNT_DELETED'
  };

  var NOTIF_ICON = {
    PROPOSAL_SUBMITTED: 'fa-file-circle-plus',
    PROPOSAL_UNDER_REVIEW: 'fa-magnifying-glass',
    REQUIREMENT_REQUESTED: 'fa-circle-exclamation',
    REQUIREMENT_SUBMITTED: 'fa-paperclip',
    REQUIREMENT_APPROVED: 'fa-circle-check',
    REQUIREMENT_RETURNED: 'fa-rotate-left',
    ENDORSED: 'fa-share-from-square',
    ROUTED: 'fa-arrow-right-arrow-left',
    PROPOSAL_APPROVED: 'fa-stamp',
    PROPOSAL_RETURNED: 'fa-rotate-left',
    PROPOSAL_REJECTED: 'fa-circle-xmark',
    COMMENT_POSTED: 'fa-comment-dots',
    EVENT_FINISHED: 'fa-flag-checkered',
    TR_DUE_SOON: 'fa-clock',
    TR_OVERDUE: 'fa-triangle-exclamation',
    TR_SUBMITTED: 'fa-file-arrow-up',
    TR_ACCEPTED: 'fa-award',
    TR_RETURNED: 'fa-rotate-left',
    PROPOSAL_EDITED: 'fa-pen-to-square',
    PROPOSAL_DELETED: 'fa-trash-can',
    PROPOSAL_RESTORED: 'fa-trash-arrow-up',
    PROPOSAL_PURGED: 'fa-dumpster',
    ACCOUNT_REQUESTED: 'fa-user-plus',
    ACCOUNT_APPROVED: 'fa-user-check',
    ACCOUNT_DECLINED: 'fa-user-xmark',
    ACCOUNT_CREATED: 'fa-id-card',
    ACCOUNT_UPDATED: 'fa-user-pen',
    ACCOUNT_DELETED: 'fa-user-slash'
  };

  /* Notification types collapsed into the four things a user actually wants
     to filter by. */
  var NOTIF_GROUP = {
    PROPOSAL_SUBMITTED: 'PROPOSALS',
    PROPOSAL_UNDER_REVIEW: 'PROPOSALS',
    PROPOSAL_APPROVED: 'PROPOSALS',
    PROPOSAL_RETURNED: 'PROPOSALS',
    PROPOSAL_REJECTED: 'PROPOSALS',
    ENDORSED: 'PROPOSALS',
    ROUTED: 'PROPOSALS',
    REQUIREMENT_REQUESTED: 'REQUIREMENTS',
    REQUIREMENT_SUBMITTED: 'REQUIREMENTS',
    REQUIREMENT_APPROVED: 'REQUIREMENTS',
    REQUIREMENT_RETURNED: 'REQUIREMENTS',
    EVENT_FINISHED: 'REPORTS',
    TR_DUE_SOON: 'REPORTS',
    TR_OVERDUE: 'REPORTS',
    TR_SUBMITTED: 'REPORTS',
    TR_ACCEPTED: 'REPORTS',
    TR_RETURNED: 'REPORTS',
    COMMENT_POSTED: 'MESSAGES',
    PROPOSAL_EDITED: 'CHANGES',
    PROPOSAL_DELETED: 'CHANGES',
    PROPOSAL_RESTORED: 'CHANGES',
    PROPOSAL_PURGED: 'CHANGES',
    ACCOUNT_REQUESTED: 'ACCOUNTS',
    ACCOUNT_APPROVED: 'ACCOUNTS',
    ACCOUNT_DECLINED: 'ACCOUNTS',
    ACCOUNT_CREATED: 'ACCOUNTS',
    ACCOUNT_UPDATED: 'ACCOUNTS',
    ACCOUNT_DELETED: 'ACCOUNTS'
  };

  var NOTIF_GROUP_LABEL = {
    PROPOSALS: 'Proposals and approvals',
    REQUIREMENTS: 'Requirements',
    REPORTS: 'Post-activity reports',
    MESSAGES: 'Queries and comments',
    CHANGES: 'Proposal edits and deletions',
    ACCOUNTS: 'Organization accounts'
  };

  /* Notifications that should read as urgent rather than informational. */
  var NOTIF_URGENT = ['TR_OVERDUE', 'TR_DUE_SOON', 'REQUIREMENT_REQUESTED',
                      'REQUIREMENT_RETURNED', 'PROPOSAL_RETURNED', 'PROPOSAL_REJECTED',
                      'PROPOSAL_DELETED', 'ACCOUNT_REQUESTED'];

  /* ---- Editing, deleting and the trash bin ----------------------------------
     PROTOTYPE ASSUMPTION (researchers' design decision, not a stated SASO
     rule). A proposal may be edited or deleted only while it is still under
     SASO review — Submitted, For Review, Requirements Needed or Revision
     Required. Once SASO has endorsed it, the papers are with another office
     and the record is frozen.

     Who may do it: the organization that submitted the proposal, and these
     SASO accounts — the Head (head), the Administrative Aide (admin) and the
     Student Activities Coordinator (admin1). The Records Officer keeps
     view-only access to proposals.

     Deleting does not destroy the record. It moves to a trash bin, where it
     can be restored or permanently deleted, and is permanently deleted
     automatically after TRASH_RETENTION_DAYS.
     ---------------------------------------------------------------------------- */
  var PROPOSAL_MANAGERS = ['head', 'admin', 'admin1'];
  var TRASH_RETENTION_DAYS = 30;

  /* ---- Organization accounts ------------------------------------------------
     There is no open sign-up. An organization gets an account in one of two
     ways, and SASO controls both:
       1. it submits a "Request an account" form from the sign-in screen, and
          SASO approves it — only then can it sign in; or
       2. SASO creates the organization and its account directly.
     PROTOTYPE ASSUMPTION (researchers' design decision): the same three staff
     accounts that manage proposals — Head, Administrative Aide, Coordinator —
     approve requests and create accounts. The Records Officer can view the
     requests but not act on them.
     ---------------------------------------------------------------------------- */
  var ACCOUNT_MANAGERS = ['head', 'admin', 'admin1'];
  var ACCOUNT_REQUEST = { PENDING: 'PENDING', APPROVED: 'APPROVED', DECLINED: 'DECLINED' };

  /* v3: adds the trash bin and per-staff notifications. Bumping the key loads
     the new sample data automatically instead of reusing an older store. */
  /* v4: adds organization account requests. */
  /* v5: SASO demo accounts renamed to head, admin, admin1 and admin2. */
  var STORAGE_KEY = 'cspc_saso_prototype_v5';
  var SESSION_KEY = 'cspc_saso_session_v2';

  return {
    ROLE: ROLE, PROPOSAL: PROPOSAL, OFFICE: OFFICE,
    REQUIREMENT: REQUIREMENT, PHASE: PHASE,
    EVENT: EVENT, TERMINAL: TERMINAL, STAGE: STAGE,
    ACCREDITATION_LEVEL: ACCREDITATION_LEVEL,
    ACCREDITATION_TYPE: ACCREDITATION_TYPE,
    ENTITY: ENTITY, VENUE: VENUE,
    ACTIVITY_CATEGORIES: ACTIVITY_CATEGORIES,
    LABEL: LABEL, BADGE: BADGE,
    NOTIF: NOTIF, NOTIF_ICON: NOTIF_ICON,
    NOTIF_GROUP: NOTIF_GROUP, NOTIF_GROUP_LABEL: NOTIF_GROUP_LABEL,
    NOTIF_URGENT: NOTIF_URGENT,
    REQUIREMENT_TEMPLATES: REQUIREMENT_TEMPLATES,
    TERMINAL_REPORT_DEADLINE_DAYS: TERMINAL_REPORT_DEADLINE_DAYS,
    PROPOSAL_WAITING_ALERT_DAYS: PROPOSAL_WAITING_ALERT_DAYS,
    PROPOSAL_MANAGERS: PROPOSAL_MANAGERS,
    TRASH_RETENTION_DAYS: TRASH_RETENTION_DAYS,
    ACCOUNT_MANAGERS: ACCOUNT_MANAGERS,
    ACCOUNT_REQUEST: ACCOUNT_REQUEST,
    STORAGE_KEY: STORAGE_KEY, SESSION_KEY: SESSION_KEY
  };
})();
