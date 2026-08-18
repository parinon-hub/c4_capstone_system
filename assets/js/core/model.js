/* =========================================================================
   model.js  —  Reading and deriving state.

   Business Rules 7 and 9 live in stageOf(): an activity is Completed only
   when its terminal report has been accepted, never because its event date
   has passed. Every count on every dashboard is derived here, so no screen
   can ever disagree with another.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.model = (function () {
  'use strict';

  var C = SASO.config;

  function db() { return SASO.storage.load(); }

  /* ---- lookups --------------------------------------------------------- */

  function orgById(id) {
    return db().organizations.filter(function (o) { return o.id === id; })[0] || null;
  }

  function orgAcronym(id) {
    var o = orgById(id);
    return o ? o.acronym : '—';
  }

  function activityById(id) {
    return db().activities.filter(function (a) { return a.id === id; })[0] || null;
  }

  function activitiesFor(orgId) {
    return db().activities.filter(function (a) { return a.organizationId === orgId; });
  }

  function allActivities() { return db().activities.slice(); }

  function requirementsFor(activityId) {
    return db().requirements.filter(function (r) { return r.activityId === activityId; });
  }

  function commentsFor(activityId) {
    return db().comments
      .filter(function (c) { return c.activityId === activityId; })
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  }

  function terminalReportFor(activityId) {
    return db().terminalReports.filter(function (t) { return t.activityId === activityId; })[0] || null;
  }

  function historyFor(activityId) {
    return db().statusHistory
      .filter(function (h) { return h.activityId === activityId; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  }

  /* ---- requirements ----------------------------------------------------- */

  /* Returns { approved, mandatory, submitted, total, percent } */
  function requirementProgress(activityId) {
    var reqs = requirementsFor(activityId);
    var mandatory = reqs.filter(function (r) { return r.mandatory; });
    var approved = mandatory.filter(function (r) { return r.status === C.REQUIREMENT.APPROVED; });
    var submitted = reqs.filter(function (r) { return r.status !== C.REQUIREMENT.NOT_SUBMITTED; });
    return {
      approved: approved.length,
      mandatory: mandatory.length,
      submitted: submitted.length,
      total: reqs.length,
      percent: mandatory.length ? Math.round((approved.length / mandatory.length) * 100) : 0
    };
  }

  /* Business Rule 3 — a proposal cannot be approved with an outstanding
     mandatory requirement. */
  function requirementsComplete(activityId) {
    var p = requirementProgress(activityId);
    return p.mandatory > 0 && p.approved === p.mandatory;
  }

  function missingRequirements(activityId) {
    return requirementsFor(activityId).filter(function (r) {
      return r.mandatory && r.status !== C.REQUIREMENT.APPROVED;
    });
  }

  /* ---- derived lifecycle stage (BR-07, BR-09) --------------------------- */

  function stageOf(activity) {
    if (!activity) { return C.STAGE.DRAFT; }

    if (activity.proposalStatus === C.PROPOSAL.REJECTED ||
        activity.eventStatus === C.EVENT.CANCELLED) {
      return C.STAGE.CLOSED;
    }
    if (activity.proposalStatus === C.PROPOSAL.DRAFT) {
      return C.STAGE.DRAFT;
    }
    if (activity.proposalStatus !== C.PROPOSAL.APPROVED) {
      return C.STAGE.UNDER_APPROVAL;
    }

    /* Proposal is approved from here on. */
    if (activity.terminalReportStatus === C.TERMINAL.ACCEPTED) {
      return C.STAGE.COMPLETED;
    }
    if (activity.eventStatus === C.EVENT.FINISHED) {
      /* The event is over but the terminal report has not been accepted.
         This is the gate the panel asked for — NOT Completed. */
      return C.STAGE.AWAITING_TERMINAL_REPORT;
    }
    if (activity.eventStatus === C.EVENT.ONGOING) {
      return C.STAGE.ONGOING;
    }
    return C.STAGE.APPROVED;
  }

  /* ---- dates ------------------------------------------------------------ */

  function daysBetween(a, b) {
    var ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  }

  function daysPending(activity) {
    var tr = terminalReportFor(activity.id);
    if (!tr || !tr.deadline) { return 0; }
    return Math.max(0, daysBetween(tr.deadline, new Date()));
  }

  function daysWaiting(activity) {
    if (!activity.submittedAt) { return 0; }
    return Math.max(0, daysBetween(activity.submittedAt, new Date()));
  }

  /* Recomputes REQUIRED -> OVERDUE where the deadline has passed. Called on
     every page load so the demonstration stays truthful over time. */
  function refreshOverdue() {
    var data = db();
    var changed = false;
    data.terminalReports.forEach(function (tr) {
      var overdueNow = tr.deadline && daysBetween(tr.deadline, new Date()) > 0;
      if (overdueNow && tr.status === C.TERMINAL.REQUIRED) {
        tr.status = C.TERMINAL.OVERDUE;
        var act = activityById(tr.activityId);
        if (act) { act.terminalReportStatus = C.TERMINAL.OVERDUE; }
        changed = true;
      }
    });
    if (changed) { SASO.storage.save(); }
  }

  /* ---- statistics -------------------------------------------------------- */

  function countByStage(list) {
    var out = {};
    Object.keys(C.STAGE).forEach(function (k) { out[k] = 0; });
    list.forEach(function (a) { out[stageOf(a)] += 1; });
    return out;
  }

  function sasoStats() {
    var acts = allActivities();
    var stages = countByStage(acts);

    return {
      organizations: db().organizations.length,
      pendingProposals: acts.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.SUBMITTED ||
               a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
               a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED;
      }).length,
      forReview: acts.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.FOR_REVIEW;
      }).length,
      approved: stages.APPROVED,
      ongoing: stages.ONGOING,
      finished: acts.filter(function (a) {
        return a.eventStatus === C.EVENT.FINISHED;
      }).length,
      terminalPending: stages.AWAITING_TERMINAL_REPORT,
      completed: stages.COMPLETED,
      stages: stages
    };
  }

  function orgStats(orgId) {
    var acts = activitiesFor(orgId);
    var stages = countByStage(acts);

    return {
      active: stages.APPROVED + stages.ONGOING,
      pendingProposals: acts.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.SUBMITTED ||
               a.proposalStatus === C.PROPOSAL.FOR_REVIEW;
      }).length,
      approved: stages.APPROVED,
      requirementsNeeded: acts.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
               a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED;
      }).length,
      terminalPending: stages.AWAITING_TERMINAL_REPORT,
      completed: stages.COMPLETED,
      stages: stages
    };
  }

  /* ---- urgent actions (SASO dashboard) ----------------------------------- */

  function urgentActions() {
    var acts = allActivities();

    var requirementsToReview = 0;
    db().requirements.forEach(function (r) {
      if (r.status === C.REQUIREMENT.UNDER_REVIEW) { requirementsToReview += 1; }
    });

    var proposalsWaiting = acts.filter(function (a) {
      return a.proposalStatus === C.PROPOSAL.SUBMITTED ||
             a.proposalStatus === C.PROPOSAL.FOR_REVIEW;
    });

    var overdue = acts.filter(function (a) {
      return a.terminalReportStatus === C.TERMINAL.OVERDUE;
    });

    var unansweredQueries = 0;
    db().comments.forEach(function (c) {
      if (c.role === C.ROLE.ORG && !c.readByCounterpart) { unansweredQueries += 1; }
    });

    return {
      requirementsToReview: requirementsToReview,
      proposalsWaiting: proposalsWaiting.length,
      proposalsStale: proposalsWaiting.filter(function (a) {
        return daysWaiting(a) > C.PROPOSAL_WAITING_ALERT_DAYS;
      }).length,
      overdueTerminalReports: overdue.length,
      unansweredQueries: unansweredQueries
    };
  }

  /* Activities SASO should chase: finished without an accepted terminal
     report, plus approved-stage activities with outstanding requirements. */
  function nonCompliance() {
    return allActivities()
      .filter(function (a) {
        return stageOf(a) === C.STAGE.AWAITING_TERMINAL_REPORT;
      })
      .map(function (a) {
        return {
          activity: a,
          organization: orgById(a.organizationId),
          daysPending: daysPending(a),
          terminalReport: terminalReportFor(a.id)
        };
      })
      .sort(function (x, y) { return y.daysPending - x.daysPending; });
  }

  /* ---- recent activity feed ---------------------------------------------- */

  function recentEvents(limit) {
    return db().statusHistory
      .slice()
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, limit || 10)
      .map(function (h) {
        var act = activityById(h.activityId);
        return {
          entry: h,
          activity: act,
          organization: act ? orgById(act.organizationId) : null
        };
      });
  }

  /* ---- notifications ------------------------------------------------------ */

  function notificationsFor(session) {
    if (!session) { return []; }
    return db().notifications
      .filter(function (n) {
        if (session.role === C.ROLE.SASO) { return n.recipientRole === C.ROLE.SASO; }
        return n.recipientRole === C.ROLE.ORG && n.recipientOrgId === session.organizationId;
      })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  }

  function unreadCount(session) {
    return notificationsFor(session).filter(function (n) { return !n.read; }).length;
  }

  function markNotificationRead(id) {
    var n = db().notifications.filter(function (x) { return x.id === id; })[0];
    if (n) { n.read = true; SASO.storage.save(); }
  }

  function markAllRead(session) {
    notificationsFor(session).forEach(function (n) { n.read = true; });
    SASO.storage.save();
  }

  /* ---- formatting --------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(value) {
    if (!value) { return '—'; }
    var d = new Date(value);
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function formatDateRange(start, end) {
    if (!end || start === end) { return formatDate(start); }
    var a = new Date(start), b = new Date(end);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      return MONTHS[a.getMonth()] + ' ' + a.getDate() + '–' + b.getDate() + ', ' + a.getFullYear();
    }
    return formatDate(start) + ' – ' + formatDate(end);
  }

  function relativeTime(value) {
    if (!value) { return '—'; }
    var diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (diff < 60) { return 'just now'; }
    if (diff < 3600) { return Math.floor(diff / 60) + ' min ago'; }
    if (diff < 86400) {
      var h = Math.floor(diff / 3600);
      return h + (h === 1 ? ' hour ago' : ' hours ago');
    }
    var d = Math.floor(diff / 86400);
    if (d < 30) { return d + (d === 1 ? ' day ago' : ' days ago'); }
    return formatDate(value);
  }

  function label(status) {
    return C.LABEL[status] || status || '—';
  }

  function badge(status, text) {
    var colour = C.BADGE[status] || 'secondary';
    return '<span class="badge badge-' + colour + ' status-badge">' +
      (text || label(status)) + '</span>';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) { return ''; }
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    db: db,
    orgById: orgById,
    orgAcronym: orgAcronym,
    activityById: activityById,
    activitiesFor: activitiesFor,
    allActivities: allActivities,
    requirementsFor: requirementsFor,
    commentsFor: commentsFor,
    terminalReportFor: terminalReportFor,
    historyFor: historyFor,
    requirementProgress: requirementProgress,
    requirementsComplete: requirementsComplete,
    missingRequirements: missingRequirements,
    stageOf: stageOf,
    daysBetween: daysBetween,
    daysPending: daysPending,
    daysWaiting: daysWaiting,
    refreshOverdue: refreshOverdue,
    sasoStats: sasoStats,
    orgStats: orgStats,
    urgentActions: urgentActions,
    nonCompliance: nonCompliance,
    recentEvents: recentEvents,
    notificationsFor: notificationsFor,
    unreadCount: unreadCount,
    markNotificationRead: markNotificationRead,
    markAllRead: markAllRead,
    formatDate: formatDate,
    formatDateRange: formatDateRange,
    relativeTime: relativeTime,
    label: label,
    badge: badge,
    escapeHtml: escapeHtml
  };
})();
