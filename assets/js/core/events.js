/* =========================================================================
   events.js  —  The single funnel for state changes.

   Every module built from Phase 3 onward changes activity state through
   SASO.events.changeStatus(). It writes the status history entry (BR-12)
   and queues the notification (BR-11) in one place, so the notification
   centre never has to be retrofitted and the workflow timeline is always
   complete.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.events = (function () {
  'use strict';

  var C = SASO.config;

  function db() { return SASO.storage.load(); }

  /* ---- status history ---------------------------------------------------- */

  function logHistory(activityId, field, fromValue, toValue, remarks) {
    var actor = SASO.auth.current();
    db().statusHistory.push({
      id: SASO.storage.nextId('hist'),
      activityId: activityId,
      field: field,
      fromValue: fromValue,
      toValue: toValue,
      actorName: actor ? actor.name : 'System',
      actorRole: actor ? actor.role : C.ROLE.SASO,
      remarks: remarks || null,
      timestamp: new Date().toISOString()
    });
  }

  /* ---- notifications ------------------------------------------------------ */

  function notifyOrg(orgId, activityId, type, message) {
    db().notifications.push({
      id: SASO.storage.nextId('ntf'),
      recipientRole: C.ROLE.ORG,
      recipientOrgId: orgId,
      activityId: activityId,
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  function notifySaso(activityId, type, message) {
    db().notifications.push({
      id: SASO.storage.nextId('ntf'),
      recipientRole: C.ROLE.SASO,
      recipientOrgId: null,
      activityId: activityId,
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  /* ---- the funnel ---------------------------------------------------------
     field: 'proposalStatus' | 'eventStatus' | 'terminalReportStatus'
     opts:  { remarks, notifyOrg: {type, message}, notifySaso: {type, message} }
     ------------------------------------------------------------------------- */

  function changeStatus(activityId, field, toValue, opts) {
    opts = opts || {};
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var fromValue = activity[field];
    if (fromValue === toValue) { return activity; }

    activity[field] = toValue;
    activity.updatedAt = new Date().toISOString();

    logHistory(activityId, field, fromValue, toValue, opts.remarks);

    if (opts.notifyOrg) {
      notifyOrg(activity.organizationId, activityId, opts.notifyOrg.type, opts.notifyOrg.message);
    }
    if (opts.notifySaso) {
      notifySaso(activityId, opts.notifySaso.type, opts.notifySaso.message);
    }

    SASO.storage.save();
    return activity;
  }

  /* ---- Business Rule 8 ----------------------------------------------------
     Marking an event Finished creates the post-activity requirement set and
     its deadline. Completion is then derived from those documents; nothing
     in the system sets an activity to Completed directly.
     ------------------------------------------------------------------------- */

  function markEventFinished(activityId) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var deadline = new Date();
    deadline.setDate(deadline.getDate() + SASO.model.settings().reportDeadlineDays);
    activity.reportDeadline = deadline.toISOString().slice(0, 10);

    /* Create the post-activity checklist if it does not exist yet. */
    var existing = SASO.model.requirementsFor(activityId, C.PHASE.POST_ACTIVITY);
    if (!existing.length) {
      C.REQUIREMENT_TEMPLATES.POST_ACTIVITY.forEach(function (t) {
        db().requirements.push({
          id: SASO.storage.nextId('req'), activityId: activityId,
          phase: C.PHASE.POST_ACTIVITY, name: t.name, mandatory: t.mandatory,
          source: t.source, status: C.REQUIREMENT.NOT_SUBMITTED,
          fileName: null, submittedAt: null, reviewedAt: null,
          reviewedBy: null, remarks: null, requestedBySaso: false
        });
      });
    }

    changeStatus(activityId, 'eventStatus', C.EVENT.FINISHED, {
      notifySaso: { type: C.NOTIF.EVENT_FINISHED,
        message: activity.title + ' finished: post-activity reports pending from ' +
                 SASO.model.orgAcronym(activity.organizationId) + '.' },
      notifyOrg: { type: C.NOTIF.EVENT_FINISHED,
        message: activity.title + ' has finished. Post-activity reports are due ' +
                 SASO.model.formatDate(activity.reportDeadline) + '.' }
    });

    SASO.storage.save();
    return activity;
  }

  /* ---- approval routing ----------------------------------------------------
     SASO endorses, then records transmittal to and decisions from the offices
     further up the route. The later offices do not act in this system.
     ------------------------------------------------------------------------- */

  function endorse(activityId, remarks) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var sasoLeg = SASO.model.routeFor(activityId).filter(function (r) {
      return r.office === C.OFFICE.SASO;
    })[0];
    if (sasoLeg) {
      sasoLeg.decidedAt = new Date().toISOString();
      sasoLeg.decision = 'Endorsed';
      sasoLeg.remarks = remarks || null;
    }

    changeStatus(activityId, 'proposalStatus', C.PROPOSAL.SASO_ENDORSED, {
      remarks: remarks,
      notifyOrg: { type: C.NOTIF.ENDORSED,
        message: 'SASO has endorsed ' + activity.title + ' for approval.' }
    });
    SASO.storage.save();
    return activity;
  }

  /* Records that the papers were transmitted to the next office. */
  function transmitTo(activityId, office, remarks) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    db().routing.push({
      id: SASO.storage.nextId('rt'), activityId: activityId, office: office,
      transmittedAt: new Date().toISOString(), decidedAt: null,
      decision: null, remarks: remarks || null
    });

    var next = office === C.OFFICE.VPAA ? C.PROPOSAL.WITH_VPAA : C.PROPOSAL.WITH_PRESIDENT;
    changeStatus(activityId, 'proposalStatus', next, {
      remarks: remarks,
      notifyOrg: { type: C.NOTIF.ROUTED,
        message: activity.title + ' is now with the ' + C.LABEL[office] + '.' }
    });
    SASO.storage.save();
    return activity;
  }

  /* Records a decision received back from an office up the route. */
  function recordDecision(activityId, office, decision, remarks) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var leg = SASO.model.routeFor(activityId).filter(function (r) {
      return r.office === office && !r.decidedAt;
    })[0];
    if (leg) {
      leg.decidedAt = new Date().toISOString();
      leg.decision = decision;
      leg.remarks = remarks || null;
    }

    if (decision === 'Approved' && office === C.OFFICE.PRESIDENT) {
      activity.approvedAt = new Date().toISOString();
      changeStatus(activityId, 'proposalStatus', C.PROPOSAL.APPROVED, {
        remarks: remarks,
        notifyOrg: { type: C.NOTIF.PROPOSAL_APPROVED,
          message: 'Activity approved: you may proceed with ' + activity.title + '.' }
      });
    } else if (decision === 'Returned' || decision === 'Rejected') {
      changeStatus(activityId, 'proposalStatus', C.PROPOSAL.REVISION_REQUIRED, {
        remarks: remarks,
        notifyOrg: { type: C.NOTIF.PROPOSAL_RETURNED,
          message: activity.title + ' was returned by the ' + C.LABEL[office] +
                   (remarks ? ': ' + remarks : '.') }
      });
    }
    SASO.storage.save();
    return activity;
  }

  /* ---- activity creation (Phase 3) -----------------------------------------
     An organization drafts an activity, then submits it. Submitting opens the
     SASO leg of the approval route and notifies the office.
     ------------------------------------------------------------------------------ */

  /* Builds the pre-approval checklist for a venue type. Off-campus activities
     additionally require the CMO 63 documentation. */
  function preApprovalTemplate(venueType) {
    var tpl = C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_COMMON.slice();
    if (venueType === C.VENUE.OFF_CAMPUS) {
      tpl = tpl.concat(C.REQUIREMENT_TEMPLATES.PRE_APPROVAL_OFF_CAMPUS_EXTRA);
    }
    return tpl;
  }

  /* Adds or removes pre-approval requirements so the checklist matches the
     venue type. Statuses of surviving rows are preserved, so switching a draft
     from on-campus to off-campus does not discard work already done. */
  function syncRequirements(activityId, venueType) {
    var wanted = preApprovalTemplate(venueType);
    var wantedNames = wanted.map(function (t) { return t.name; });
    var data = db();

    data.requirements = data.requirements.filter(function (r) {
      return !(r.activityId === activityId &&
               r.phase === C.PHASE.PRE_APPROVAL &&
               wantedNames.indexOf(r.name) === -1);
    });

    var existing = SASO.model.requirementsFor(activityId, C.PHASE.PRE_APPROVAL)
      .map(function (r) { return r.name; });

    wanted.forEach(function (t) {
      if (existing.indexOf(t.name) !== -1) { return; }
      data.requirements.push({
        id: SASO.storage.nextId('req'), activityId: activityId,
        phase: C.PHASE.PRE_APPROVAL, name: t.name, mandatory: t.mandatory,
        source: t.source, status: C.REQUIREMENT.NOT_SUBMITTED,
        fileName: null, submittedAt: null, reviewedAt: null,
        reviewedBy: null, remarks: null, requestedBySaso: false
      });
    });
  }

  function saveDraft(form, activityId) {
    var actor = SASO.auth.current();
    if (!actor || actor.role !== C.ROLE.ORG) { return null; }

    var now = new Date().toISOString();
    var activity = activityId ? SASO.model.activityById(activityId) : null;

    if (!activity) {
      activity = {
        id: SASO.storage.nextId('act'),
        organizationId: actor.organizationId,
        proposalStatus: C.PROPOSAL.DRAFT,
        eventStatus: C.EVENT.NOT_APPLICABLE,
        reportDeadline: null,
        createdAt: now, submittedAt: null, approvedAt: null
      };
      db().activities.push(activity);
      logHistory(activity.id, 'proposalStatus', null, C.PROPOSAL.DRAFT, 'Draft created.');
    }

    ['title','category','venueType','venue','dateStart','dateEnd','timeStart','timeEnd',
     'expectedParticipants','participantDescription','rationale','objectives',
     'description','budget','fundSource'].forEach(function (k) {
      if (form[k] !== undefined) { activity[k] = form[k]; }
    });
    activity.updatedAt = now;

    syncRequirements(activity.id, activity.venueType);
    SASO.storage.save();
    return activity;
  }

  /* Marks the requirements the organization attached during the wizard. */
  function attachRequirement(activityId, name, fileName) {
    var req = SASO.model.requirementsFor(activityId, C.PHASE.PRE_APPROVAL)
      .filter(function (r) { return r.name === name; })[0];
    if (!req) { return null; }
    req.fileName = fileName;
    req.status = C.REQUIREMENT.UNDER_REVIEW;
    req.submittedAt = new Date().toISOString();
    req.remarks = null;
    SASO.storage.save();
    return req;
  }

  function detachRequirement(activityId, name) {
    var req = SASO.model.requirementsFor(activityId, C.PHASE.PRE_APPROVAL)
      .filter(function (r) { return r.name === name; })[0];
    if (!req) { return null; }
    req.fileName = null;
    req.status = C.REQUIREMENT.NOT_SUBMITTED;
    req.submittedAt = null;
    SASO.storage.save();
    return req;
  }

  function submitProposal(activityId) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var now = new Date().toISOString();
    activity.submittedAt = now;

    /* Open the SASO leg of the approval route. */
    db().routing.push({
      id: SASO.storage.nextId('rt'), activityId: activityId,
      office: C.OFFICE.SASO, transmittedAt: now,
      decidedAt: null, decision: null, remarks: null
    });

    changeStatus(activityId, 'proposalStatus', C.PROPOSAL.SUBMITTED, {
      notifySaso: {
        type: C.NOTIF.PROPOSAL_SUBMITTED,
        message: 'New proposal submitted by ' +
                 SASO.model.orgAcronym(activity.organizationId) + ': ' + activity.title + '.'
      },
      notifyOrg: {
        type: C.NOTIF.PROPOSAL_SUBMITTED,
        message: 'Proposal submitted successfully: ' + activity.title + '.'
      }
    });

    SASO.storage.save();
    return activity;
  }

  /* ---- SASO review actions (Phase 4) ---------------------------------------- */

  function reviewRequirement(requirementId, decision, remarks) {
    var req = SASO.model.requirementById(requirementId);
    if (!req) { return null; }
    var activity = SASO.model.activityById(req.activityId);
    var actor = SASO.auth.current();

    req.status = decision === 'APPROVE' ? C.REQUIREMENT.APPROVED : C.REQUIREMENT.NEEDS_REVISION;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = actor ? actor.name : 'SASO';
    req.remarks = remarks || null;

    notifyOrg(activity.organizationId, activity.id,
      decision === 'APPROVE' ? C.NOTIF.REQUIREMENT_APPROVED : C.NOTIF.REQUIREMENT_RETURNED,
      decision === 'APPROVE'
        ? req.name + ' approved for ' + activity.title + '.'
        : req.name + ' needs revision: ' + (remarks || 'see remarks') + '.');

    SASO.storage.save();
    return req;
  }

  /* SASO may add a requirement not in the standard checklist. */
  function requestRequirement(activityId, name, phase, remarks) {
    var activity = SASO.model.activityById(activityId);
    if (!activity || !name) { return null; }

    db().requirements.push({
      id: SASO.storage.nextId('req'), activityId: activityId,
      phase: phase || C.PHASE.PRE_APPROVAL, name: name, mandatory: true,
      source: 'SASO_REQUEST', status: C.REQUIREMENT.NOT_SUBMITTED,
      fileName: null, submittedAt: null, reviewedAt: null,
      reviewedBy: null, remarks: remarks || null, requestedBySaso: true
    });

    if (activity.proposalStatus === C.PROPOSAL.FOR_REVIEW ||
        activity.proposalStatus === C.PROPOSAL.SUBMITTED) {
      changeStatus(activityId, 'proposalStatus', C.PROPOSAL.REQUIREMENTS_NEEDED, {
        remarks: 'Additional requirement requested: ' + name
      });
    }

    notifyOrg(activity.organizationId, activityId, C.NOTIF.REQUIREMENT_REQUESTED,
      'SASO requested: ' + name + ' for ' + activity.title + '.');

    SASO.storage.save();
    return activity;
  }

  function openForReview(activityId) {
    var activity = SASO.model.activityById(activityId);
    if (!activity || activity.proposalStatus !== C.PROPOSAL.SUBMITTED) { return activity; }
    return changeStatus(activityId, 'proposalStatus', C.PROPOSAL.FOR_REVIEW, {
      notifyOrg: { type: C.NOTIF.PROPOSAL_UNDER_REVIEW,
        message: 'Your proposal for ' + activity.title + ' is under review.' }
    });
  }

  function returnProposal(activityId, remarks) {
    var activity = SASO.model.activityById(activityId);
    return changeStatus(activityId, 'proposalStatus', C.PROPOSAL.REVISION_REQUIRED, {
      remarks: remarks,
      notifyOrg: { type: C.NOTIF.PROPOSAL_RETURNED,
        message: activity.title + ' was returned for revision: ' + remarks }
    });
  }

  function rejectProposal(activityId, remarks) {
    var activity = SASO.model.activityById(activityId);
    return changeStatus(activityId, 'proposalStatus', C.PROPOSAL.REJECTED, {
      remarks: remarks,
      notifyOrg: { type: C.NOTIF.PROPOSAL_REJECTED,
        message: activity.title + ' was not approved: ' + remarks }
    });
  }

  function setEventStatus(activityId, status, remarks) {
    if (status === C.EVENT.FINISHED) { return markEventFinished(activityId); }
    var activity = SASO.model.activityById(activityId);
    return changeStatus(activityId, 'eventStatus', status, {
      remarks: remarks,
      notifyOrg: { type: C.NOTIF.ROUTED,
        message: activity.title + ' is now marked ' + C.LABEL[status] + '.' }
    });
  }

  /* The organization attaches a post-activity report. */
  function submitReport(activityId, requirementName, fileName) {
    var req = SASO.model.requirementsFor(activityId, C.PHASE.POST_ACTIVITY)
      .filter(function (r) { return r.name === requirementName; })[0];
    if (!req) { return null; }

    var activity = SASO.model.activityById(activityId);
    req.fileName = fileName;
    req.status = C.REQUIREMENT.UNDER_REVIEW;
    req.submittedAt = new Date().toISOString();
    req.remarks = null;

    notifySaso(activityId, C.NOTIF.TR_SUBMITTED,
      SASO.model.orgAcronym(activity.organizationId) + ' submitted ' +
      requirementName + ' for ' + activity.title + '.');

    SASO.storage.save();
    return req;
  }

  /* The narrative side of the post-activity return. SASO tracks three
     documents per activity; this records the figures that accompany them and
     that the accomplishment reports are built from. */
  function recordOutcome(activityId, data) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    activity.outcome = {
      actualParticipants: data.actualParticipants || null,
      summary: data.summary || null,
      issues: data.issues || null,
      recordedAt: new Date().toISOString()
    };
    activity.updatedAt = activity.outcome.recordedAt;
    SASO.storage.save();
    return activity;
  }

  /* Follow-up on an outstanding document. The panel asked SASO to be able to
     call out organizations that have not submitted; this is that action at the
     level of a single document. */
  function sendReminder(requirementId, message) {
    var req = SASO.model.requirementById(requirementId);
    if (!req) { return null; }
    var activity = SASO.model.activityById(req.activityId);

    notifyOrg(activity.organizationId, activity.id, C.NOTIF.REQUIREMENT_REQUESTED,
      'Reminder from SASO: ' + req.name + ' is still outstanding for ' + activity.title + '.');

    if (message) { postComment(activity.id, message); }

    req.remindedAt = new Date().toISOString();
    SASO.storage.save();
    return req;
  }

  /* ---- comments ------------------------------------------------------------ */

  function postComment(activityId, message, requirementId) {
    var actor = SASO.auth.current();
    if (!actor || !message) { return null; }

    var activity = SASO.model.activityById(activityId);
    var comment = {
      id: SASO.storage.nextId('cmt'),
      activityId: activityId,
      senderId: actor.id,
      senderName: actor.name,
      role: actor.role,
      message: message,
      requirementId: requirementId || null,
      timestamp: new Date().toISOString(),
      readByCounterpart: false
    };
    db().comments.push(comment);

    if (actor.role === C.ROLE.SASO) {
      notifyOrg(activity.organizationId, activityId, C.NOTIF.COMMENT_POSTED,
        'SASO commented on ' + activity.title + '.');
    } else {
      notifySaso(activityId, C.NOTIF.COMMENT_POSTED,
        SASO.model.orgAcronym(activity.organizationId) + ' replied on ' + activity.title + '.');
    }

    SASO.storage.save();
    return comment;
  }

  /* ---- editing, deleting and the trash bin ---------------------------------
     A proposal still under SASO review may be edited or deleted by the
     organization that sent it, or by the SASO Head, Administrative Aide and
     Student Activities Coordinator (config.PROPOSAL_MANAGERS). Every change
     notifies the organization AND each of those three staff accounts
     individually, so the person who did not make the change still learns of it.

     Deleting moves the proposal — with its requirements, comments, routing and
     status history — into a trash bin. It can be restored from there, or
     permanently deleted. Anything left for TRASH_RETENTION_DAYS is permanently
     deleted automatically the next time any page loads.
     ---------------------------------------------------------------------------- */

  var EDITABLE_FIELDS = {
    title: 'title', category: 'category', venueType: 'venue type', venue: 'venue',
    dateStart: 'start date', dateEnd: 'end date', timeStart: 'start time',
    timeEnd: 'end time', expectedParticipants: 'expected participants',
    participantDescription: 'participant description', budget: 'budget',
    fundSource: 'fund source', rationale: 'rationale', objectives: 'objectives',
    description: 'description'
  };

  /* How the actor is named to everyone else. */
  function actorLabel(actor) {
    if (!actor) { return 'The system'; }
    if (actor.role === C.ROLE.ORG) { return SASO.model.orgAcronym(actor.organizationId); }
    return actor.name + ' (SASO)';
  }

  /* Sends one notification to the organization and one to each SASO proposal
     manager. The account that made the change gets the `selfMessage` wording. */
  function notifyProposalChange(activity, type, othersMessage, selfMessage, actor) {
    var now = new Date().toISOString();
    var orgIsActor = actor && actor.role === C.ROLE.ORG &&
                     actor.organizationId === activity.organizationId;

    notifyOrg(activity.organizationId, activity.id, type,
      orgIsActor ? selfMessage : othersMessage);

    SASO.model.proposalManagers().forEach(function (u) {
      db().notifications.push({
        id: SASO.storage.nextId('ntf'),
        recipientRole: C.ROLE.SASO,
        recipientOrgId: null,
        recipientUserId: u.id,
        activityId: activity.id,
        type: type,
        message: actor && actor.userId === u.id ? selfMessage : othersMessage,
        timestamp: now,
        read: false
      });
    });
  }

  function sameValue(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
      return JSON.stringify(a || []) === JSON.stringify(b || []);
    }
    var x = a === null || a === undefined ? '' : String(a);
    var y = b === null || b === undefined ? '' : String(b);
    return x === y;
  }

  /* Returns { activity, changed: [field labels] } or null if not permitted. */
  function editProposal(activityId, form, reason) {
    var actor = SASO.auth.current();
    var activity = SASO.model.activityById(activityId);
    if (!SASO.model.canModifyProposal(actor, activity)) { return null; }

    var changed = [];
    Object.keys(EDITABLE_FIELDS).forEach(function (k) {
      if (form[k] === undefined) { return; }
      if (!sameValue(activity[k], form[k])) {
        changed.push(EDITABLE_FIELDS[k]);
        activity[k] = form[k];
      }
    });
    if (!changed.length) { return { activity: activity, changed: [] }; }

    var now = new Date().toISOString();
    activity.updatedAt = now;
    activity.lastEditedAt = now;
    activity.lastEditedBy = actor.name;
    activity.lastEditedByRole = actor.role;

    /* Switching venue type adds or removes the CMO 63 requirement. */
    if (changed.indexOf('venue type') !== -1) { syncRequirements(activityId, activity.venueType); }

    var summary = 'Changed ' + changed.join(', ') + '.' + (reason ? ' Reason: ' + reason : '');
    logHistory(activityId, 'record', null, 'EDITED', summary);

    notifyProposalChange(activity, C.NOTIF.PROPOSAL_EDITED,
      actorLabel(actor) + ' edited the proposal ' + activity.title + '. ' + summary,
      'You edited the proposal ' + activity.title + '. ' + summary, actor);

    SASO.storage.save();
    return { activity: activity, changed: changed };
  }

  function deleteProposal(activityId, reason) {
    var actor = SASO.auth.current();
    var activity = SASO.model.activityById(activityId);
    if (!SASO.model.canModifyProposal(actor, activity)) { return null; }

    var data = db();
    var now = new Date();
    var purgeAt = new Date(now);
    purgeAt.setDate(purgeAt.getDate() + C.TRASH_RETENTION_DAYS);

    logHistory(activityId, 'record', activity.proposalStatus, 'DELETED', reason || null);

    function take(list) {
      return data[list].filter(function (r) { return r.activityId === activityId; });
    }
    function drop(list) {
      data[list] = data[list].filter(function (r) { return r.activityId !== activityId; });
    }

    var item = {
      id: SASO.storage.nextId('trash'),
      activity: activity,
      requirements: take('requirements'),
      comments: take('comments'),
      routing: take('routing'),
      statusHistory: take('statusHistory'),
      deletedAt: now.toISOString(),
      deletedBy: actor.name,
      deletedByRole: actor.role,
      deletedByUserId: actor.userId,
      reason: reason || null,
      purgeAt: purgeAt.toISOString()
    };

    ['requirements', 'comments', 'routing', 'statusHistory'].forEach(drop);
    data.activities = data.activities.filter(function (a) { return a.id !== activityId; });
    SASO.model.trash().push(item);

    notifyProposalChange(activity, C.NOTIF.PROPOSAL_DELETED,
      actorLabel(actor) + ' deleted the proposal ' + activity.title +
        (reason ? ': ' + reason : '') + '. It stays in the trash bin for ' +
        C.TRASH_RETENTION_DAYS + ' days.',
      'You deleted the proposal ' + activity.title + '. It stays in the trash bin for ' +
        C.TRASH_RETENTION_DAYS + ' days.', actor);

    SASO.storage.save();
    return item;
  }

  function restoreProposal(trashId) {
    var actor = SASO.auth.current();
    var data = db();
    var item = SASO.model.trash().filter(function (t) { return t.id === trashId; })[0];
    if (!item || !SASO.model.canManageProposals(actor)) { return null; }
    if (actor.role === C.ROLE.ORG && item.activity.organizationId !== actor.organizationId) {
      return null;
    }

    var activity = item.activity;
    activity.updatedAt = new Date().toISOString();
    data.activities.push(activity);
    ['requirements', 'comments', 'routing', 'statusHistory'].forEach(function (list) {
      data[list] = data[list].concat(item[list] || []);
    });
    data.trash = data.trash.filter(function (t) { return t.id !== trashId; });

    logHistory(activity.id, 'record', 'DELETED', 'RESTORED', null);

    notifyProposalChange(activity, C.NOTIF.PROPOSAL_RESTORED,
      actorLabel(actor) + ' restored the proposal ' + activity.title +
        ' from the trash bin. It is back under SASO review.',
      'You restored the proposal ' + activity.title + ' from the trash bin.', actor);

    SASO.storage.save();
    return activity;
  }

  /* Permanent deletion — from the trash bin's Confirm deletion button, or
     automatically once the retention period lapses (auto = true). */
  function purgeProposal(trashId, auto) {
    var actor = auto ? null : SASO.auth.current();
    var data = db();
    var item = SASO.model.trash().filter(function (t) { return t.id === trashId; })[0];
    if (!item) { return null; }
    if (!auto) {
      if (!SASO.model.canManageProposals(actor)) { return null; }
      if (actor.role === C.ROLE.ORG && item.activity.organizationId !== actor.organizationId) {
        return null;
      }
    }

    data.trash = data.trash.filter(function (t) { return t.id !== trashId; });

    var title = item.activity.title;
    notifyProposalChange(item.activity, C.NOTIF.PROPOSAL_PURGED,
      auto
        ? title + ' was permanently deleted after ' + C.TRASH_RETENTION_DAYS +
          ' days in the trash bin.'
        : actorLabel(actor) + ' permanently deleted the proposal ' + title + '.',
      'You permanently deleted the proposal ' + title + '.', actor);

    SASO.storage.save();
    return item;
  }

  /* Called on every page load. */
  function purgeExpiredTrash() {
    var now = new Date();
    SASO.model.trash()
      .filter(function (t) { return new Date(t.purgeAt) <= now; })
      .forEach(function (t) { purgeProposal(t.id, true); });
  }

  /* ---- organization accounts -------------------------------------------------
     No open sign-up. An organization either requests an account from the
     sign-in screen and waits for SASO's approval, or SASO creates the account
     directly. Either way the Head, Administrative Aide and Coordinator
     (config.ACCOUNT_MANAGERS) are each notified, and the new organization
     finds a welcome notification when it first signs in.
     ---------------------------------------------------------------------------- */

  function notifyAccountManagers(type, othersMessage, selfMessage, actor, requestId) {
    var now = new Date().toISOString();
    SASO.model.accountManagers().forEach(function (u) {
      db().notifications.push({
        id: SASO.storage.nextId('ntf'),
        recipientRole: C.ROLE.SASO, recipientOrgId: null, recipientUserId: u.id,
        activityId: null, requestId: requestId || null, type: type,
        message: actor && actor.userId === u.id ? selfMessage : othersMessage,
        timestamp: now, read: false
      });
    });
  }

  /* AR-2026-0007 — sequential within the year. */
  function nextRequestRef() {
    var year = new Date().getFullYear();
    var prefix = 'AR-' + year + '-';
    var max = 0;
    SASO.model.accountRequests().forEach(function (r) {
      if (r.ref.indexOf(prefix) === 0) { max = Math.max(max, parseInt(r.ref.slice(prefix.length), 10) || 0); }
    });
    return prefix + ('000' + (max + 1)).slice(-4);
  }

  var ORG_FIELDS = ['name', 'acronym', 'entityType', 'college', 'adviser'];
  var OFFICER_FIELDS = ['officerName', 'officerPosition', 'email', 'contact', 'username'];

  /* Public: called from the Request an account page, with no one signed in. */
  function submitAccountRequest(form) {
    if (SASO.model.usernameTaken(form.username) || SASO.model.acronymTaken(form.acronym)) {
      return null;
    }
    var req = {
      id: SASO.storage.nextId('areq'),
      ref: nextRequestRef(),
      status: C.ACCOUNT_REQUEST.PENDING,
      submittedAt: new Date().toISOString(),
      password: form.password,                 /* prototype only — plain text, like every account */
      proofFileName: form.proofFileName || null,
      notes: form.notes || null,
      reviewedAt: null, reviewedBy: null, remarks: null,
      createdOrgId: null, createdUserId: null
    };
    ORG_FIELDS.concat(OFFICER_FIELDS).forEach(function (k) { req[k] = (form[k] || '').trim(); });
    SASO.model.accountRequests().push(req);

    notifyAccountManagers(C.NOTIF.ACCOUNT_REQUESTED,
      req.acronym + ' (' + req.name + ') requested an organization account: ' + req.ref + '.',
      null, null, req.id);

    SASO.storage.save();
    return req;
  }

  /* Creates the organization record and its sign-in account. */
  function createOrgAndUser(src, standing, via) {
    var data = db();
    var org = {
      id: SASO.storage.nextId('org'),
      name: src.name, acronym: src.acronym,
      entityType: src.entityType || C.ENTITY.STUDENT_ORG,
      college: src.college, adviser: src.adviser,
      accreditationLevel: standing.accreditationLevel || C.ACCREDITATION_LEVEL.RECOGNIZED,
      accreditationType: standing.accreditationLevel === C.ACCREDITATION_LEVEL.RECOGNIZED || !standing.accreditationLevel
        ? C.ACCREDITATION_TYPE.NOT_APPLICABLE
        : (standing.accreditationType || C.ACCREDITATION_TYPE.ACCREDITED),
      accreditationAY: SASO.model.currentAY(),
      accreditationExpires: standing.accreditationExpires || null,
      createdAt: new Date().toISOString(),
      createdVia: via
    };
    var user = {
      id: SASO.storage.nextId('usr'),
      username: src.username, password: src.password,
      name: src.officerName,
      position: src.officerPosition + ', ' + src.acronym,
      email: src.email || null, contact: src.contact || null,
      role: C.ROLE.ORG, organizationId: org.id
    };
    data.organizations.push(org);
    data.users.push(user);
    return { org: org, user: user };
  }

  function approveAccountRequest(requestId, standing, remarks) {
    var actor = SASO.auth.current();
    var req = SASO.model.accountRequestById(requestId);
    if (!req || req.status !== C.ACCOUNT_REQUEST.PENDING || !SASO.model.canManageAccounts(actor)) {
      return { ok: false, message: 'This request can no longer be approved.' };
    }
    if (SASO.model.usernameTaken(req.username, req.id)) {
      return { ok: false, message: 'The username "' + req.username + '" is already in use. Decline the request and ask the organization to file again.' };
    }
    if (SASO.model.acronymTaken(req.acronym, req.id)) {
      return { ok: false, message: 'An organization with the acronym ' + req.acronym + ' already exists.' };
    }

    var made = createOrgAndUser(req, standing || {}, 'REQUEST');
    req.status = C.ACCOUNT_REQUEST.APPROVED;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = actor.name;
    req.remarks = remarks || null;
    req.createdOrgId = made.org.id;
    req.createdUserId = made.user.id;

    notifyOrg(made.org.id, null, C.NOTIF.ACCOUNT_APPROVED,
      'Welcome to SASO Activity Monitoring. Your account request ' + req.ref +
      ' was approved by ' + actor.name + '. You can now submit activity proposals.' +
      (remarks ? ' Note from SASO: ' + remarks : ''));
    notifyAccountManagers(C.NOTIF.ACCOUNT_APPROVED,
      actor.name + ' approved the account request of ' + req.acronym + ' (' + req.ref + ').',
      'You approved the account request of ' + req.acronym + ' (' + req.ref + ').', actor, req.id);

    SASO.storage.save();
    return { ok: true, request: req, org: made.org, user: made.user };
  }

  function declineAccountRequest(requestId, remarks) {
    var actor = SASO.auth.current();
    var req = SASO.model.accountRequestById(requestId);
    if (!req || req.status !== C.ACCOUNT_REQUEST.PENDING || !SASO.model.canManageAccounts(actor)) {
      return null;
    }
    req.status = C.ACCOUNT_REQUEST.DECLINED;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = actor.name;
    req.remarks = remarks || null;

    notifyAccountManagers(C.NOTIF.ACCOUNT_DECLINED,
      actor.name + ' declined the account request of ' + req.acronym + ' (' + req.ref + ')' +
        (remarks ? ': ' + remarks : '.'),
      'You declined the account request of ' + req.acronym + ' (' + req.ref + ').', actor, req.id);

    SASO.storage.save();
    return req;
  }

  /* SASO adds a newly recognized organization and its account directly. */
  function createOrganizationAccount(form) {
    var actor = SASO.auth.current();
    if (!SASO.model.canManageAccounts(actor)) { return { ok: false, message: 'Not permitted.' }; }
    if (SASO.model.usernameTaken(form.username)) {
      return { ok: false, message: 'That username is already in use.' };
    }
    if (SASO.model.acronymTaken(form.acronym)) {
      return { ok: false, message: 'An organization with that acronym already exists.' };
    }
    var made = createOrgAndUser(form, form, 'SASO');

    notifyOrg(made.org.id, null, C.NOTIF.ACCOUNT_APPROVED,
      'Welcome to SASO Activity Monitoring. Your organization account was created by ' +
      actor.name + '. You can now submit activity proposals.');
    notifyAccountManagers(C.NOTIF.ACCOUNT_CREATED,
      actor.name + ' added ' + made.org.acronym + ' and created its account (' + made.user.username + ').',
      'You added ' + made.org.acronym + ' and created its account (' + made.user.username + ').', actor);

    SASO.storage.save();
    return { ok: true, org: made.org, user: made.user };
  }

  /* SASO corrects an organization's details or its sign-in account. A blank
     password keeps the current one. When the organization has no account
     (it was deleted), saving with a username and password creates a new one. */
  function updateOrganizationAccount(orgId, form) {
    var actor = SASO.auth.current();
    if (!SASO.model.canManageAccounts(actor)) { return { ok: false, message: 'Not permitted.' }; }
    var org = SASO.model.orgById(orgId);
    if (!org) { return { ok: false, message: 'This organization no longer exists.' }; }
    var user = SASO.model.accountForOrg(orgId);
    var data = db();

    var acronymKey = form.acronym.toLowerCase();
    if (data.organizations.some(function (o) { return o.id !== org.id && o.acronym.toLowerCase() === acronymKey; }) ||
        SASO.model.pendingAccountRequests().some(function (r) { return r.acronym.toLowerCase() === acronymKey; })) {
      return { ok: false, message: 'Another organization already uses the acronym ' + form.acronym + '.' };
    }
    var userKey = form.username.toLowerCase();
    if (data.users.some(function (u) { return u !== user && u.username.toLowerCase() === userKey; }) ||
        SASO.model.pendingAccountRequests().some(function (r) { return r.username.toLowerCase() === userKey; })) {
      return { ok: false, message: 'The username "' + form.username + '" is already in use.' };
    }

    ORG_FIELDS.forEach(function (k) { org[k] = form[k]; });
    org.accreditationLevel = form.accreditationLevel || C.ACCREDITATION_LEVEL.RECOGNIZED;
    org.accreditationType = org.accreditationLevel === C.ACCREDITATION_LEVEL.RECOGNIZED
      ? C.ACCREDITATION_TYPE.NOT_APPLICABLE
      : (form.accreditationType || C.ACCREDITATION_TYPE.ACCREDITED);
    org.accreditationExpires = form.accreditationExpires || null;

    var created = !user;
    if (created) {
      user = { id: SASO.storage.nextId('usr'), role: C.ROLE.ORG, organizationId: org.id };
      data.users.push(user);
    }
    user.username = form.username;
    if (form.password) { user.password = form.password; }
    user.name = form.officerName;
    user.position = form.officerPosition + ', ' + org.acronym;
    user.email = form.email || null;
    user.contact = form.contact || null;

    notifyOrg(org.id, null, C.NOTIF.ACCOUNT_UPDATED,
      created
        ? 'SASO (' + actor.name + ') created a new sign-in account for your organization.'
        : 'SASO (' + actor.name + ') updated your organization\u2019s details or sign-in account.');
    notifyAccountManagers(C.NOTIF.ACCOUNT_UPDATED,
      actor.name + (created ? ' created a new account for ' : ' edited the account of ') +
        org.acronym + ' (' + user.username + ').',
      'You ' + (created ? 'created a new account for ' : 'edited the account of ') +
        org.acronym + ' (' + user.username + ').', actor);

    SASO.storage.save();
    return { ok: true, org: org, user: user, created: created };
  }

  /* Removes an organization's sign-in account. The organization stays on the
     roster with all its activities and records; it simply can no longer sign
     in until SASO gives it a new account from Edit. */
  function deleteOrganizationAccount(orgId) {
    var actor = SASO.auth.current();
    if (!SASO.model.canManageAccounts(actor)) { return { ok: false, message: 'Not permitted.' }; }
    var org = SASO.model.orgById(orgId);
    var user = SASO.model.accountForOrg(orgId);
    if (!org || !user) { return { ok: false, message: 'This account no longer exists.' }; }

    var users = db().users;
    users.splice(users.indexOf(user), 1);

    notifyAccountManagers(C.NOTIF.ACCOUNT_DELETED,
      actor.name + ' deleted the account of ' + org.acronym + ' (' + user.username + ').',
      'You deleted the account of ' + org.acronym + ' (' + user.username + ').', actor);

    SASO.storage.save();
    return { ok: true, org: org, user: user };
  }

  return {
    /* organization accounts */
    submitAccountRequest: submitAccountRequest,
    approveAccountRequest: approveAccountRequest,
    declineAccountRequest: declineAccountRequest,
    createOrganizationAccount: createOrganizationAccount,
    updateOrganizationAccount: updateOrganizationAccount,
    deleteOrganizationAccount: deleteOrganizationAccount,
    /* editing, deleting and the trash bin */
    editProposal: editProposal,
    deleteProposal: deleteProposal,
    restoreProposal: restoreProposal,
    purgeProposal: purgeProposal,
    purgeExpiredTrash: purgeExpiredTrash,
    /* activity creation */
    saveDraft: saveDraft,
    submitProposal: submitProposal,
    attachRequirement: attachRequirement,
    detachRequirement: detachRequirement,
    preApprovalTemplate: preApprovalTemplate,
    syncRequirements: syncRequirements,
    /* approval routing */
    endorse: endorse,
    transmitTo: transmitTo,
    recordDecision: recordDecision,
    /* SASO review */
    openForReview: openForReview,
    reviewRequirement: reviewRequirement,
    requestRequirement: requestRequirement,
    returnProposal: returnProposal,
    rejectProposal: rejectProposal,
    setEventStatus: setEventStatus,
    submitReport: submitReport,
    sendReminder: sendReminder,
    recordOutcome: recordOutcome,
    /* lifecycle */
    changeStatus: changeStatus,
    markEventFinished: markEventFinished,
    postComment: postComment,
    logHistory: logHistory,
    notifyOrg: notifyOrg,
    notifySaso: notifySaso
  };
})();
