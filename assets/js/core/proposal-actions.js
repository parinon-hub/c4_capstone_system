/* =========================================================================
   proposal-actions.js  —  Edit and delete, shared by every screen.

   The same Edit and Delete controls appear on the SASO proposal queue, the
   organization's Activities list and Activity Details, so the dialogs
   live here once. All state changes go through SASO.events, which writes the
   status history and sends the notifications.

   Load after layout.js.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.proposalActions = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var E = SASO.events;

  function session() { return SASO.auth.current(); }
  function esc(v) { return M.escapeHtml(v); }

  /* ---- buttons --------------------------------------------------------------- */

  /* Compact Edit / Delete buttons for a table row. Empty when not permitted. */
  function rowButtons(activity) {
    if (!M.canModifyProposal(session(), activity)) { return ''; }
    return '<button type="button" class="btn btn-sm btn-outline-secondary ml-1" ' +
        'data-edit-proposal="' + activity.id + '" title="Edit proposal" aria-label="Edit proposal">' +
        '<i class="fa-solid fa-pen-to-square"></i></button>' +
      '<button type="button" class="btn btn-sm btn-outline-danger ml-1" ' +
        'data-delete-proposal="' + activity.id + '" title="Delete proposal" aria-label="Delete proposal">' +
        '<i class="fa-solid fa-trash-can"></i></button>';
  }

  /* Labelled buttons for the Activity Details action bar. */
  function actionButtons(activity) {
    if (!M.canModifyProposal(session(), activity)) { return ''; }
    return '<button type="button" class="btn btn-outline-secondary btn-sm mr-1 mb-1" ' +
        'data-edit-proposal="' + activity.id + '">' +
        '<i class="fa-solid fa-pen-to-square mr-1"></i>Edit proposal</button>' +
      '<button type="button" class="btn btn-outline-danger btn-sm mr-1 mb-1" ' +
        'data-delete-proposal="' + activity.id + '">' +
        '<i class="fa-solid fa-trash-can mr-1"></i>Delete</button>';
  }

  /* The Trash bin button that sits in a list's card header. */
  function trashButton(href) {
    var s = session();
    if (!M.canManageProposals(s)) { return ''; }
    var n = M.trashFor(s).length;
    return '<a class="btn btn-sm btn-outline-secondary" href="' + href + '">' +
      '<i class="fa-solid fa-trash-can mr-1"></i>Trash bin' +
      (n ? ' <span class="badge badge-secondary ml-1">' + n + '</span>' : '') + '</a>';
  }

  /* Wires every Edit / Delete button inside `root`. */
  function bind(root, onEdited, onDeleted) {
    root.querySelectorAll('[data-edit-proposal]').forEach(function (b) {
      b.addEventListener('click', function () {
        openEdit(this.getAttribute('data-edit-proposal'), onEdited);
      });
    });
    root.querySelectorAll('[data-delete-proposal]').forEach(function (b) {
      b.addEventListener('click', function () {
        confirmDelete(this.getAttribute('data-delete-proposal'), onDeleted);
      });
    });
  }

  /* ---- edit ------------------------------------------------------------------ */

  function field(id, label, control, cols, required) {
    return '<div class="form-group col-md-' + (cols || 12) + '">' +
      '<label for="' + id + '">' + label + (required ? ' <span class="text-danger">*</span>' : '') +
      '</label>' + control + '</div>';
  }

  function input(id, value, type, extra) {
    return '<input type="' + (type || 'text') + '" class="form-control form-control-sm" id="' + id +
      '" value="' + esc(value === null || value === undefined ? '' : value) + '"' + (extra || '') + '>';
  }

  function textarea(id, value, rows) {
    return '<textarea class="form-control form-control-sm" id="' + id + '" rows="' + (rows || 2) + '">' +
      esc(value || '') + '</textarea>';
  }

  function select(id, options, value) {
    return '<select class="form-control form-control-sm" id="' + id + '">' +
      options.map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' +
          esc(o.label) + '</option>';
      }).join('') + '</select>';
  }

  function openEdit(activityId, onSaved) {
    var s = session();
    var a = M.activityById(activityId);
    if (!M.canModifyProposal(s, a)) {
      SASO.layout.toast('This proposal can no longer be edited — it has left SASO review.', 'warning');
      return;
    }
    var isSaso = s.role === C.ROLE.SASO;
    var id = 'editProposalModal';
    var old = document.getElementById(id);
    if (old) { old.remove(); }

    var categories = C.ACTIVITY_CATEGORIES.map(function (c) { return { value: c, label: c }; });
    var venues = Object.keys(C.VENUE).map(function (k) {
      return { value: C.VENUE[k], label: C.LABEL[C.VENUE[k]] };
    });

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal fade" id="' + id + '" tabindex="-1">' +
        '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title">Edit activity proposal</h5>' +
            '<button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
          '<div class="modal-body">' +
            '<div class="callout callout-info py-2 mb-3 text-sm">' +
              (isSaso
                ? 'You are editing a proposal submitted by <strong>' + esc(M.orgAcronym(a.organizationId)) +
                  '</strong>. The organization and the SASO Head, Administrative Aide and ' +
                  'Coordinator will be notified of what changed.'
                : 'SASO will be notified of what you changed. Proposals can be edited only ' +
                  'while they are under SASO review.') +
            '</div>' +
            '<div class="form-row">' +
              field('eTitle', 'Activity title', input('eTitle', a.title), 12, true) +
              field('eCategory', 'Category', select('eCategory', categories, a.category), 6) +
              field('eVenueType', 'Venue type', select('eVenueType', venues, a.venueType), 6) +
              field('eVenue', 'Venue', input('eVenue', a.venue), 12, true) +
              field('eDateStart', 'Start date', input('eDateStart', a.dateStart, 'date'), 6, true) +
              field('eDateEnd', 'End date', input('eDateEnd', a.dateEnd, 'date'), 6) +
              field('eTimeStart', 'Start time', input('eTimeStart', a.timeStart, 'time'), 6) +
              field('eTimeEnd', 'End time', input('eTimeEnd', a.timeEnd, 'time'), 6) +
              field('eParticipants', 'Expected participants',
                input('eParticipants', a.expectedParticipants, 'number', ' min="1"'), 4) +
              field('eParticipantDesc', 'Participant description',
                input('eParticipantDesc', a.participantDescription), 8) +
              field('eBudget', 'Budget (₱)', input('eBudget', a.budget), 4) +
              field('eFundSource', 'Fund source', input('eFundSource', a.fundSource), 8) +
              field('eRationale', 'Rationale', textarea('eRationale', a.rationale, 2), 12) +
              field('eObjectives', 'Objectives <span class="text-muted text-sm">(one per line)</span>',
                textarea('eObjectives', (a.objectives || []).join('\n'), 3), 12) +
              field('eDescription', 'Description', textarea('eDescription', a.description, 2), 12) +
            '</div>' +
            '<p class="text-sm text-muted mb-3" id="eVenueNote"></p>' +
            '<div class="form-group mb-0">' +
              '<label for="eReason">Reason for the change' +
                (isSaso ? ' <span class="text-danger">*</span>' : ' <span class="text-muted">(optional)</span>') +
              '</label>' +
              '<textarea class="form-control form-control-sm" id="eReason" rows="2" placeholder="' +
                (isSaso ? 'Tell the organization why SASO changed its proposal'
                        : 'e.g. Venue moved because the auditorium is booked') + '"></textarea>' +
              '<div class="invalid-feedback">Give a reason so the organization knows why its proposal was changed.</div>' +
            '</div>' +
            '<div class="alert alert-danger text-sm mt-3 mb-0 d-none" id="eError"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="eSave">' +
              '<i class="fa-solid fa-floppy-disk mr-1"></i>Save changes</button>' +
          '</div>' +
        '</div></div></div>');

    var $m = window.jQuery('#' + id);
    $m.modal('show');

    /* Explain the requirement consequence of changing venue type. */
    var venueNote = document.getElementById('eVenueNote');
    document.getElementById('eVenueType').addEventListener('change', function () {
      var toOff = this.value === C.VENUE.OFF_CAMPUS;
      var wasOff = a.venueType === C.VENUE.OFF_CAMPUS;
      venueNote.innerHTML = toOff && !wasOff
        ? '<i class="fa-solid fa-circle-info mr-1"></i>Changing to off-campus adds the CMO 63 documentary requirements.'
        : !toOff && wasOff
          ? '<i class="fa-solid fa-circle-info mr-1"></i>Changing away from off-campus removes the CMO 63 requirement.'
          : '';
    });

    function val(fid) { return document.getElementById(fid).value.trim(); }

    document.getElementById('eSave').addEventListener('click', function () {
      var err = document.getElementById('eError');
      err.classList.add('d-none');
      document.querySelectorAll('#' + id + ' .is-invalid').forEach(function (x) {
        x.classList.remove('is-invalid');
      });

      var problems = [];
      ['eTitle', 'eVenue', 'eDateStart'].forEach(function (fid) {
        if (!val(fid)) { document.getElementById(fid).classList.add('is-invalid'); problems.push(fid); }
      });
      var start = val('eDateStart'), end = val('eDateEnd') || start;
      if (start && end < start) {
        document.getElementById('eDateEnd').classList.add('is-invalid');
        problems.push('dates');
      }
      var reason = val('eReason');
      if (isSaso && !reason) {
        document.getElementById('eReason').classList.add('is-invalid');
        problems.push('reason');
      }
      if (problems.length) {
        err.textContent = problems.indexOf('dates') !== -1
          ? 'The end date cannot be earlier than the start date.'
          : 'Please complete the highlighted fields.';
        err.classList.remove('d-none');
        return;
      }

      var participants = parseInt(val('eParticipants'), 10);
      var result = E.editProposal(activityId, {
        title: val('eTitle'),
        category: val('eCategory'),
        venueType: val('eVenueType'),
        venue: val('eVenue'),
        dateStart: start,
        dateEnd: end,
        timeStart: val('eTimeStart'),
        timeEnd: val('eTimeEnd'),
        expectedParticipants: isNaN(participants) ? a.expectedParticipants : participants,
        participantDescription: val('eParticipantDesc'),
        budget: val('eBudget') || null,
        fundSource: val('eFundSource') || null,
        rationale: val('eRationale'),
        objectives: val('eObjectives').split('\n')
          .map(function (o) { return o.trim(); })
          .filter(function (o) { return o.length; }),
        description: val('eDescription')
      }, reason);

      $m.modal('hide');
      if (!result) {
        SASO.layout.toast('This proposal can no longer be edited.', 'danger');
      } else if (!result.changed.length) {
        SASO.layout.toast('No changes to save.', 'warning');
      } else {
        SASO.layout.toast('Proposal updated — ' +
          (isSaso ? 'the organization and SASO staff' : 'SASO') + ' have been notified.');
        if (onSaved) { onSaved(result.activity); }
      }
    });

    $m.on('hidden.bs.modal', function () { $m.remove(); });
  }

  /* ---- delete ---------------------------------------------------------------- */

  function confirmDelete(activityId, onDeleted) {
    var s = session();
    var a = M.activityById(activityId);
    if (!M.canModifyProposal(s, a)) {
      SASO.layout.toast('This proposal can no longer be deleted — it has left SASO review.', 'warning');
      return;
    }
    var isSaso = s.role === C.ROLE.SASO;

    SASO.layout.confirmDialog({
      title: 'Delete this proposal?',
      body: '"' + a.title + '" will be moved to the trash bin, together with its documents and ' +
            'comments. It can be restored from there within ' + C.TRASH_RETENTION_DAYS +
            ' days; after that it is permanently deleted. ' +
            (isSaso ? 'The organization and the SASO Head, Administrative Aide and Coordinator will be notified.'
                    : 'SASO will be notified.'),
      remarks: !isSaso,
      remarksRequired: isSaso,
      remarksLabel: 'Reason for deleting',
      remarksPlaceholder: isSaso ? 'Tell the organization why this proposal was removed'
                                 : 'e.g. Activity cancelled by the organization',
      remarksError: 'Give a reason so the organization knows why its proposal was removed.',
      confirmLabel: 'Move to trash bin',
      variant: 'danger'
    }, function (reason) {
      var item = E.deleteProposal(activityId, reason);
      if (!item) {
        SASO.layout.toast('This proposal could not be deleted.', 'danger');
        return;
      }
      SASO.layout.toast('Moved to the trash bin. You can restore it within ' +
        C.TRASH_RETENTION_DAYS + ' days.', 'warning');
      if (onDeleted) { onDeleted(item); }
    });
  }

  return {
    rowButtons: rowButtons,
    actionButtons: actionButtons,
    trashButton: trashButton,
    bind: bind,
    openEdit: openEdit,
    confirmDelete: confirmDelete
  };
})();
