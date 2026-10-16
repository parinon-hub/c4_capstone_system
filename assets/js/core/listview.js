/* =========================================================================
   listview.js  —  Sorting, paging and pager rendering.

   Every list module in the system needs the same three things, so they live
   here once. A module owns its own filter state and row rendering; this file
   owns the mechanics around them.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.listview = (function () {
  'use strict';

  /* ---- sorting -------------------------------------------------------------- */

  /* Renders a clickable <th>. `state` carries { sort, dir }. */
  function sortHeader(state, key, label, extraClass) {
    var active = state.sort === key;
    var icon = !active ? 'fa-sort' : (state.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
    return '<th' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' +
      '<a href="#" class="sort-link' + (active ? ' is-active' : '') +
        '" data-sort="' + key + '">' + label +
        ' <i class="fa-solid ' + icon + '"></i></a></th>';
  }

  /* A plain column header. List pages keep their default order, so the
     headers carry no sort arrows. */
  function header(label, extraClass) {
    return '<th' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + label + '</th>';
  }

  /* An "Event Date" header with a small dropdown beside it that chooses
     whether each row shows the activity's start date or its end date.
     `state.dateField` holds the choice ('start' or 'end'). */
  var DATE_FIELDS = [
    { value: 'start', label: 'Start date', short: 'Start' },
    { value: 'end', label: 'End date', short: 'End' }
  ];

  function dateHeader(state, label) {
    var pick = state.dateField === 'end' ? 'end' : 'start';
    var current = DATE_FIELDS.filter(function (f) { return f.value === pick; })[0];
    return '<th class="text-nowrap">' + label +
      '<div class="dropdown date-pick">' +
        '<button type="button" class="date-pick-toggle" data-toggle="dropdown" ' +
          'aria-haspopup="true" aria-expanded="false" aria-label="Show start or end date">' +
          current.short + ' <i class="fa-solid fa-chevron-down"></i></button>' +
        '<div class="dropdown-menu date-pick-menu">' +
          DATE_FIELDS.map(function (f) {
            return '<a href="#" class="dropdown-item' + (f.value === pick ? ' is-selected' : '') +
              '" data-date-field="' + f.value + '">' + f.label + '</a>';
          }).join('') +
        '</div>' +
      '</div></th>';
  }

  /* The date the dropdown points at; one-day activities have no end date. */
  function pickedDate(activity, state) {
    return state.dateField === 'end'
      ? (activity.dateEnd || activity.dateStart)
      : activity.dateStart;
  }

  function bindDatePick(root, state, onChange) {
    root.querySelectorAll('[data-date-field]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var value = this.getAttribute('data-date-field');
        if (value === state.dateField) { return; }
        state.dateField = value;
        onChange();
      });
    });
  }

  /* Wires every sort header inside `root`. Numeric keys are compared as
     numbers, date-like keys as dates, everything else as lowercase text. */
  function bindSort(root, state, onChange) {
    root.querySelectorAll('.sort-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var key = this.getAttribute('data-sort');
        if (state.sort === key) {
          state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = key;
          state.dir = 'asc';
        }
        state.page = 1;
        onChange();
      });
    });
  }

  /* `accessor` returns the comparable value for a row. */
  function sort(rows, state, accessor) {
    return rows.slice().sort(function (x, y) {
      var a = accessor(x, state.sort);
      var b = accessor(y, state.sort);

      if (typeof a === 'number' && typeof b === 'number') {
        return state.dir === 'asc' ? a - b : b - a;
      }
      if (a instanceof Date || b instanceof Date) {
        a = new Date(a || 0); b = new Date(b || 0);
        return state.dir === 'asc' ? a - b : b - a;
      }
      a = String(a === null || a === undefined ? '' : a).toLowerCase();
      b = String(b === null || b === undefined ? '' : b).toLowerCase();
      if (a === b) { return 0; }
      return state.dir === 'asc' ? (a < b ? -1 : 1) : (a > b ? -1 : 1);
    });
  }

  /* ---- paging ---------------------------------------------------------------- */

  function paginate(rows, state, size) {
    var pages = Math.max(1, Math.ceil(rows.length / size));
    if (state.page > pages) { state.page = pages; }
    if (state.page < 1) { state.page = 1; }
    return {
      pages: pages,
      slice: rows.slice((state.page - 1) * size, state.page * size)
    };
  }

  function renderPager(hostId, total, pages, state, size, onChange) {
    var host = document.getElementById(hostId);
    if (!host) { return; }

    if (!total) { host.innerHTML = ''; return; }

    var from = (state.page - 1) * size + 1;
    var to = Math.min(state.page * size, total);

    var buttons = '';
    for (var i = 1; i <= pages; i += 1) {
      buttons += '<li class="page-item' + (i === state.page ? ' active' : '') + '">' +
        '<a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
    }

    host.innerHTML =
      '<span class="text-muted text-sm">Showing ' + from + '–' + to + ' of ' + total + '</span>' +
      (pages > 1
        ? '<ul class="pagination pagination-sm mb-0 ml-auto">' +
            '<li class="page-item' + (state.page === 1 ? ' disabled' : '') + '">' +
              '<a class="page-link" href="#" data-page="' + (state.page - 1) + '">&laquo;</a></li>' +
            buttons +
            '<li class="page-item' + (state.page === pages ? ' disabled' : '') + '">' +
              '<a class="page-link" href="#" data-page="' + (state.page + 1) + '">&raquo;</a></li>' +
          '</ul>'
        : '');

    host.querySelectorAll('.page-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var p = Number(this.getAttribute('data-page'));
        if (p >= 1 && p <= pages && p !== state.page) { state.page = p; onChange(); }
      });
    });
  }

  /* ---- filter controls --------------------------------------------------------- */

  function fillSelect(id, options, allLabel, selected) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.innerHTML = '<option value="">' + allLabel + '</option>' +
      options.map(function (o) {
        return '<option value="' + SASO.model.escapeHtml(o.value) + '">' +
          SASO.model.escapeHtml(o.label) + '</option>';
      }).join('');
    if (selected) { el.value = selected; }
  }

  return {
    sortHeader: sortHeader,
    header: header,
    dateHeader: dateHeader,
    pickedDate: pickedDate,
    bindDatePick: bindDatePick,
    bindSort: bindSort,
    sort: sort,
    paginate: paginate,
    renderPager: renderPager,
    fillSelect: fillSelect
  };
})();
