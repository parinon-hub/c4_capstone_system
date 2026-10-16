/* =========================================================================
   listview.js  —  Sorting, paging, pager rendering and the list toolbar.

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
    { value: 'start', label: 'Start date' },
    { value: 'end', label: 'End date' }
  ];

  function dateHeader(state, label) {
    var pick = state.dateField === 'end' ? 'end' : 'start';
    var current = DATE_FIELDS.filter(function (f) { return f.value === pick; })[0];
    return '<th class="text-nowrap">' + label +
      '<div class="dropdown date-pick">' +
        '<button type="button" class="date-pick-toggle is-' + pick + '" data-toggle="dropdown" ' +
          'aria-haspopup="true" aria-expanded="false" title="Showing ' + current.label.toLowerCase() + '" ' +
          'aria-label="Showing ' + current.label.toLowerCase() + '. Choose start or end date">' +
          '<i class="fa-solid fa-chevron-down"></i></button>' +
        '<div class="dropdown-menu date-pick-menu">' +
          DATE_FIELDS.map(function (f) {
            return '<a href="#" class="dropdown-item is-' + f.value + (f.value === pick ? ' is-selected' : '') +
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

  /* ---- toolbar: search, Sort, Filter and Clear ------------------------------------
     The same toolbar as the organization's Activities page: a long search box,
     then a Sort menu (sort by, direction, group by) and a Filter menu with one
     column per filter, all pushed to the far right. A page passes its options
     and gets back helpers for ordering and grouping its rows. */

  function toolbarHtml(placeholder) {
    var esc = SASO.model.escapeHtml;
    return '<div class="list-toolbar">' +
      '<div class="list-search"><i class="fa-solid fa-magnifying-glass"></i>' +
        '<input type="search" class="form-control form-control-sm" id="fSearch" ' +
          'placeholder="' + esc(placeholder) + '" aria-label="' + esc(placeholder) + '"></div>' +
      '<div class="dropdown"><button type="button" class="btn btn-sm btn-outline-secondary list-tool" ' +
          'id="btnSort" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
          '<i class="fa-solid fa-arrow-down-wide-short mr-1"></i>Sort ' +
          '<i class="fa-solid fa-chevron-down ml-1 list-tool-caret"></i></button>' +
        '<div class="dropdown-menu dropdown-menu-right list-menu" id="sortMenu" aria-labelledby="btnSort"></div></div>' +
      '<div class="dropdown"><button type="button" class="btn btn-sm btn-outline-secondary list-tool" ' +
          'id="btnFilter" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
          '<i class="fa-solid fa-filter mr-1"></i>Filter<span id="filterCount"></span> ' +
          '<i class="fa-solid fa-chevron-down ml-1 list-tool-caret"></i></button>' +
        '<div class="dropdown-menu dropdown-menu-right list-menu list-menu-wide" id="filterMenu" ' +
          'aria-labelledby="btnFilter"></div></div>' +
      '<button type="button" class="btn btn-sm btn-light list-tool" id="btnClear">Clear</button>' +
    '</div>' +
    '<div class="list-chips" id="activeChips"></div>';
  }

  function compareValues(a, b) {
    if (typeof a === 'string') { a = a.toLowerCase(); }
    if (typeof b === 'string') { b = b.toLowerCase(); }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /* cfg: {
       state,                         holds search, sort, dir, group, page and each filter key
       sorts:   [{ key, label }],
       groups:  [{ key, label, of(row) -> group name, rank(row) -> optional order }],
       filters: [{ key, label, all, options: [{ value, label }] or a function returning them,
                   resets: [keys cleared when this filter changes] }],
       range:   { from, to, label }   optional date range, kept inside the Filter menu
       onChange
     } */
  function toolbar(cfg) {
    var esc = SASO.model.escapeHtml;
    var state = cfg.state;
    var groups = cfg.groups || [];
    var filters = cfg.filters || [];
    var range = cfg.range || null;
    var search = document.getElementById('fSearch');
    var sortMenu = document.getElementById('sortMenu');
    var filterMenu = document.getElementById('filterMenu');

    function item(attrs, label, selected) {
      return '<a href="#" class="dropdown-item' + (selected ? ' is-selected' : '') + '" ' + attrs + '>' +
        label + '</a>';
    }

    function optionsOf(f) { return typeof f.options === 'function' ? f.options() : f.options; }

    function optionLabel(f, value) {
      var match = optionsOf(f).filter(function (o) { return String(o.value) === String(value); })[0];
      return match ? match.label : value;
    }

    /* The date inputs are built once, so typing a date is not interrupted
       when the list re-renders; clicks inside inputs keep the menu open. */
    filterMenu.innerHTML = '<div class="list-menu-grid" style="--cols:' + filters.length + '"></div>' +
      (range
        ? '<div class="list-menu-range"><h6 class="dropdown-header">' + esc(range.label) + '</h6>' +
            '<div class="list-range-fields">' +
              '<label>From<input type="date" class="form-control form-control-sm" data-range="' +
                range.from + '"></label>' +
              '<label>To<input type="date" class="form-control form-control-sm" data-range="' +
                range.to + '"></label>' +
            '</div></div>'
        : '');
    var cols = filterMenu.querySelector('.list-menu-grid');

    function currentGroup() {
      return groups.filter(function (g) { return g.key && g.key === state.group; })[0] || null;
    }

    function activeFilters() {
      var chips = [];
      filters.forEach(function (f) {
        if (state[f.key]) {
          chips.push({ key: f.key, label: f.label + ': ' + esc(optionLabel(f, state[f.key])) });
        }
      });
      if (range && state[range.from]) {
        chips.push({ key: range.from, label: 'From: ' + SASO.model.formatDate(state[range.from]) });
      }
      if (range && state[range.to]) {
        chips.push({ key: range.to, label: 'To: ' + SASO.model.formatDate(state[range.to]) });
      }
      return chips;
    }

    function refresh() {
      sortMenu.innerHTML =
        '<h6 class="dropdown-header">Sort by</h6>' +
        cfg.sorts.map(function (o) {
          return item('data-sort="' + o.key + '"', o.label, state.sort === o.key);
        }).join('') +
        '<div class="dropdown-divider"></div>' +
        item('data-dir="asc"', 'Ascending', state.dir === 'asc') +
        item('data-dir="desc"', 'Descending', state.dir === 'desc') +
        (groups.length
          ? '<div class="dropdown-divider"></div>' +
            '<h6 class="dropdown-header">Group by</h6>' +
            groups.map(function (o) {
              return item('data-group="' + o.key + '"', o.label, (state.group || '') === o.key);
            }).join('')
          : '');

      cols.innerHTML = filters.map(function (f) {
        return '<div><h6 class="dropdown-header">' + f.label + '</h6>' +
          item('data-filter="' + f.key + '" data-value=""', f.all, !state[f.key]) +
          optionsOf(f).map(function (o) {
            return item('data-filter="' + f.key + '" data-value="' + esc(o.value) + '"',
              esc(o.label), String(state[f.key]) === String(o.value));
          }).join('') + '</div>';
      }).join('');

      if (range) {
        filterMenu.querySelectorAll('[data-range]').forEach(function (input) {
          if (document.activeElement !== input) { input.value = state[input.getAttribute('data-range')] || ''; }
        });
      }
      if (document.activeElement !== search) { search.value = state.search || ''; }

      var chips = activeFilters();
      document.getElementById('filterCount').innerHTML = chips.length
        ? ' <span class="badge badge-primary ml-1">' + chips.length + '</span>' : '';
      document.getElementById('btnFilter').classList.toggle('is-active', !!chips.length);
      document.getElementById('activeChips').innerHTML = chips.map(function (c) {
        return '<span class="list-chip">' + c.label +
          '<button type="button" data-unfilter="' + c.key + '" aria-label="Remove filter">' +
          '<i class="fa-solid fa-xmark"></i></button></span>';
      }).join('');
    }

    function setFilter(key, value) {
      state[key] = value;
      filters.forEach(function (f) {
        if (f.key === key) { (f.resets || []).forEach(function (k) { state[k] = ''; }); }
      });
      state.page = 1;
    }

    function onMenuClick(e) {
      var el = e.target.closest('[data-sort],[data-dir],[data-group],[data-filter]');
      if (!el) { return; }
      e.preventDefault();
      if (el.hasAttribute('data-sort')) { state.sort = el.getAttribute('data-sort'); }
      if (el.hasAttribute('data-dir')) { state.dir = el.getAttribute('data-dir'); }
      if (el.hasAttribute('data-group')) { state.group = el.getAttribute('data-group'); }
      if (el.hasAttribute('data-filter')) { setFilter(el.getAttribute('data-filter'), el.getAttribute('data-value')); }
      cfg.onChange();
    }

    function clear() {
      state.search = '';
      filters.forEach(function (f) { state[f.key] = ''; });
      if (range) { state[range.from] = ''; state[range.to] = ''; }
      state.page = 1;
      search.value = '';
      cfg.onChange();
    }

    sortMenu.addEventListener('click', onMenuClick);
    filterMenu.addEventListener('click', onMenuClick);
    filterMenu.addEventListener('change', function (e) {
      var key = e.target.getAttribute('data-range');
      if (!key) { return; }
      state[key] = e.target.value; state.page = 1;
      cfg.onChange();
    });
    document.getElementById('activeChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-unfilter]');
      if (!b) { return; }
      setFilter(b.getAttribute('data-unfilter'), '');
      cfg.onChange();
    });
    search.addEventListener('input', function () {
      state.search = this.value; state.page = 1; cfg.onChange();
    });
    document.getElementById('btnClear').addEventListener('click', clear);

    /* Rows sort inside their group first, then by the chosen key. */
    function order(rows, sortValue) {
      var g = currentGroup();
      return rows.slice().sort(function (x, y) {
        var d = g ? compareValues(g.rank ? g.rank(x) : g.of(x), g.rank ? g.rank(y) : g.of(y)) : 0;
        if (d) { return d; }
        var c = compareValues(sortValue(x, state.sort), sortValue(y, state.sort));
        return state.dir === 'asc' ? c : -c;
      });
    }

    /* A heading row whenever the group changes; the count covers every page. */
    function groupRow(slice, i, all, colspan) {
      var g = currentGroup();
      if (!g) { return ''; }
      var name = g.of(slice[i]);
      if (i > 0 && g.of(slice[i - 1]) === name) { return ''; }
      var count = all.filter(function (r) { return g.of(r) === name; }).length;
      return '<tr class="group-row"><td colspan="' + colspan + '">' + esc(name) +
        '<span class="group-count">' + count + '</span></td></tr>';
    }

    return {
      refresh: refresh,
      clear: clear,
      order: order,
      groupRow: groupRow,
      filtering: function () { return !!(state.search || activeFilters().length); }
    };
  }

  return {
    toolbarHtml: toolbarHtml,
    toolbar: toolbar,
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
