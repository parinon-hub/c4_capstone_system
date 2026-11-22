/* =========================================================================
   ptc-fields.js  -  The extra details the Permission to Conduct forms ask for.

   SASO's PTC forms (CSPC-F-SASO-05 on campus, CSPC-F-SASO-07 off campus)
   ask for the nature of the activity, a co-responsible person and, off
   campus, the instructors joining and the transportation. The organization
   gives them once with the proposal, so the downloaded PTC is already
   filled in and nothing has to be written by hand.

   Used by the submit wizard and the Edit proposal dialog:
     SASO.ptcFields.html(prefix, activity)  markup
     SASO.ptcFields.bind(prefix, opts)      wiring (opts.category(), opts.venueType())
     SASO.ptcFields.read(prefix)            values to save
   ========================================================================= */

var SASO = window.SASO || {};

SASO.ptcFields = (function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  function esc(v) { return M.escapeHtml(v); }
  function $(prefix, name) { return document.getElementById(prefix + name); }

  function itemOptions(type, selected) {
    var list = C.ACTIVITY_NATURE[type] || [];
    return '<option value="">Select…</option>' + list.map(function (n) {
      return '<option value="' + esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + esc(n) + '</option>';
    }).join('');
  }

  function html(prefix, a, compact) {
    a = a || {};
    var type = a.natureType || 'NON_CURRICULAR';
    var cls = compact ? 'form-control form-control-sm' : 'form-control';
    var off = a.venueType === C.VENUE.OFF_CAMPUS;
    return '<div class="ptc-fields" id="' + prefix + 'Ptc">' +
      '<div class="ptc-fields-title"><i class="fa-solid fa-stamp mr-1"></i>For the Permission to Conduct' +
        '<span class="text-muted font-weight-normal"> · filled in on the downloaded PTC form</span></div>' +
      '<div class="form-row">' +
        '<div class="form-group col-md-4"><label class="text-sm d-block">Nature of activity</label>' +
          '<div class="custom-control custom-radio custom-control-inline">' +
            '<input type="radio" class="custom-control-input" name="' + prefix + 'NatureType" id="' + prefix + 'NatCur" value="CURRICULAR"' +
              (type === 'CURRICULAR' ? ' checked' : '') + '>' +
            '<label class="custom-control-label" for="' + prefix + 'NatCur">Curricular</label></div>' +
          '<div class="custom-control custom-radio custom-control-inline">' +
            '<input type="radio" class="custom-control-input" name="' + prefix + 'NatureType" id="' + prefix + 'NatNon" value="NON_CURRICULAR"' +
              (type !== 'CURRICULAR' ? ' checked' : '') + '>' +
            '<label class="custom-control-label" for="' + prefix + 'NatNon">Non-curricular</label></div>' +
        '</div>' +
        '<div class="form-group col-md-8"><label for="' + prefix + 'NatureItem" class="text-sm">Type, as listed on the form</label>' +
          '<select class="' + cls + '" id="' + prefix + 'NatureItem">' + itemOptions(type, a.natureItem) + '</select></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group col-md-7"><label for="' + prefix + 'CoName" class="text-sm">Co-responsible person ' +
          '<span class="text-muted">(optional)</span></label>' +
          '<input type="text" class="' + cls + '" id="' + prefix + 'CoName" value="' + esc(a.coResponsibleName || '') +
            '" placeholder="e.g. Lorenzo Fajardo"></div>' +
        '<div class="form-group col-md-5"><label for="' + prefix + 'CoPos" class="text-sm">Designation</label>' +
          '<input type="text" class="' + cls + '" id="' + prefix + 'CoPos" value="' + esc(a.coResponsiblePosition || '') +
            '" placeholder="e.g. Vice President"></div>' +
      '</div>' +
      '<div class="ptc-offcampus' + (off ? '' : ' d-none') + '" id="' + prefix + 'OffBlock">' +
        '<div class="form-group"><label for="' + prefix + 'Instructors" class="text-sm">Instructors / personnel-in-charge joining the activity</label>' +
          '<input type="text" class="' + cls + '" id="' + prefix + 'Instructors" value="' + esc(a.instructors || '') +
            '" placeholder="e.g. Engr. Ramon Almeda, Ms. Liza Ocampo"></div>' +
        '<div class="form-row">' +
          '<div class="form-group col-md-6"><label for="' + prefix + 'Transport" class="text-sm">Transportation</label>' +
            '<select class="' + cls + '" id="' + prefix + 'Transport">' +
              '<option value="">Not decided yet</option>' +
              '<option value="COLLEGE"' + (a.transportType === 'COLLEGE' ? ' selected' : '') + '>College vehicle (rate per day)</option>' +
              '<option value="PRIVATE"' + (a.transportType === 'PRIVATE' ? ' selected' : '') + '>Private vehicle (rate per student)</option>' +
            '</select></div>' +
          '<div class="form-group col-md-6"><label for="' + prefix + 'Rate" class="text-sm" id="' + prefix + 'RateLabel">' +
            (a.transportType === 'PRIVATE' ? 'Rate per student (PHP)' : 'Rate per day (PHP)') + '</label>' +
            '<input type="text" class="' + cls + '" id="' + prefix + 'Rate" value="' + esc(a.transportRate || '') +
              '" placeholder="e.g. 3,500"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* opts.category() and opts.venueType() read the rest of the form. */
  function bind(prefix, opts) {
    var item = $(prefix, 'NatureItem');
    var touched = !!item.value;
    function setType(type, keep) {
      var cur = item.value;
      item.innerHTML = itemOptions(type, keep ? cur : '');
      if (!keep || item.value !== cur) { suggest(); }
    }
    function suggest() {
      if (touched) { return; }
      var type = (document.querySelector('input[name="' + prefix + 'NatureType"]:checked') || {}).value;
      var guess = type === 'NON_CURRICULAR' ? C.CATEGORY_NATURE[opts.category()] : null;
      if (type === 'CURRICULAR' && opts.venueType() === C.VENUE.OFF_CAMPUS) { guess = C.ACTIVITY_NATURE.CURRICULAR[0]; }
      if (guess) { item.value = guess; }
    }
    document.querySelectorAll('input[name="' + prefix + 'NatureType"]').forEach(function (r) {
      r.addEventListener('change', function () { touched = false; setType(this.value, false); });
    });
    item.addEventListener('change', function () { touched = !!this.value; });
    $(prefix, 'Transport').addEventListener('change', function () {
      $(prefix, 'RateLabel').textContent = this.value === 'PRIVATE' ? 'Rate per student (PHP)' : 'Rate per day (PHP)';
    });
    return {
      /* Call when the category or venue type changes. */
      refresh: function () {
        $(prefix, 'OffBlock').classList.toggle('d-none', opts.venueType() !== C.VENUE.OFF_CAMPUS);
        suggest();
      }
    };
  }

  function read(prefix) {
    var off = !$(prefix, 'OffBlock').classList.contains('d-none');
    var type = (document.querySelector('input[name="' + prefix + 'NatureType"]:checked') || {}).value || null;
    return {
      natureType: type,
      natureItem: $(prefix, 'NatureItem').value || null,
      coResponsibleName: $(prefix, 'CoName').value.trim() || null,
      coResponsiblePosition: $(prefix, 'CoPos').value.trim() || null,
      instructors: off ? ($(prefix, 'Instructors').value.trim() || null) : null,
      transportType: off ? ($(prefix, 'Transport').value || null) : null,
      transportRate: off ? ($(prefix, 'Rate').value.trim() || null) : null
    };
  }

  return { html: html, bind: bind, read: read };
})();
