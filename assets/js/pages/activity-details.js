/* =========================================================================
   activity-details.js  —  The centre of gravity.

   One controller, two roles. The page renders the same activity from either
   side; what differs is which actions are offered. SASO reviews, endorses and
   records routing; the organization attaches documents, responds and files
   reports.

   Pages set window.SASO_ROLE before loading this file.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;
  var role = window.SASO_ROLE;
  var isSaso = role === C.ROLE.SASO;

  var params = new URLSearchParams(window.location.search);
  var activityId = params.get('id');

  var session = SASO.layout.init({
    role: role,
    page: 'activities',
    title: 'Activity Details',
    breadcrumb: [
      { label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
      { label: 'Activities',
        href: isSaso ? 'pages/saso/activities.html' : 'pages/org/activities.html' },
      { label: 'Details' }
    ]
  });
  if (!session) { return; }

  var activity = activityId ? M.activityById(activityId) : null;
  var P = SASO.proposalActions;

  /* A deleted proposal sits in the trash bin until restored or purged. */
  var trashed = !activity && activityId ? M.trashByActivityId(activityId) : null;
  if (trashed && (isSaso || trashed.activity.organizationId === session.organizationId)) {
    var canSeeTrash = M.canManageProposals(session);
    document.getElementById('detailRoot').innerHTML =
      '<div class="card"><div class="card-body"><div class="empty-state">' +
        '<i class="fa-regular fa-trash-can"></i>' +
        '<h6>This proposal is in the trash bin</h6>' +
        '<p>"' + M.escapeHtml(trashed.activity.title) + '" was deleted by ' +
          M.escapeHtml(trashed.deletedBy) + ' ' + M.relativeTime(trashed.deletedAt) +
          '. It will be permanently deleted on ' + M.formatDate(trashed.purgeAt) + ' unless restored.</p>' +
        (canSeeTrash
          ? '<a class="btn btn-sm btn-primary" href="trash.html">Open trash bin</a>'
          : '<a class="btn btn-sm btn-primary" href="proposals.html">Back to proposals</a>') +
      '</div></div></div>';
    return;
  }

  /* An organization may only open its own activities. */
  if (!activity || (!isSaso && activity.organizationId !== session.organizationId)) {
    document.getElementById('detailRoot').innerHTML =
      '<div class="card"><div class="card-body"><div class="empty-state">' +
        '<i class="fa-regular fa-circle-question"></i>' +
        '<h6>Activity not found</h6>' +
        '<p>It may have been removed, or it belongs to another organization.</p>' +
        '<a class="btn btn-sm btn-primary" href="' +
          (isSaso ? 'activities.html' : 'activities.html') + '">Back to activities</a>' +
      '</div></div></div>';
    return;
  }

  var org = M.orgById(activity.organizationId);

  /* Opening the thread marks the counterpart's messages as read. */
  M.markCommentsRead(activity.id, role);

  function reload() {
    activity = M.activityById(activityId);
    render();
  }

  /* ---------------------------------------------------------------- header */

  function renderHeader() {
    var stage = M.stageOf(activity);
    return '' +
      '<div class="detail-head">' +
        '<div class="d-flex flex-wrap align-items-start">' +
          '<div class="mr-auto">' +
            '<h2 class="detail-title">' + M.escapeHtml(activity.title || 'Untitled draft') + '</h2>' +
            '<div class="detail-sub">' +
              M.escapeHtml(org.acronym) + ' · ' + M.escapeHtml(activity.category || '—') + ' · ' +
              M.label(activity.venueType) +
            '</div>' +
            (activity.lastEditedAt
              ? '<div class="detail-edited"><i class="fa-solid fa-pen-to-square mr-1"></i>Edited by ' +
                M.escapeHtml(activity.lastEditedBy) +
                (activity.lastEditedByRole === C.ROLE.SASO ? ' (SASO)' : '') + ' · ' +
                M.relativeTime(activity.lastEditedAt) + '</div>'
              : '') +
          '</div>' +
          '<div class="detail-badges">' +
            M.badge(activity.proposalStatus) + ' ' +
            (activity.eventStatus !== C.EVENT.NOT_APPLICABLE ? M.badge(activity.eventStatus) + ' ' : '') +
            M.badge(stage) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* --------------------------------------------------------------- actions */

  function actionBar() {
    var buttons = [];
    var preComplete = M.requirementsComplete(activity.id, C.PHASE.PRE_APPROVAL);
    var ps = activity.proposalStatus;

    if (isSaso) {
      if (ps === C.PROPOSAL.SUBMITTED) {
        buttons.push(btn('openReview', 'Open for review', 'primary', 'fa-magnifying-glass'));
      }
      if (ps === C.PROPOSAL.FOR_REVIEW || ps === C.PROPOSAL.REQUIREMENTS_NEEDED ||
          ps === C.PROPOSAL.REVISION_REQUIRED) {
        buttons.push(btn('endorse', 'Endorse to VPAA', 'primary', 'fa-share-from-square',
          !preComplete,
          preComplete ? '' : 'All required documents must be approved before endorsing.'));
        buttons.push(btn('requestReq', 'Request requirement', 'outline-primary', 'fa-circle-plus'));
        buttons.push(btn('returnProposal', 'Return for revision', 'outline-warning', 'fa-rotate-left'));
        buttons.push(btn('rejectProposal', 'Reject', 'outline-danger', 'fa-circle-xmark'));
      }
      if (ps === C.PROPOSAL.SASO_ENDORSED) {
        buttons.push(btn('toVpaa', 'Record transmittal to VPAA', 'primary', 'fa-arrow-right'));
      }
      if (ps === C.PROPOSAL.WITH_VPAA) {
        buttons.push(btn('vpaaApproved', 'Record VPAA approval', 'primary', 'fa-check'));
        buttons.push(btn('vpaaReturned', 'Record VPAA return', 'outline-warning', 'fa-rotate-left'));
      }
      if (ps === C.PROPOSAL.WITH_PRESIDENT) {
        buttons.push(btn('presApproved', "Record President's approval", 'primary', 'fa-stamp'));
        buttons.push(btn('presReturned', "Record President's return", 'outline-warning', 'fa-rotate-left'));
      }
      if (ps === C.PROPOSAL.APPROVED) {
        if (activity.eventStatus === C.EVENT.UPCOMING ||
            activity.eventStatus === C.EVENT.NOT_APPLICABLE) {
          buttons.push(btn('markOngoing', 'Mark ongoing', 'outline-primary', 'fa-play'));
          buttons.push(btn('markPostponed', 'Mark postponed', 'outline-warning', 'fa-calendar-xmark'));
        }
        if (activity.eventStatus === C.EVENT.ONGOING ||
            activity.eventStatus === C.EVENT.UPCOMING) {
          buttons.push(btn('markFinished', 'Mark finished', 'primary', 'fa-flag-checkered'));
        }
        if (activity.eventStatus === C.EVENT.POSTPONED) {
          buttons.push(btn('markUpcoming', 'Resume as upcoming', 'outline-primary', 'fa-rotate-right'));
        }
      }
    } else {
      if (ps === C.PROPOSAL.DRAFT) {
        buttons.push('<a class="btn btn-primary btn-sm mr-1 mb-1" href="submit-activity.html?id=' +
          activity.id + '"><i class="fa-solid fa-pen mr-1"></i>Continue submission</a>');
      }
    }

    /* Edit and delete — only while the proposal is under SASO review, and
       only for the submitting organization or SASO's Head, Aide and Coordinator. */
    buttons.push(P.actionButtons(activity));

    var docBase = '../documents/print.html?id=' + activity.id;
    buttons.push('<a class="btn btn-outline-primary btn-sm mr-1 mb-1" href="' + docBase +
      '&doc=proposal"><i class="fa-solid fa-file-lines mr-1"></i>Activity Proposal</a>');
    buttons.push('<a class="btn btn-outline-primary btn-sm mr-1 mb-1" href="' + docBase +
      '&doc=permit"><i class="fa-solid fa-stamp mr-1"></i>Permission to Conduct</a>');
    if (activity.eventStatus === C.EVENT.FINISHED) {
      buttons.push('<a class="btn btn-outline-primary btn-sm mr-1 mb-1" href="' + docBase +
        '&doc=terminal"><i class="fa-solid fa-file-circle-check mr-1"></i>Terminal Report</a>');
    }

    return '<div class="detail-actions">' + buttons.join('') + '</div>';
  }

  function btn(action, label, variant, icon, disabled, tip) {
    return '<button type="button" class="btn btn-' + variant + ' btn-sm mr-1 mb-1" ' +
      'data-action="' + action + '"' + (disabled ? ' disabled' : '') +
      (tip ? ' title="' + M.escapeHtml(tip) + '"' : '') + '>' +
      '<i class="fa-solid ' + icon + ' mr-1"></i>' + label + '</button>';
  }

  /* -------------------------------------------------------------- timeline */

  function timeline() {
    var legs = M.routeFor(activity.id);
    function leg(office) {
      return legs.filter(function (l) { return l.office === office; })[0] || null;
    }
    var saso = leg(C.OFFICE.SASO), vpaa = leg(C.OFFICE.VPAA), pres = leg(C.OFFICE.PRESIDENT);
    var preComplete = M.requirementsComplete(activity.id, C.PHASE.PRE_APPROVAL);
    var ps = activity.proposalStatus;
    var ts = M.terminalStatus(activity);

    var steps = [
      { label: 'Proposal created',  done: true, at: activity.createdAt },
      { label: 'Submitted to SASO', done: !!activity.submittedAt, at: activity.submittedAt },
      { label: 'SASO review',       done: !!(saso && saso.decidedAt),
        current: ps === C.PROPOSAL.FOR_REVIEW || ps === C.PROPOSAL.REQUIREMENTS_NEEDED ||
                 ps === C.PROPOSAL.REVISION_REQUIRED,
        at: saso && saso.decidedAt },
      { label: 'Requirements complete', done: preComplete,
        note: preComplete ? null : M.missingRequirements(activity.id, C.PHASE.PRE_APPROVAL).length +
              ' still outstanding' },
      { label: 'Endorsed by SASO',  done: !!(saso && saso.decision === 'Endorsed'),
        at: saso && saso.decidedAt },
      { label: 'VPAA approval',     done: !!(vpaa && vpaa.decidedAt),
        current: ps === C.PROPOSAL.WITH_VPAA, at: vpaa && vpaa.decidedAt,
        note: ps === C.PROPOSAL.WITH_VPAA
          ? M.daysWithCurrentOffice(activity.id) + ' days with this office' : null },
      { label: "President's approval", done: !!(pres && pres.decidedAt),
        current: ps === C.PROPOSAL.WITH_PRESIDENT, at: pres && pres.decidedAt,
        note: ps === C.PROPOSAL.WITH_PRESIDENT
          ? M.daysWithCurrentOffice(activity.id) + ' days with this office' : null },
      { label: 'Activity conducted', done: activity.eventStatus === C.EVENT.FINISHED,
        current: activity.eventStatus === C.EVENT.ONGOING },
      { label: 'Post-activity reports submitted',
        done: ts === C.TERMINAL.ACCEPTED || ts === C.TERMINAL.UNDER_REVIEW,
        current: ts === C.TERMINAL.REQUIRED || ts === C.TERMINAL.OVERDUE || ts === C.TERMINAL.PARTIAL,
        note: activity.reportDeadline ? 'Due ' + M.formatDate(activity.reportDeadline) : null },
      { label: 'Completed', done: M.stageOf(activity) === C.STAGE.COMPLETED }
    ];

    return '<div class="card"><div class="card-header"><h3 class="card-title">Workflow timeline</h3></div>' +
      '<div class="card-body"><ol class="wf-timeline">' +
      steps.map(function (s) {
        var cls = s.done ? 'is-done' : s.current ? 'is-current' : 'is-pending';
        return '<li class="' + cls + '">' +
          '<span class="wf-dot"><i class="fa-solid ' +
            (s.done ? 'fa-check' : s.current ? 'fa-circle-dot' : 'fa-circle') + '"></i></span>' +
          '<span class="wf-label">' + s.label +
            (s.at ? '<span class="cell-sub">' + M.formatDate(s.at) + '</span>' : '') +
            (s.note ? '<span class="cell-sub">' + M.escapeHtml(s.note) + '</span>' : '') +
          '</span></li>';
      }).join('') + '</ol></div></div>';
  }

  /* ---------------------------------------------------------- requirements */

  function requirementCard(phase, title, subtitle) {
    var reqs = M.requirementsFor(activity.id, phase);
    if (!reqs.length) { return ''; }
    var p = M.requirementProgress(activity.id, phase);

    return '<div class="card"><div class="card-header">' +
        '<h3 class="card-title">' + title + '</h3>' +
        '<div class="card-tools"><span class="card-subtitle">' + p.approved + ' of ' +
          p.mandatory + ' required documents approved</span></div>' +
      '</div>' +
      (subtitle ? '<div class="card-body py-2 border-bottom text-sm text-muted">' + subtitle + '</div>' : '') +
      '<div class="card-body p-0"><div class="table-responsive"><table class="table mb-0">' +
        '<tbody>' + reqs.map(function (r) {
          return '<tr>' +
            '<td><span class="cell-primary">' + M.escapeHtml(r.name) +
              (r.requestedBySaso ? ' <span class="badge badge-info status-badge">Requested</span>' : '') +
              '</span>' +
              '<span class="cell-sub">' + (r.mandatory ? 'Required' : 'Optional') +
                (r.fileName ? ' · ' + M.escapeHtml(r.fileName) : '') + '</span>' +
              (r.remarks ? '<span class="req-remarks">' + M.escapeHtml(r.remarks) + '</span>' : '') +
            '</td>' +
            '<td class="text-nowrap">' + M.badge(r.status) + '</td>' +
            '<td class="text-right text-nowrap">' + requirementActions(r, phase) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table></div></div></div>';
  }

  function requirementActions(r, phase) {
    if (isSaso) {
      if (r.status === C.REQUIREMENT.UNDER_REVIEW) {
        return '<button type="button" class="btn btn-sm btn-outline-success mr-1" ' +
            'data-req="' + r.id + '" data-req-action="approve">Approve</button>' +
          '<button type="button" class="btn btn-sm btn-outline-warning" ' +
            'data-req="' + r.id + '" data-req-action="return">Return</button>';
      }
      return '<span class="text-muted text-sm">' +
        (r.reviewedAt ? 'Reviewed ' + M.relativeTime(r.reviewedAt) : '—') + '</span>';
    }

    /* Organization side */
    if (r.status === C.REQUIREMENT.NOT_SUBMITTED || r.status === C.REQUIREMENT.NEEDS_REVISION) {
      return '<label class="btn btn-sm btn-outline-primary mb-0">' +
        '<i class="fa-solid fa-paperclip mr-1"></i>' +
        (r.status === C.REQUIREMENT.NEEDS_REVISION ? 'Replace' : 'Attach') +
        '<input type="file" class="d-none" data-attach="' + M.escapeHtml(r.name) +
          '" data-phase="' + phase + '"></label>';
    }
    return '<span class="text-muted text-sm">Submitted ' + M.relativeTime(r.submittedAt) + '</span>';
  }

  /* ---------------------------------------------------------------- routing */

  function routeCard() {
    var legs = M.routeFor(activity.id);
    if (!legs.length) { return ''; }

    return '<div class="card"><div class="card-header">' +
        '<h3 class="card-title">Approval route</h3>' +
        '<div class="card-tools"><span class="card-subtitle">Recorded by SASO</span></div>' +
      '</div><div class="card-body p-0"><table class="table mb-0"><tbody>' +
      legs.map(function (l) {
        var pending = l.transmittedAt && !l.decidedAt;
        return '<tr>' +
          '<td><span class="cell-primary">' + M.label(l.office) + '</span>' +
            (l.remarks ? '<span class="cell-sub">' + M.escapeHtml(l.remarks) + '</span>' : '') + '</td>' +
          '<td class="text-sm text-muted">' +
            (l.transmittedAt ? 'Sent ' + M.formatDate(l.transmittedAt) : '—') + '</td>' +
          '<td class="text-right">' +
            (l.decidedAt
              ? '<span class="badge badge-success status-badge">' +
                M.escapeHtml(l.decision) + '</span><span class="cell-sub">' +
                M.formatDate(l.decidedAt) + '</span>'
              : pending
                ? '<span class="badge badge-primary status-badge">Pending</span>' +
                  '<span class="cell-sub">' + M.daysBetween(l.transmittedAt, new Date()) + ' days</span>'
                : '—') +
          '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* --------------------------------------------------------------- comments */

  function commentCard() {
    var thread = M.commentsFor(activity.id);

    return '<div class="card"><div class="card-header">' +
        '<h3 class="card-title">Queries and comments</h3>' +
        '<div class="card-tools"><span class="card-subtitle">' + thread.length + ' message' +
          (thread.length === 1 ? '' : 's') + '</span></div>' +
      '</div>' +
      '<div class="card-body' + (thread.length ? ' scroll-pane' : '') + '">' +
        (thread.length
          ? thread.map(function (c) {
              var mine = c.role === role;
              return '<div class="cmt ' + (mine ? 'is-mine' : '') + '">' +
                '<div class="cmt-head">' +
                  '<span class="cmt-who">' + M.escapeHtml(c.senderName) + '</span>' +
                  M.badge(c.role === C.ROLE.SASO ? 'PRE_APPROVAL' : 'POST_ACTIVITY',
                          c.role === C.ROLE.SASO ? 'SASO' : 'Organization') +
                  '<span class="cmt-time">' + M.relativeTime(c.timestamp) + '</span>' +
                '</div>' +
                '<div class="cmt-body">' + M.escapeHtml(c.message) + '</div>' +
              '</div>';
            }).join('')
          : '<div class="empty-state py-3"><i class="fa-regular fa-comments"></i>' +
            '<h6>No messages yet</h6><p>Use this thread to raise or answer questions ' +
            'about this activity.</p></div>') +
      '</div>' +
      '<div class="card-footer">' +
        '<div class="input-group">' +
          '<textarea class="form-control" id="cmtInput" rows="2" placeholder="' +
            (isSaso ? 'Tell the organization what is needed…' : 'Ask SASO a question…') +
            '"></textarea>' +
          '<div class="input-group-append">' +
            '<button class="btn btn-primary" type="button" id="btnPostComment">Send</button>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  /* ------------------------------------------------------------- info cards */

  function infoCard() {
    function row(label, value) {
      return '<tr><th>' + label + '</th><td>' + (value || '—') + '</td></tr>';
    }
    return '<div class="card"><div class="card-header"><h3 class="card-title">Activity information</h3></div>' +
      '<div class="card-body p-0"><table class="table table-sm detail-table mb-0"><tbody>' +
        row('Organization', M.escapeHtml(org.name)) +
        row('Adviser', M.escapeHtml(org.adviser)) +
        row('Category', M.escapeHtml(activity.category)) +
        row('Venue', M.label(activity.venueType) + ' — ' + M.escapeHtml(activity.venue)) +
        row('Date', M.formatDateRange(activity.dateStart, activity.dateEnd)) +
        row('Time', (activity.timeStart || '—') + ' to ' + (activity.timeEnd || '—')) +
        row('Expected participants', activity.expectedParticipants +
            (activity.participantDescription
              ? ' <span class="cell-sub">' + M.escapeHtml(activity.participantDescription) + '</span>' : '')) +
        row('Budget', activity.budget
              ? M.escapeHtml(activity.budget) +
                (activity.fundSource ? ' <span class="cell-sub">' +
                  M.escapeHtml(activity.fundSource) + '</span>' : '')
              : null) +
        row('Rationale', M.escapeHtml(activity.rationale)) +
        row('Objectives', (activity.objectives || []).length
              ? '<ol class="mb-0 pl-3">' + activity.objectives.map(function (o) {
                  return '<li>' + M.escapeHtml(o) + '</li>'; }).join('') + '</ol>'
              : null) +
        row('Description', M.escapeHtml(activity.description)) +
      '</tbody></table></div></div>';
  }

  function historyCard() {
    var entries = M.historyFor(activity.id);
    if (!entries.length) { return ''; }
    var FIELD = { proposalStatus: 'Proposal', eventStatus: 'Event', record: 'Proposal' };

    return '<div class="card"><div class="card-header"><h3 class="card-title">Status history</h3></div>' +
      '<div class="card-body p-0 scroll-pane scroll-pane-sm">' +
        '<table class="table table-sm mb-0"><tbody>' +
        entries.map(function (h) {
          return '<tr><td>' +
            '<span class="cell-primary">' + (FIELD[h.field] || h.field) + ' → ' +
              M.label(h.toValue) + '</span>' +
            '<span class="cell-sub">' + M.escapeHtml(h.actorName) + ' · ' +
              M.relativeTime(h.timestamp) + '</span>' +
            (h.remarks ? '<span class="req-remarks">' + M.escapeHtml(h.remarks) + '</span>' : '') +
          '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
  }

  /* ------------------------------------------------------------------ render */

  function render() {
    var postCard = requirementCard(C.PHASE.POST_ACTIVITY, 'Post-activity reports',
      activity.reportDeadline
        ? 'Due ' + M.formatDate(activity.reportDeadline) +
          '. An activity is completed only once these are accepted.'
        : null);

    document.getElementById('detailRoot').innerHTML =
      renderHeader() + actionBar() +
      '<div class="row">' +
        '<div class="col-lg-8">' +
          timeline() +
          requirementCard(C.PHASE.PRE_APPROVAL, 'Pre-approval requirements',
            activity.venueType === C.VENUE.OFF_CAMPUS
              ? 'Off-campus activity — the CMO 63 documentary requirements apply.' : null) +
          postCard +
          commentCard() +
        '</div>' +
        '<div class="col-lg-4">' +
          infoCard() + routeCard() + historyCard() +
        '</div>' +
      '</div>';

    bind();
  }

  /* ------------------------------------------------------------------- events */

  function bind() {
    var root = document.getElementById('detailRoot');

    P.bind(root, reload, function () {
      window.location.href = (isSaso ? 'proposals.html' : 'activities.html') + '?trashed=1';
    });

    root.querySelectorAll('[data-action]').forEach(function (b) {
      b.addEventListener('click', function () { handleAction(this.getAttribute('data-action')); });
    });

    root.querySelectorAll('[data-req-action]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-req');
        var act = this.getAttribute('data-req-action');
        if (act === 'approve') {
          E.reviewRequirement(id, 'APPROVE');
          SASO.layout.toast('Requirement approved.');
          reload();
        } else {
          SASO.layout.confirmDialog({
            title: 'Return this document?',
            body: 'The organization will be notified and asked to resubmit.',
            remarksRequired: true,
            remarksPlaceholder: 'What needs to be corrected?',
            confirmLabel: 'Return for revision', variant: 'warning'
          }, function (remarks) {
            E.reviewRequirement(id, 'RETURN', remarks);
            SASO.layout.toast('Returned to the organization.', 'warning');
            reload();
          });
        }
      });
    });

    root.querySelectorAll('[data-attach]').forEach(function (input) {
      input.addEventListener('change', function () {
        var name = this.getAttribute('data-attach');
        var phase = this.getAttribute('data-phase');
        var file = this.files && this.files[0] ? this.files[0].name : 'document.pdf';
        if (phase === C.PHASE.POST_ACTIVITY) {
          E.submitReport(activity.id, name, file);
        } else {
          E.attachRequirement(activity.id, name, file);
          SASO.events.notifySaso(activity.id, C.NOTIF.REQUIREMENT_SUBMITTED,
            org.acronym + ' submitted ' + name + ' for ' + activity.title + '.');
          SASO.storage.save();
        }
        SASO.layout.toast(name + ' submitted for review.');
        reload();
      });
    });

    var post = document.getElementById('btnPostComment');
    if (post) {
      post.addEventListener('click', function () {
        var input = document.getElementById('cmtInput');
        var text = input.value.trim();
        if (!text) { input.classList.add('is-invalid'); return; }
        E.postComment(activity.id, text);
        SASO.layout.toast('Message sent.');
        reload();
      });
    }
  }

  function handleAction(action) {
    var map = {
      openReview: function () {
        E.openForReview(activity.id);
        SASO.layout.toast('Opened for review. The organization has been notified.');
        reload();
      },
      endorse: function () {
        SASO.layout.confirmDialog({
          title: 'Endorse this proposal?',
          body: 'All required documents are approved. Endorsing passes the proposal ' +
                'onward for approval by the VPAA and the President.',
          remarks: true, confirmLabel: 'Endorse', variant: 'primary'
        }, function (remarks) {
          E.endorse(activity.id, remarks);
          SASO.layout.toast('Endorsed.');
          reload();
        });
      },
      requestReq: function () { promptRequirement(); },
      returnProposal: function () {
        SASO.layout.confirmDialog({
          title: 'Return for revision?', body: 'The organization will be asked to revise and resubmit.',
          remarksRequired: true, confirmLabel: 'Return', variant: 'warning'
        }, function (remarks) { E.returnProposal(activity.id, remarks); reload(); });
      },
      rejectProposal: function () {
        SASO.layout.confirmDialog({
          title: 'Reject this proposal?', body: 'This closes the activity. It cannot proceed.',
          remarksRequired: true, confirmLabel: 'Reject', variant: 'danger'
        }, function (remarks) { E.rejectProposal(activity.id, remarks); reload(); });
      },
      toVpaa: function () {
        E.transmitTo(activity.id, C.OFFICE.VPAA);
        SASO.layout.toast('Recorded as transmitted to the VPAA.');
        reload();
      },
      vpaaApproved: function () {
        E.recordDecision(activity.id, C.OFFICE.VPAA, 'Approved');
        E.transmitTo(activity.id, C.OFFICE.PRESIDENT);
        SASO.layout.toast("VPAA approval recorded; sent to the President's Office.");
        reload();
      },
      vpaaReturned: function () {
        SASO.layout.confirmDialog({
          title: 'Record a return from the VPAA?', body: 'The organization will be asked to revise.',
          remarksRequired: true, confirmLabel: 'Record return', variant: 'warning'
        }, function (r) { E.recordDecision(activity.id, C.OFFICE.VPAA, 'Returned', r); reload(); });
      },
      presApproved: function () {
        E.recordDecision(activity.id, C.OFFICE.PRESIDENT, 'Approved');
        SASO.layout.toast('Approved. The organization has been notified.');
        reload();
      },
      presReturned: function () {
        SASO.layout.confirmDialog({
          title: "Record a return from the President's Office?",
          body: 'The organization will be asked to revise.',
          remarksRequired: true, confirmLabel: 'Record return', variant: 'warning'
        }, function (r) { E.recordDecision(activity.id, C.OFFICE.PRESIDENT, 'Returned', r); reload(); });
      },
      markOngoing: function () { E.setEventStatus(activity.id, C.EVENT.ONGOING); reload(); },
      markUpcoming: function () { E.setEventStatus(activity.id, C.EVENT.UPCOMING); reload(); },
      markPostponed: function () {
        SASO.layout.confirmDialog({
          title: 'Mark as postponed?',
          body: 'Approval and requirements are retained. Only the schedule changes.',
          remarksRequired: true, confirmLabel: 'Mark postponed', variant: 'warning'
        }, function (r) { E.setEventStatus(activity.id, C.EVENT.POSTPONED, r); reload(); });
      },
      markFinished: function () {
        SASO.layout.confirmDialog({
          title: 'Mark this activity as finished?',
          body: 'This creates the post-activity report checklist and sets a deadline ' +
                M.settings().reportDeadlineDays + ' days from today. The activity will ' +
                'NOT be completed until those reports are accepted.',
          confirmLabel: 'Mark finished', variant: 'primary'
        }, function () {
          E.setEventStatus(activity.id, C.EVENT.FINISHED);
          SASO.layout.toast('Marked finished. Post-activity reports are now required.', 'warning');
          reload();
        });
      }
    };
    if (map[action]) { map[action](); }
  }

  function promptRequirement() {
    var id = 'reqModal';
    var old = document.getElementById(id);
    if (old) { old.remove(); }

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + id + '" tabindex="-1"><div class="modal-dialog modal-dialog-centered">' +
        '<div class="modal-content"><div class="modal-header">' +
          '<h5 class="modal-title">Request an additional requirement</h5>' +
          '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label for="reqName">Document required</label>' +
            '<input type="text" class="form-control" id="reqName" ' +
              'placeholder="e.g. Adviser-signed Permission to Conduct">' +
            '<div class="invalid-feedback">Name the document you need.</div></div>' +
          '<div class="form-group mb-0"><label for="reqNote">Note to the organization</label>' +
            '<textarea class="form-control" id="reqNote" rows="2"></textarea></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
          '<button type="button" class="btn btn-primary" id="reqConfirm">Request document</button>' +
        '</div></div></div></div>');

    var $m = window.jQuery('#' + id);
    $m.modal('show');
    document.getElementById('reqConfirm').addEventListener('click', function () {
      var nameEl = document.getElementById('reqName');
      var name = nameEl.value.trim();
      if (!name) { nameEl.classList.add('is-invalid'); return; }
      var note = document.getElementById('reqNote').value.trim();
      E.requestRequirement(activity.id, name, C.PHASE.PRE_APPROVAL, note);
      if (note) { E.postComment(activity.id, note); }
      $m.modal('hide');
      SASO.layout.toast('Requirement requested. The organization has been notified.');
      reload();
    });
    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  render();
})();
