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

  /* Office policy values. Falls back to the config defaults for stores seeded
     before Settings existed. */
  function settings() {
    var data = db();
    if (!data.settings) {
      data.settings = {
        reportDeadlineDays: C.TERMINAL_REPORT_DEADLINE_DAYS,
        proposalAlertDays: C.PROPOSAL_WAITING_ALERT_DAYS,
        accreditationAlertDays: 60
      };
      SASO.storage.save();
    }
    return data.settings;
  }

  function saveSettings(patch) {
    var current = settings();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] !== null && patch[k] !== undefined) { current[k] = patch[k]; }
    });
    SASO.storage.save();
    return current;
  }

  function orgById(id) {
    return db().organizations.filter(function (o) { return o.id === id; })[0] || null;
  }

  function orgAcronym(id) {
    var o = orgById(id);
    return o ? o.acronym : '-';
  }

  /* ---- accreditation -----------------------------------------------------
     RSC: SASO must be able to see which organizations are accredited and
     which have renewed. CSPC records this as a level plus a new/re-accredited
     distinction, so both are read together for display.
     -------------------------------------------------------------------------- */

  function accreditationLabel(org) {
    if (!org) { return '-'; }
    if (org.accreditationLevel === C.ACCREDITATION_LEVEL.RECOGNIZED) {
      return C.LABEL.RECOGNIZED;
    }
    return C.LABEL[org.accreditationLevel] + ' ' + C.LABEL[org.accreditationType];
  }

  function accreditationBadge(org) {
    if (!org) { return ''; }
    return badge(org.accreditationLevel, accreditationLabel(org));
  }

  function isAccredited(org) {
    return !!org && org.accreditationLevel !== C.ACCREDITATION_LEVEL.RECOGNIZED;
  }

  /* BR-16 — an entity may request an activity if it appears on the SASO
     roster for the current academic year. Accreditation LEVEL does not gate
     this: Recognized organizations conduct activities too, as SASO's own
     activity lists show. The level records standing, not permission — it is
     scored from the reports an organization files after its activities. */
  function canConductActivities(org) {
    return !!org && !!org.accreditationLevel;
  }

  function hasRenewed(org) {
    return !!org && org.accreditationType === C.ACCREDITATION_TYPE.RE_ACCREDITED;
  }

  function accreditationDaysLeft(org) {
    if (!org || !org.accreditationExpires) { return null; }
    return daysBetween(new Date(), org.accreditationExpires);
  }

  function organizationsByLevel(level) {
    return db().organizations.filter(function (o) {
      return o.accreditationLevel === level;
    });
  }

  /* Counts for the SASO dashboard strip. */
  function accreditationSummary() {
    var orgs = db().organizations;
    var byLevel = {};
    Object.keys(C.ACCREDITATION_LEVEL).forEach(function (k) { byLevel[k] = 0; });
    orgs.forEach(function (o) { byLevel[o.accreditationLevel] += 1; });

    return {
      total: orgs.length,
      byLevel: byLevel,
      accredited: orgs.filter(isAccredited).length,
      recognizedOnly: orgs.filter(function (o) { return !isAccredited(o); }).length,
      reAccredited: orgs.filter(hasRenewed).length,
      dueSoon: orgs.filter(function (o) {
        var left = accreditationDaysLeft(o);
        return left !== null && left <= settings().accreditationAlertDays;
      })
    };
  }

  function activityById(id) {
    return db().activities.filter(function (a) { return a.id === id; })[0] || null;
  }

  function activitiesFor(orgId) {
    return db().activities.filter(function (a) { return a.organizationId === orgId; });
  }

  function allActivities() { return db().activities.slice(); }

  /* Every requirement in the system, joined to its activity and organization.
     This is the view the cross-activity Requirements module works from. */
  function allRequirements() {
    return db().requirements.map(function (r) {
      var act = activityById(r.activityId);
      return {
        requirement: r,
        activity: act,
        organization: act ? orgById(act.organizationId) : null
      };
    }).filter(function (row) { return !!row.activity && !!row.organization; });
  }

  /* Requirements SASO is waiting on, or the organization still owes. */
  function outstandingRequirements(orgId) {
    return allRequirements().filter(function (row) {
      if (orgId && row.organization.id !== orgId) { return false; }
      if (row.activity.proposalStatus === C.PROPOSAL.DRAFT) { return false; }
      return row.requirement.status === C.REQUIREMENT.NOT_SUBMITTED ||
             row.requirement.status === C.REQUIREMENT.NEEDS_REVISION;
    });
  }

  function requirementById(id) {
    return db().requirements.filter(function (r) { return r.id === id; })[0] || null;
  }

  /* Marks the counterpart's messages as read when the other party opens the
     thread, which is what drives the "Respond" action and the unanswered
     queries counter. */
  function markCommentsRead(activityId, viewerRole) {
    var changed = false;
    db().comments.forEach(function (c) {
      if (c.activityId === activityId && c.role !== viewerRole && !c.readByCounterpart) {
        c.readByCounterpart = true;
        changed = true;
      }
    });
    if (changed) { SASO.storage.save(); }
  }

  function unreadCommentsFor(activityId, viewerRole) {
    return db().comments.filter(function (c) {
      return c.activityId === activityId && c.role !== viewerRole && !c.readByCounterpart;
    }).length;
  }

  function commentsFor(activityId) {
    return db().comments
      .filter(function (c) { return c.activityId === activityId; })
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  }

  function historyFor(activityId) {
    return db().statusHistory
      .filter(function (h) { return h.activityId === activityId; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  }

  /* ---- requirements -------------------------------------------------------
     Requirements exist in two phases. Pre-approval requirements gate SASO's
     endorsement; post-activity requirements gate completion.
     ---------------------------------------------------------------------------- */

  function requirementsFor(activityId, phase) {
    return db().requirements.filter(function (r) {
      return r.activityId === activityId && (!phase || r.phase === phase);
    });
  }

  function requirementProgress(activityId, phase) {
    var reqs = requirementsFor(activityId, phase);
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

  /* BR-03 — SASO cannot endorse while a mandatory pre-approval requirement
     is outstanding. */
  function requirementsComplete(activityId, phase) {
    var p = requirementProgress(activityId, phase || C.PHASE.PRE_APPROVAL);
    return p.mandatory > 0 && p.approved === p.mandatory;
  }

  function missingRequirements(activityId, phase) {
    return requirementsFor(activityId, phase).filter(function (r) {
      return r.mandatory && r.status !== C.REQUIREMENT.APPROVED;
    });
  }

  /* ---- approval routing -----------------------------------------------------
     SASO endorses inside the system; the VPAA and President stages are
     recorded, not enacted. This is what gives an organization visibility into
     where its papers actually are.
     ------------------------------------------------------------------------------ */

  function routeFor(activityId) {
    return db().routing.filter(function (r) { return r.activityId === activityId; });
  }

  /* The office currently holding the proposal, or null. */
  function currentOffice(activityId) {
    var pending = routeFor(activityId).filter(function (r) {
      return r.transmittedAt && !r.decidedAt;
    });
    return pending.length ? pending[pending.length - 1] : null;
  }

  function daysWithCurrentOffice(activityId) {
    var cur = currentOffice(activityId);
    if (!cur) { return 0; }
    return Math.max(0, daysBetween(cur.transmittedAt, new Date()));
  }

  function isInApprovalRoute(activity) {
    return activity.proposalStatus === C.PROPOSAL.SASO_ENDORSED ||
           activity.proposalStatus === C.PROPOSAL.WITH_VPAA ||
           activity.proposalStatus === C.PROPOSAL.WITH_PRESIDENT;
  }

  function isWithSaso(activity) {
    return activity.proposalStatus === C.PROPOSAL.SUBMITTED ||
           activity.proposalStatus === C.PROPOSAL.FOR_REVIEW ||
           activity.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
           activity.proposalStatus === C.PROPOSAL.REVISION_REQUIRED;
  }

  /* ---- terminal report status (DERIVED) --------------------------------------
     SASO records a submission date per post-activity document, so the report
     status is a property of those documents rather than a separate flag.
     ------------------------------------------------------------------------------ */

  function terminalStatus(activity) {
    if (!activity || activity.eventStatus !== C.EVENT.FINISHED) {
      return C.TERMINAL.NOT_APPLICABLE;
    }
    var reqs = requirementsFor(activity.id, C.PHASE.POST_ACTIVITY);
    if (!reqs.length) { return C.TERMINAL.REQUIRED; }

    var mandatory = reqs.filter(function (r) { return r.mandatory; });
    var approved = mandatory.filter(function (r) { return r.status === C.REQUIREMENT.APPROVED; });
    if (mandatory.length && approved.length === mandatory.length) {
      return C.TERMINAL.ACCEPTED;
    }

    var overdue = activity.reportDeadline &&
      daysBetween(activity.reportDeadline, new Date()) > 0;
    if (overdue) { return C.TERMINAL.OVERDUE; }

    if (reqs.some(function (r) { return r.status === C.REQUIREMENT.NEEDS_REVISION; })) {
      return C.TERMINAL.NEEDS_REVISION;
    }
    if (reqs.some(function (r) { return r.status === C.REQUIREMENT.UNDER_REVIEW; })) {
      return C.TERMINAL.UNDER_REVIEW;
    }
    if (reqs.some(function (r) { return r.status !== C.REQUIREMENT.NOT_SUBMITTED; })) {
      return C.TERMINAL.PARTIAL;
    }
    return C.TERMINAL.REQUIRED;
  }

  /* ---- derived lifecycle stage (BR-07, BR-09) --------------------------------- */

  function stageOf(activity) {
    if (!activity) { return C.STAGE.DRAFT; }

    if (activity.proposalStatus === C.PROPOSAL.REJECTED ||
        activity.eventStatus === C.EVENT.CANCELLED) { return C.STAGE.CLOSED; }
    if (activity.proposalStatus === C.PROPOSAL.DRAFT) { return C.STAGE.DRAFT; }
    if (isWithSaso(activity)) { return C.STAGE.UNDER_SASO_REVIEW; }
    if (isInApprovalRoute(activity)) { return C.STAGE.IN_APPROVAL_ROUTE; }

    /* Fully approved from here on. */
    if (terminalStatus(activity) === C.TERMINAL.ACCEPTED) { return C.STAGE.COMPLETED; }
    if (activity.eventStatus === C.EVENT.FINISHED) {
      /* The event is over but the post-activity reports have not all been
         accepted. This is the gate the panel asked for — NOT Completed. */
      return C.STAGE.AWAITING_TERMINAL_REPORT;
    }
    if (activity.eventStatus === C.EVENT.ONGOING) { return C.STAGE.ONGOING; }
    if (activity.eventStatus === C.EVENT.POSTPONED) { return C.STAGE.POSTPONED; }
    return C.STAGE.APPROVED;
  }

  /* ---- dates ------------------------------------------------------------ */

  function daysBetween(a, b) {
    var ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  }

  function daysPending(activity) {
    if (!activity || !activity.reportDeadline) { return 0; }
    return Math.max(0, daysBetween(activity.reportDeadline, new Date()));
  }

  function daysWaiting(activity) {
    if (!activity.submittedAt) { return 0; }
    return Math.max(0, daysBetween(activity.submittedAt, new Date()));
  }

  /* Terminal report status is derived on every read, so nothing has to be
     recomputed and stored. Kept as a no-op so callers need not change. */
  function refreshOverdue() { return; }

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
      withSaso: acts.filter(isWithSaso).length,
      forReview: acts.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.FOR_REVIEW;
      }).length,
      inRoute: stages.IN_APPROVAL_ROUTE,
      approved: stages.APPROVED,
      ongoing: stages.ONGOING,
      postponed: stages.POSTPONED,
      finished: acts.filter(function (a) {
        return a.eventStatus === C.EVENT.FINISHED;
      }).length,
      terminalPending: stages.AWAITING_TERMINAL_REPORT,
      overdueReports: acts.filter(function (a) {
        return terminalStatus(a) === C.TERMINAL.OVERDUE;
      }).length,
      completed: stages.COMPLETED,
      stages: stages
    };
  }

  function orgStats(orgId) {
    var acts = activitiesFor(orgId);
    var stages = countByStage(acts);

    return {
      active: stages.APPROVED + stages.ONGOING,
      postponed: stages.POSTPONED,
      pendingProposals: acts.filter(isWithSaso).length,
      inRoute: stages.IN_APPROVAL_ROUTE,
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

    var proposalsWaiting = acts.filter(isWithSaso);

    var overdue = acts.filter(function (a) {
      return terminalStatus(a) === C.TERMINAL.OVERDUE;
    });

    var unansweredQueries = 0;
    db().comments.forEach(function (c) {
      if (c.role === C.ROLE.ORG && !c.readByCounterpart) { unansweredQueries += 1; }
    });

    return {
      requirementsToReview: requirementsToReview,
      proposalsWaiting: proposalsWaiting.length,
      proposalsStale: proposalsWaiting.filter(function (a) {
        return daysWaiting(a) > settings().proposalAlertDays;
      }).length,
      overdueTerminalReports: overdue.length,
      longInRoute: acts.filter(function (a) {
        return isInApprovalRoute(a) &&
               daysWithCurrentOffice(a.id) > settings().proposalAlertDays;
      }).length,
      unansweredQueries: unansweredQueries
    };
  }

  /* Every activity that has finished, with its report state attached. The
     Terminal Reports module works from this. */
  function reportQueue(orgId) {
    return allActivities()
      .filter(function (a) {
        if (a.eventStatus !== C.EVENT.FINISHED) { return false; }
        return !orgId || a.organizationId === orgId;
      })
      .map(function (a) {
        var reqs = requirementsFor(a.id, C.PHASE.POST_ACTIVITY);
        var status = terminalStatus(a);
        return {
          activity: a,
          organization: orgById(a.organizationId),
          requirements: reqs,
          progress: requirementProgress(a.id, C.PHASE.POST_ACTIVITY),
          status: status,
          missing: missingRequirements(a.id, C.PHASE.POST_ACTIVITY),
          daysLate: status === C.TERMINAL.OVERDUE ? daysPending(a) : 0,
          daysLeft: a.reportDeadline ? daysBetween(new Date(), a.reportDeadline) : null
        };
      })
      .sort(function (x, y) {
        if (x.daysLate !== y.daysLate) { return y.daysLate - x.daysLate; }
        return new Date(x.activity.dateEnd || 0) - new Date(y.activity.dateEnd || 0);
      });
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
          terminalStatus: terminalStatus(a),
          missing: missingRequirements(a.id, C.PHASE.POST_ACTIVITY)
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
        if (session.role === C.ROLE.SASO) {
          /* A SASO notification addressed to one staff member (recipientUserId)
             is shown only to that account; the rest are shared office-wide. */
          return n.recipientRole === C.ROLE.SASO &&
                 (!n.recipientUserId || n.recipientUserId === session.userId);
        }
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

  /* Dismissing removes a notification from the user's own centre. It does not
     touch the underlying workflow record. */
  function dismissNotification(id) {
    var data = db();
    data.notifications = data.notifications.filter(function (n) { return n.id !== id; });
    SASO.storage.save();
  }

  function markAllRead(session) {
    notificationsFor(session).forEach(function (n) { n.read = true; });
    SASO.storage.save();
  }

  /* ---- editing, deleting and the trash bin ---------------------------------
     See PROPOSAL_MANAGERS in config.js for the assumption behind these rules.
     ---------------------------------------------------------------------------- */

  /* The SASO staff accounts allowed to edit and delete proposals. */
  function proposalManagers() {
    return db().users.filter(function (u) {
      return u.role === C.ROLE.SASO && C.PROPOSAL_MANAGERS.indexOf(u.username) !== -1;
    });
  }

  /* Whether this signed-in account may edit, delete and restore proposals at
     all. Organizations may, for their own proposals only. */
  function canManageProposals(session) {
    if (!session) { return false; }
    if (session.role === C.ROLE.ORG) { return true; }
    return C.PROPOSAL_MANAGERS.indexOf(session.username) !== -1;
  }

  /* Whether this account may edit or delete this particular proposal now:
     it must still be under SASO review, and an organization may only touch
     its own. */
  function canModifyProposal(session, activity) {
    if (!activity || !canManageProposals(session)) { return false; }
    if (!isWithSaso(activity)) { return false; }
    if (session.role === C.ROLE.ORG && activity.organizationId !== session.organizationId) {
      return false;
    }
    return true;
  }

  function trash() {
    var data = db();
    if (!data.trash) { data.trash = []; }   /* stores seeded before the trash bin */
    return data.trash;
  }

  /* What this account can see in the trash bin, newest deletion first. */
  function trashFor(session) {
    if (!canManageProposals(session)) { return []; }
    return trash()
      .filter(function (t) {
        return session.role === C.ROLE.SASO ||
               t.activity.organizationId === session.organizationId;
      })
      .sort(function (a, b) { return new Date(b.deletedAt) - new Date(a.deletedAt); });
  }

  function trashByActivityId(activityId) {
    return trash().filter(function (t) { return t.activity.id === activityId; })[0] || null;
  }

  function trashDaysLeft(item) {
    return Math.max(0, daysBetween(new Date(), item.purgeAt));
  }

  /* ---- organization accounts -------------------------------------------------
     No open sign-up: see ACCOUNT_MANAGERS in config.js.
     ---------------------------------------------------------------------------- */

  function accountManagers() {
    return db().users.filter(function (u) {
      return u.role === C.ROLE.SASO && C.ACCOUNT_MANAGERS.indexOf(u.username) !== -1;
    });
  }

  function canManageAccounts(session) {
    return !!session && session.role === C.ROLE.SASO &&
           C.ACCOUNT_MANAGERS.indexOf(session.username) !== -1;
  }

  function accountRequests() {
    var data = db();
    if (!data.accountRequests) { data.accountRequests = []; }  /* older stores */
    return data.accountRequests;
  }

  function pendingAccountRequests() {
    return accountRequests().filter(function (r) { return r.status === C.ACCOUNT_REQUEST.PENDING; });
  }

  function accountRequestById(id) {
    return accountRequests().filter(function (r) { return r.id === id; })[0] || null;
  }

  function accountRequestByRef(ref) {
    var key = String(ref || '').trim().toUpperCase();
    return accountRequests().filter(function (r) { return r.ref === key; })[0] || null;
  }

  /* The most recent request filed under a username — used at sign-in to tell
     a requester their request is still pending, or was declined. */
  function latestRequestForUsername(username) {
    var key = String(username || '').trim().toLowerCase();
    return accountRequests()
      .filter(function (r) { return r.username.toLowerCase() === key; })
      .sort(function (a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); })[0] || null;
  }

  /* A username is taken by an existing account or by a request still waiting. */
  function usernameTaken(username, ignoreRequestId) {
    var key = String(username || '').trim().toLowerCase();
    if (!key) { return false; }
    if (db().users.some(function (u) { return u.username.toLowerCase() === key; })) { return true; }
    return pendingAccountRequests().some(function (r) {
      return r.id !== ignoreRequestId && r.username.toLowerCase() === key;
    });
  }

  function acronymTaken(acronym, ignoreRequestId) {
    var key = String(acronym || '').trim().toLowerCase();
    if (!key) { return false; }
    if (db().organizations.some(function (o) { return o.acronym.toLowerCase() === key; })) { return true; }
    return pendingAccountRequests().some(function (r) {
      return r.id !== ignoreRequestId && r.acronym.toLowerCase() === key;
    });
  }

  /* The academic year the roster is currently on. */
  function currentAY() {
    var o = db().organizations[0];
    return o ? o.accreditationAY : '';
  }

  function accountForOrg(orgId) {
    return db().users.filter(function (u) { return u.organizationId === orgId; })[0] || null;
  }

  /* ---- formatting --------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(value) {
    if (!value) { return '-'; }
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
    if (!value) { return '-'; }
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
    return C.LABEL[status] || status || '-';
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
    settings: settings,
    saveSettings: saveSettings,
    orgById: orgById,
    orgAcronym: orgAcronym,
    accreditationLabel: accreditationLabel,
    accreditationBadge: accreditationBadge,
    accreditationDaysLeft: accreditationDaysLeft,
    accreditationSummary: accreditationSummary,
    isAccredited: isAccredited,
    canConductActivities: canConductActivities,
    hasRenewed: hasRenewed,
    organizationsByLevel: organizationsByLevel,
    activityById: activityById,
    activitiesFor: activitiesFor,
    allActivities: allActivities,
    requirementsFor: requirementsFor,
    requirementById: requirementById,
    allRequirements: allRequirements,
    outstandingRequirements: outstandingRequirements,
    commentsFor: commentsFor,
    markCommentsRead: markCommentsRead,
    unreadCommentsFor: unreadCommentsFor,
    historyFor: historyFor,
    routeFor: routeFor,
    currentOffice: currentOffice,
    daysWithCurrentOffice: daysWithCurrentOffice,
    isInApprovalRoute: isInApprovalRoute,
    isWithSaso: isWithSaso,
    terminalStatus: terminalStatus,
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
    reportQueue: reportQueue,
    recentEvents: recentEvents,
    notificationsFor: notificationsFor,
    unreadCount: unreadCount,
    markNotificationRead: markNotificationRead,
    dismissNotification: dismissNotification,
    markAllRead: markAllRead,
    proposalManagers: proposalManagers,
    canManageProposals: canManageProposals,
    canModifyProposal: canModifyProposal,
    trash: trash,
    trashFor: trashFor,
    trashByActivityId: trashByActivityId,
    trashDaysLeft: trashDaysLeft,
    accountManagers: accountManagers,
    canManageAccounts: canManageAccounts,
    accountRequests: accountRequests,
    pendingAccountRequests: pendingAccountRequests,
    accountRequestById: accountRequestById,
    accountRequestByRef: accountRequestByRef,
    latestRequestForUsername: latestRequestForUsername,
    usernameTaken: usernameTaken,
    acronymTaken: acronymTaken,
    currentAY: currentAY,
    accountForOrg: accountForOrg,
    formatDate: formatDate,
    formatDateRange: formatDateRange,
    relativeTime: relativeTime,
    label: label,
    badge: badge,
    escapeHtml: escapeHtml
  };
})();
