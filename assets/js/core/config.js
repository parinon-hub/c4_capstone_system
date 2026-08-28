/* =========================================================================
   config.js  —  Single source of truth for the prototype's vocabulary.
   Every status string, label and badge colour used anywhere in the system
   is declared here. Nothing else in the codebase should hard-code a status.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.config = (function () {
  'use strict';

  /* ---- Roles ---------------------------------------------------------- */
  var ROLE = {
    SASO: 'SASO',
    ORG: 'ORG'
  };

  /* ---- A. Proposal Status --------------------------------------------- */
  var PROPOSAL = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    FOR_REVIEW: 'FOR_REVIEW',
    REQUIREMENTS_NEEDED: 'REQUIREMENTS_NEEDED',
    REVISION_REQUIRED: 'REVISION_REQUIRED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  };

  /* ---- B. Requirement Status (per document) --------------------------- */
  var REQUIREMENT = {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    NEEDS_REVISION: 'NEEDS_REVISION'
  };

  /* ---- C. Event Status ------------------------------------------------- */
  /* UPCOMING / ONGOING / FINISHED / POSTPONED are preserved from Chapter 1 */
  var EVENT = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    UPCOMING: 'UPCOMING',
    ONGOING: 'ONGOING',
    FINISHED: 'FINISHED',
    POSTPONED: 'POSTPONED',
    CANCELLED: 'CANCELLED'
  };

  /* ---- D. Terminal Report Status --------------------------------------- */
  var TERMINAL = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    REQUIRED: 'REQUIRED',
    OVERDUE: 'OVERDUE',
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    NEEDS_REVISION: 'NEEDS_REVISION',
    ACCEPTED: 'ACCEPTED'
  };

  /* ---- E. Derived lifecycle stage (computed, never stored) -------------- */
  var STAGE = {
    DRAFT: 'DRAFT',
    UNDER_APPROVAL: 'UNDER_APPROVAL',
    APPROVED: 'APPROVED',
    ONGOING: 'ONGOING',
    POSTPONED: 'POSTPONED',
    AWAITING_TERMINAL_REPORT: 'AWAITING_TERMINAL_REPORT',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED'
  };

  /* ---- F. Organization accreditation -------------------------------------
     CSPC publishes a ladder, not a flag: organizations are Recognized, then
     accredited at Levels I through IV, and each level distinguishes a newly
     Accredited organization from one that has been Re-Accredited. The
     re-accreditation is the renewal the panel asked us to surface.
     -------------------------------------------------------------------------- */
  var ACCREDITATION_LEVEL = {
    RECOGNIZED: 'RECOGNIZED',
    LEVEL_I: 'LEVEL_I',
    LEVEL_II: 'LEVEL_II',
    LEVEL_III: 'LEVEL_III',
    LEVEL_IV: 'LEVEL_IV'
  };

  var ACCREDITATION_TYPE = {
    NOT_APPLICABLE: 'NOT_APPLICABLE',   /* Recognized only — not yet accredited */
    ACCREDITED: 'NEW_ACCREDITED',
    RE_ACCREDITED: 'RE_ACCREDITED'
  };

  /* ---- Human labels ----------------------------------------------------- */
  var LABEL = {
    // proposal
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    FOR_REVIEW: 'For Review',
    REQUIREMENTS_NEEDED: 'Requirements Needed',
    REVISION_REQUIRED: 'Revision Required',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    // requirement
    NOT_SUBMITTED: 'Not Submitted',
    UNDER_REVIEW: 'Under Review',
    NEEDS_REVISION: 'Needs Revision',
    // event
    NOT_APPLICABLE: 'Not Applicable',
    UPCOMING: 'Upcoming',
    ONGOING: 'Ongoing',
    FINISHED: 'Finished',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',
    // terminal report
    REQUIRED: 'Terminal Report Required',
    OVERDUE: 'Terminal Report Overdue',
    ACCEPTED: 'Accepted',
    // accreditation level
    RECOGNIZED: 'Recognized',
    LEVEL_I: 'Level I',
    LEVEL_II: 'Level II',
    LEVEL_III: 'Level III',
    LEVEL_IV: 'Level IV',
    // accreditation type
    NEW_ACCREDITED: 'Accredited',
    RE_ACCREDITED: 'Re-Accredited',
    // stage
    UNDER_APPROVAL: 'Under Approval',
    AWAITING_TERMINAL_REPORT: 'Awaiting Terminal Report',
    COMPLETED: 'Completed',
    CLOSED: 'Closed'
  };

  /* ---- Badge colour map -------------------------------------------------
     grey  = not started      blue  = in review with SASO
     amber = org must act     red   = overdue / rejected
     green = approved / done
     ----------------------------------------------------------------------- */
  var BADGE = {
    DRAFT: 'secondary',
    SUBMITTED: 'info',
    FOR_REVIEW: 'info',
    REQUIREMENTS_NEEDED: 'warning',
    REVISION_REQUIRED: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',

    NOT_SUBMITTED: 'secondary',
    UNDER_REVIEW: 'info',
    NEEDS_REVISION: 'warning',

    NOT_APPLICABLE: 'secondary',
    UPCOMING: 'primary',
    ONGOING: 'primary',
    FINISHED: 'info',
    POSTPONED: 'warning',
    CANCELLED: 'danger',

    REQUIRED: 'warning',
    OVERDUE: 'danger',
    ACCEPTED: 'success',

    RECOGNIZED: 'secondary',
    LEVEL_I: 'info',
    LEVEL_II: 'info',
    LEVEL_III: 'primary',
    LEVEL_IV: 'success',
    NEW_ACCREDITED: 'info',
    RE_ACCREDITED: 'success',

    UNDER_APPROVAL: 'info',
    AWAITING_TERMINAL_REPORT: 'warning',
    COMPLETED: 'success',
    CLOSED: 'secondary'
  };

  /* ---- Default requirement checklist -------------------------------------
     Sources are carried in the data so the traceability matrix in the
     documentation can be defended item by item during the panel defense.
     ------------------------------------------------------------------------ */
  var REQUIREMENT_TEMPLATE = [
    { name: 'Activity Proposal Form',            mandatory: true,  source: 'PANEL' },
    { name: 'Rationale',                         mandatory: true,  source: 'PANEL' },
    { name: 'Program of Activities',             mandatory: true,  source: 'ASSUMPTION' },
    { name: 'R5 — Permission to Conduct',        mandatory: true,  source: 'PANEL' },
    { name: 'Adviser Endorsement',               mandatory: true,  source: 'ASSUMPTION' },
    { name: 'Budget Proposal',                   mandatory: false, source: 'ASSUMPTION' }
  ];

  /* Days allowed to submit the terminal report after the event finishes.
     PROTOTYPE ASSUMPTION — confirm the real figure with SASO. */
  var TERMINAL_REPORT_DEADLINE_DAYS = 15;

  /* A proposal sitting in the SASO queue longer than this is highlighted. */
  var PROPOSAL_WAITING_ALERT_DAYS = 5;

  /* ---- Activity categories ---------------------------------------------- */
  var ACTIVITY_TYPES = [
    'Seminar / Training',
    'General Assembly',
    'Competition',
    'Community Extension',
    'Sports / Recreation',
    'Cultural / Socio-civic',
    'Fund Raising',
    'Others'
  ];

  /* ---- Notification types ------------------------------------------------ */
  var NOTIF = {
    PROPOSAL_SUBMITTED: 'PROPOSAL_SUBMITTED',
    PROPOSAL_UNDER_REVIEW: 'PROPOSAL_UNDER_REVIEW',
    REQUIREMENT_REQUESTED: 'REQUIREMENT_REQUESTED',
    REQUIREMENT_SUBMITTED: 'REQUIREMENT_SUBMITTED',
    REQUIREMENT_APPROVED: 'REQUIREMENT_APPROVED',
    REQUIREMENT_RETURNED: 'REQUIREMENT_RETURNED',
    PROPOSAL_APPROVED: 'PROPOSAL_APPROVED',
    PROPOSAL_RETURNED: 'PROPOSAL_RETURNED',
    PROPOSAL_REJECTED: 'PROPOSAL_REJECTED',
    COMMENT_POSTED: 'COMMENT_POSTED',
    EVENT_FINISHED: 'EVENT_FINISHED',
    TR_DUE_SOON: 'TR_DUE_SOON',
    TR_OVERDUE: 'TR_OVERDUE',
    TR_SUBMITTED: 'TR_SUBMITTED',
    TR_ACCEPTED: 'TR_ACCEPTED',
    TR_RETURNED: 'TR_RETURNED'
  };

  var NOTIF_ICON = {
    PROPOSAL_SUBMITTED: 'fa-file-circle-plus',
    PROPOSAL_UNDER_REVIEW: 'fa-magnifying-glass',
    REQUIREMENT_REQUESTED: 'fa-circle-exclamation',
    REQUIREMENT_SUBMITTED: 'fa-paperclip',
    REQUIREMENT_APPROVED: 'fa-circle-check',
    REQUIREMENT_RETURNED: 'fa-rotate-left',
    PROPOSAL_APPROVED: 'fa-stamp',
    PROPOSAL_RETURNED: 'fa-rotate-left',
    PROPOSAL_REJECTED: 'fa-circle-xmark',
    COMMENT_POSTED: 'fa-comment-dots',
    EVENT_FINISHED: 'fa-flag-checkered',
    TR_DUE_SOON: 'fa-clock',
    TR_OVERDUE: 'fa-triangle-exclamation',
    TR_SUBMITTED: 'fa-file-arrow-up',
    TR_ACCEPTED: 'fa-award',
    TR_RETURNED: 'fa-rotate-left'
  };

  /* ---- Storage ----------------------------------------------------------- */
  var STORAGE_KEY = 'cspc_saso_prototype_v1';
  var SESSION_KEY = 'cspc_saso_session_v1';

  return {
    ROLE: ROLE,
    PROPOSAL: PROPOSAL,
    REQUIREMENT: REQUIREMENT,
    EVENT: EVENT,
    TERMINAL: TERMINAL,
    STAGE: STAGE,
    ACCREDITATION_LEVEL: ACCREDITATION_LEVEL,
    ACCREDITATION_TYPE: ACCREDITATION_TYPE,
    LABEL: LABEL,
    BADGE: BADGE,
    NOTIF: NOTIF,
    NOTIF_ICON: NOTIF_ICON,
    REQUIREMENT_TEMPLATE: REQUIREMENT_TEMPLATE,
    TERMINAL_REPORT_DEADLINE_DAYS: TERMINAL_REPORT_DEADLINE_DAYS,
    PROPOSAL_WAITING_ALERT_DAYS: PROPOSAL_WAITING_ALERT_DAYS,
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    STORAGE_KEY: STORAGE_KEY,
    SESSION_KEY: SESSION_KEY
  };
})();
