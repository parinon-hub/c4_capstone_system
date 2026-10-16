/* =========================================================================
   org-submit-activity.js  —  Activity request wizard.

   This is the module the panel asked for: the organization initiates the
   activity here, and the request lands with SASO, which then waits for the
   documentary requirements.

   The requirement checklist is conditional. Choosing an off-campus venue adds
   the CMO 63 documentary requirements, and switching back removes them again
   without discarding attachments already made to the other rows.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;

  var session = SASO.layout.init({
    role: C.ROLE.ORG,
    page: 'submit',
    title: 'Submit Activity',
    breadcrumb: [{ label: 'Dashboard', href: 'pages/org/dashboard.html' }, { label: 'Submit Activity' }]
  });
  if (!session) { return; }

  var params = new URLSearchParams(window.location.search);
  var activityId = params.get('id');
  var draft = activityId ? M.activityById(activityId) : null;

  /* Guard: an organization may only continue its own draft, and only while
     it is still a draft. */
  if (draft && (draft.organizationId !== session.organizationId ||
                draft.proposalStatus !== C.PROPOSAL.DRAFT)) {
    window.location.href = 'activities.html';
    return;
  }

  var step = 1;
  var objectives = [];

  var el = {
    title: document.getElementById('fTitle'),
    category: document.getElementById('fCategory'),
    venueType: document.getElementById('fVenueType'),
    venue: document.getElementById('fVenue'),
    dateStart: document.getElementById('fDateStart'),
    dateEnd: document.getElementById('fDateEnd'),
    timeStart: document.getElementById('fTimeStart'),
    timeEnd: document.getElementById('fTimeEnd'),
    participants: document.getElementById('fParticipants'),
    participantDesc: document.getElementById('fParticipantDesc'),
    rationale: document.getElementById('fRationale'),
    description: document.getElementById('fDescription'),
    budget: document.getElementById('fBudget'),
    fundSource: document.getElementById('fFundSource')
  };

  /* ---- option lists -------------------------------------------------------- */

  el.category.innerHTML = '<option value="">Select a category…</option>' +
    C.ACTIVITY_CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

  el.venueType.innerHTML = Object.keys(C.VENUE).map(function (k) {
    return '<option value="' + C.VENUE[k] + '">' + C.LABEL[C.VENUE[k]] + '</option>';
  }).join('');

  /* ---- objectives ---------------------------------------------------------- */

  function renderObjectives() {
    var host = document.getElementById('objectiveList');
    if (!objectives.length) { objectives = ['']; }

    host.innerHTML = objectives.map(function (o, i) {
      return '<div class="input-group mb-2">' +
        '<div class="input-group-prepend"><span class="input-group-text">' + (i + 1) + '</span></div>' +
        '<input type="text" class="form-control objective-input" data-i="' + i + '" ' +
          'value="' + M.escapeHtml(o) + '" placeholder="What should this activity achieve?">' +
        (objectives.length > 1
          ? '<div class="input-group-append"><button type="button" class="btn btn-outline-secondary remove-objective" ' +
            'data-i="' + i + '" aria-label="Remove objective"><i class="fa-solid fa-xmark"></i></button></div>'
          : '') +
      '</div>';
    }).join('');

    host.querySelectorAll('.objective-input').forEach(function (input) {
      input.addEventListener('input', function () {
        objectives[Number(this.getAttribute('data-i'))] = this.value;
        document.getElementById('objectiveError').classList.add('d-none');
      });
    });
    host.querySelectorAll('.remove-objective').forEach(function (btn) {
      btn.addEventListener('click', function () {
        objectives.splice(Number(this.getAttribute('data-i')), 1);
        renderObjectives();
      });
    });
  }

  document.getElementById('btnAddObjective').addEventListener('click', function () {
    objectives.push('');
    renderObjectives();
    var inputs = document.querySelectorAll('.objective-input');
    inputs[inputs.length - 1].focus();
  });

  /* ---- requirements -------------------------------------------------------- */

  function renderRequirements() {
    var host = document.getElementById('requirementList');

    if (!draft) {
      host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-file-lines"></i>' +
        '<h6>Complete steps 1 and 2 first</h6>' +
        '<p>The requirement checklist depends on the venue type you choose.</p></div>';
      return;
    }

    var reqs = M.requirementsFor(draft.id, C.PHASE.PRE_APPROVAL);
    host.innerHTML = '<div class="table-responsive"><table class="table mb-0">' +
      '<thead><tr><th>Document</th><th>Status</th><th class="text-right">Attachment</th></tr></thead>' +
      '<tbody>' + reqs.map(function (r) {
        var attached = r.status !== C.REQUIREMENT.NOT_SUBMITTED;
        return '<tr>' +
          '<td><span class="cell-primary">' + M.escapeHtml(r.name) + '</span>' +
            '<span class="cell-sub">' + (r.mandatory ? 'Required' : 'Optional') +
            (r.name.indexOf('CMO 63') === 0 ? ' · off-campus activities only' : '') + '</span></td>' +
          '<td>' + M.badge(r.status) + '</td>' +
          '<td class="text-right">' +
            (attached
              ? '<span class="file-chip">' + M.escapeHtml(r.fileName) + '</span>' +
                '<button type="button" class="btn btn-sm btn-link text-danger detach-req" ' +
                  'data-name="' + M.escapeHtml(r.name) + '">Remove</button>'
              : '<label class="btn btn-sm btn-outline-primary mb-0">' +
                  '<i class="fa-solid fa-paperclip mr-1"></i>Attach' +
                  '<input type="file" class="d-none attach-req" data-name="' +
                    M.escapeHtml(r.name) + '"></label>') +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';

    host.querySelectorAll('.attach-req').forEach(function (input) {
      input.addEventListener('change', function () {
        var name = this.getAttribute('data-name');
        var fileName = this.files && this.files[0] ? this.files[0].name : 'document.pdf';
        SASO.events.attachRequirement(draft.id, name, fileName);
        document.getElementById('requirementError').classList.add('d-none');
        renderRequirements();
        SASO.layout.toast(name + ' attached.');
      });
    });

    host.querySelectorAll('.detach-req').forEach(function (btn) {
      btn.addEventListener('click', function () {
        SASO.events.detachRequirement(draft.id, this.getAttribute('data-name'));
        renderRequirements();
      });
    });
  }

  /* ---- approval route preview ----------------------------------------------
     Shows the organization where the proposal will travel, which is the thing
     the current paper process makes invisible. */

  function renderRoute() {
    var offCampus = el.venueType.value === C.VENUE.OFF_CAMPUS;
    var stops = [
      { label: 'You submit the request', note: 'With the requirements attached' },
      { label: 'SASO reviews', note: 'Checks the documents and may ask for more' },
      { label: 'SASO endorses', note: 'Once the requirements are complete' },
      { label: 'VPAA', note: 'Reviews the endorsed proposal' },
      { label: "President's Office", note: 'Final approval' },
      { label: 'You conduct the activity', note: '' },
      { label: 'You submit the reports', note: 'Within ' + M.settings().reportDeadlineDays + ' days of the event' },
      { label: 'Activity completed', note: 'Once SASO accepts the reports' }
    ];

    document.getElementById('routePreview').innerHTML = stops.map(function (s, i) {
      return '<li>' +
        '<span class="route-no">' + (i + 1) + '</span>' +
        '<span class="route-label">' + s.label +
          (s.note ? '<span class="cell-sub">' + s.note + '</span>' : '') + '</span>' +
      '</li>';
    }).join('') +
      (offCampus
        ? '<li class="route-note"><i class="fa-solid fa-circle-info mr-1"></i>' +
          'Off-campus activities also require the CMO 63 documentary requirements.</li>'
        : '');
  }

  /* ---- form <-> state ------------------------------------------------------- */

  function readForm() {
    return {
      title: el.title.value.trim(),
      category: el.category.value,
      venueType: el.venueType.value,
      venue: el.venue.value.trim(),
      dateStart: el.dateStart.value,
      dateEnd: el.dateEnd.value || el.dateStart.value,
      timeStart: el.timeStart.value,
      timeEnd: el.timeEnd.value,
      expectedParticipants: Number(el.participants.value) || null,
      participantDescription: el.participantDesc.value.trim(),
      rationale: el.rationale.value.trim(),
      objectives: objectives.filter(function (o) { return o.trim(); }),
      description: el.description.value.trim(),
      budget: el.budget.value.trim() || null,
      fundSource: el.fundSource.value.trim() || null
    };
  }

  function fillForm(a) {
    el.title.value = a.title || '';
    el.category.value = a.category || '';
    el.venueType.value = a.venueType || C.VENUE.ON_CAMPUS;
    el.venue.value = a.venue || '';
    el.dateStart.value = a.dateStart || '';
    el.dateEnd.value = a.dateEnd || '';
    el.timeStart.value = a.timeStart || '08:00';
    el.timeEnd.value = a.timeEnd || '17:00';
    el.participants.value = a.expectedParticipants || '';
    el.participantDesc.value = a.participantDescription || '';
    el.rationale.value = a.rationale || '';
    el.description.value = a.description || '';
    el.budget.value = a.budget || '';
    el.fundSource.value = a.fundSource || '';
    objectives = (a.objectives && a.objectives.length) ? a.objectives.slice() : [''];
    renderObjectives();
  }

  /* ---- validation ------------------------------------------------------------ */

  function invalid(node, on) {
    node.classList.toggle('is-invalid', !!on);
    return !on;
  }

  function validateStep(n) {
    var ok = true;

    if (n === 1) {
      ok = invalid(el.title, !el.title.value.trim()) && ok;
      ok = invalid(el.category, !el.category.value) && ok;
      ok = invalid(el.venue, !el.venue.value.trim()) && ok;
      ok = invalid(el.dateStart, !el.dateStart.value) && ok;
      ok = invalid(el.participantDesc, !el.participantDesc.value.trim()) && ok;
      ok = invalid(el.participants, !(Number(el.participants.value) > 0)) && ok;

      /* A proposal is a request to hold something that has not happened yet. */
      if (el.dateStart.value) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(el.dateStart.value) < today) {
          document.getElementById('dateStartError').textContent =
            'The activity date cannot be in the past.';
          ok = invalid(el.dateStart, true) && ok;
        }
      }
      if (el.dateEnd.value && el.dateStart.value &&
          new Date(el.dateEnd.value) < new Date(el.dateStart.value)) {
        ok = invalid(el.dateEnd, true) && ok;
      }
    }

    if (n === 2) {
      ok = invalid(el.rationale, !el.rationale.value.trim()) && ok;
      ok = invalid(el.description, !el.description.value.trim()) && ok;
      var hasObjective = objectives.some(function (o) { return o.trim(); });
      document.getElementById('objectiveError').classList.toggle('d-none', hasObjective);
      ok = hasObjective && ok;
    }

    if (n === 3) {
      var missing = draft ? M.missingRequirements(draft.id, C.PHASE.PRE_APPROVAL) : [];
      var complete = draft && !missing.length;
      document.getElementById('requirementError').classList.toggle('d-none', !!complete);
      if (!complete && missing.length) {
        document.getElementById('requirementError').textContent =
          'Still to attach: ' + missing.map(function (m) { return m.name; }).join(', ') + '.';
      }
      ok = !!complete && ok;
    }

    return ok;
  }

  /* ---- persistence ------------------------------------------------------------ */

  function persist(quiet) {
    draft = SASO.events.saveDraft(readForm(), draft ? draft.id : null);
    if (!quiet) {
      document.getElementById('saveState').textContent =
        'Draft saved ' + M.relativeTime(draft.updatedAt);
    }
    return draft;
  }

  /* ---- step navigation --------------------------------------------------------- */

  function showStep(n) {
    step = n;
    document.querySelectorAll('.wizard-step').forEach(function (s) {
      s.classList.toggle('d-none', Number(s.getAttribute('data-step')) !== n);
    });
    document.querySelectorAll('#wizardTabs .nav-link').forEach(function (t) {
      var i = Number(t.getAttribute('data-step'));
      t.classList.toggle('active', i === n);
      t.classList.toggle('is-done', i < n);
    });

    document.getElementById('btnBack').classList.toggle('invisible', n === 1);
    document.getElementById('btnNext').classList.toggle('d-none', n === 3);
    document.getElementById('btnSubmit').classList.toggle('d-none', n !== 3);

    if (n === 3) { renderRequirements(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('#wizardTabs .nav-link').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = Number(this.getAttribute('data-step'));
      if (target > step) {
        for (var i = step; i < target; i += 1) {
          if (!validateStep(i)) { showStep(i); return; }
        }
        persist(true);
      }
      showStep(target);
    });
  });

  document.getElementById('btnNext').addEventListener('click', function () {
    if (!validateStep(step)) { return; }
    persist(true);
    showStep(step + 1);
  });

  document.getElementById('btnBack').addEventListener('click', function () {
    showStep(step - 1);
  });

  document.getElementById('btnSaveDraft').addEventListener('click', function () {
    if (!el.title.value.trim()) {
      invalid(el.title, true);
      showStep(1);
      SASO.layout.toast('Give the activity a title before saving.', 'warning');
      return;
    }
    persist();
    SASO.layout.toast('Draft saved. You can continue it from Activities.');
  });

  /* Changing the venue type rebuilds the checklist. */
  el.venueType.addEventListener('change', function () {
    renderRoute();
    if (draft) {
      SASO.events.syncRequirements(draft.id, el.venueType.value);
      draft.venueType = el.venueType.value;
      SASO.storage.save();
      if (step === 3) { renderRequirements(); }
      if (el.venueType.value === C.VENUE.OFF_CAMPUS) {
        SASO.layout.toast('Off-campus activities also require CMO 63 documents.', 'warning');
      }
    }
    document.getElementById('venueHint').textContent =
      el.venueType.value === C.VENUE.OFF_CAMPUS
        ? 'Adds the CMO 63 requirements.' : '';
  });

  /* ---- submit -------------------------------------------------------------------- */

  document.getElementById('btnSubmit').addEventListener('click', function () {
    for (var i = 1; i <= 3; i += 1) {
      if (!validateStep(i)) { showStep(i); return; }
    }
    persist(true);

    SASO.layout.confirmDialog({
      title: 'Submit this proposal?',
      body: 'The request will be sent to SASO for review. You can still respond to ' +
            'SASO and submit further documents afterwards, but the proposal itself ' +
            'will no longer be editable.',
      confirmLabel: 'Submit proposal',
      variant: 'primary'
    }, function () {
      SASO.events.submitProposal(draft.id);
      window.location.href = 'activities.html?submitted=' + encodeURIComponent(draft.id);
    });
  });

  /* ---- go -------------------------------------------------------------------------- */

  if (draft) {
    fillForm(draft);
    document.getElementById('saveState').textContent =
      'Draft saved ' + M.relativeTime(draft.updatedAt);
  } else {
    el.venueType.value = C.VENUE.ON_CAMPUS;
    renderObjectives();
  }

  renderRoute();
  showStep(1);
})();
