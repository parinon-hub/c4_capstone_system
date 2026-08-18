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
     Marking an event Finished creates the terminal report obligation and its
     deadline. Nothing else in the system may set an activity to Completed.
     ------------------------------------------------------------------------- */

  function markEventFinished(activityId) {
    var activity = SASO.model.activityById(activityId);
    if (!activity) { return null; }

    var deadline = new Date();
    deadline.setDate(deadline.getDate() + C.TERMINAL_REPORT_DEADLINE_DAYS);
    var deadlineStr = deadline.toISOString().slice(0, 10);

    changeStatus(activityId, 'eventStatus', C.EVENT.FINISHED, {
      notifySaso: {
        type: C.NOTIF.EVENT_FINISHED,
        message: activity.title + ' finished — terminal report pending from ' +
                 SASO.model.orgAcronym(activity.organizationId) + '.'
      },
      notifyOrg: {
        type: C.NOTIF.EVENT_FINISHED,
        message: activity.title + ' has finished. Terminal report due ' +
                 SASO.model.formatDate(deadlineStr) + '.'
      }
    });

    var existing = SASO.model.terminalReportFor(activityId);
    if (!existing) {
      db().terminalReports.push({
        id: SASO.storage.nextId('tr'),
        activityId: activityId,
        deadline: deadlineStr,
        narrative: null,
        actualParticipants: null,
        outcomes: null,
        issues: null,
        attachments: [],
        submittedAt: null,
        status: C.TERMINAL.REQUIRED,
        reviewedAt: null,
        remarks: null
      });
    } else {
      existing.deadline = deadlineStr;
      existing.status = C.TERMINAL.REQUIRED;
    }

    changeStatus(activityId, 'terminalReportStatus', C.TERMINAL.REQUIRED, {});
    SASO.storage.save();
    return activity;
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

  return {
    changeStatus: changeStatus,
    markEventFinished: markEventFinished,
    postComment: postComment,
    logHistory: logHistory,
    notifyOrg: notifyOrg,
    notifySaso: notifySaso
  };
})();
