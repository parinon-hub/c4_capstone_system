/* =========================================================================
   notifications.js  —  The notification centre.

   One controller, both roles. The bell in the navbar shows the five most
   recent; this is the full record, grouped by recency so the day's work sits
   at the top rather than being buried in a flat list.

   Pages set window.SASO_ROLE before loading this file.
   ========================================================================= */

(function () {
  'use strict';

  var C = SASO.config;
  var M = SASO.model;
  var role = window.SASO_ROLE;
  var isSaso = role === C.ROLE.SASO;

  var session = SASO.layout.init({
    role: role,
    page: 'notifications',
    title: 'Notifications',
    breadcrumb: [
      { label: 'Dashboard', href: isSaso ? 'pages/saso/dashboard.html' : 'pages/org/dashboard.html' },
      { label: 'Notifications' }
    ]
  });
  if (!session) { return; }

  var state = { group: '', unreadOnly: false };

  /* ---- shell ------------------------------------------------------------------ */

  document.getElementById('pageRoot').innerHTML =
    '<div class="row" id="tiles"></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3 class="card-title">All notifications</h3>' +
        '<div class="card-tools">' +
          '<div class="custom-control custom-checkbox d-inline-block mr-3">' +
            '<input type="checkbox" class="custom-control-input" id="fUnread">' +
            '<label class="custom-control-label text-sm" for="fUnread">Unread only</label>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-outline-primary" id="btnMarkAll">' +
            '<i class="fa-solid fa-check-double mr-1"></i>Mark all as read</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-body border-bottom py-2">' +
        '<div class="btn-group btn-group-sm flex-wrap" id="groupTabs"></div>' +
      '</div>' +
      '<div class="card-body p-0" id="listHost"></div>' +
    '</div>';

  /* ---- recency buckets ---------------------------------------------------------- */

  function bucketOf(timestamp) {
    var now = new Date();
    var then = new Date(timestamp);
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    var weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (then >= startOfToday) { return 'Today'; }
    if (then >= startOfYesterday) { return 'Yesterday'; }
    if (then >= weekAgo) { return 'Earlier this week'; }
    return 'Older';
  }

  /* ---- data ---------------------------------------------------------------------- */

  function all() {
    return M.notificationsFor(session);
  }

  function filtered() {
    return all().filter(function (n) {
      if (state.unreadOnly && n.read) { return false; }
      if (state.group && C.NOTIF_GROUP[n.type] !== state.group) { return false; }
      return true;
    });
  }

  /* ---- tiles ----------------------------------------------------------------------- */

  function renderTiles() {
    var list = all();
    var unread = list.filter(function (n) { return !n.read; });
    var urgent = unread.filter(function (n) {
      return C.NOTIF_URGENT.indexOf(n.type) !== -1;
    });
    var today = list.filter(function (n) { return bucketOf(n.timestamp) === 'Today'; });

    var tiles = [
      { value: unread.length, label: 'Unread', icon: 'fa-envelope',
        mod: unread.length ? 'is-attention' : '' },
      { value: urgent.length, label: 'Needing action', icon: 'fa-triangle-exclamation',
        mod: urgent.length ? 'is-overdue' : '' },
      { value: today.length, label: 'Today', icon: 'fa-calendar-day' },
      { value: list.length, label: 'Total', icon: 'fa-bell' }
    ];

    document.getElementById('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="col-6 col-md-3"><div class="stat-tile ' + (t.mod || '') + '">' +
        '<i class="fa-solid ' + t.icon + ' stat-icon"></i>' +
        '<span class="stat-value">' + t.value + '</span>' +
        '<span class="stat-label">' + t.label + '</span>' +
      '</div></div>';
    }).join('');
  }

  /* ---- group tabs ------------------------------------------------------------------- */

  function renderTabs() {
    var list = all();
    function count(g) {
      return list.filter(function (n) {
        return (!g || C.NOTIF_GROUP[n.type] === g) && (!state.unreadOnly || !n.read);
      }).length;
    }

    /* "Organization accounts" is a SASO concern (requests, approvals,
       declines). Organizations do not get the tab; a new organization's
       welcome message still appears under All. */
    var groups = [{ key: '', label: 'All' }].concat(
      Object.keys(C.NOTIF_GROUP_LABEL)
        .filter(function (k) { return isSaso || k !== 'ACCOUNTS'; })
        .map(function (k) {
          return { key: k, label: C.NOTIF_GROUP_LABEL[k] };
        }));

    document.getElementById('groupTabs').innerHTML = groups.map(function (g) {
      var n = count(g.key);
      return '<button type="button" class="btn btn-outline-primary' +
        (state.group === g.key ? ' active' : '') + '" data-group="' + g.key + '">' +
        g.label + (n ? ' <span class="badge badge-light ml-1">' + n + '</span>' : '') +
      '</button>';
    }).join('');

    document.querySelectorAll('#groupTabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.group = this.getAttribute('data-group');
        render();
      });
    });
  }

  /* ---- list -------------------------------------------------------------------------- */

  function targetFor(n) {
    /* Organization-account notifications open the request, or the new
       organization's profile. */
    if (C.NOTIF_GROUP[n.type] === 'ACCOUNTS') {
      if (!isSaso) { return '../org/profile.html'; }
      return '../saso/account-requests.html' + (n.requestId ? '?review=' + n.requestId : '');
    }
    if (!n.activityId) { return null; }
    if (M.activityById(n.activityId)) {
      return (isSaso ? '../saso/' : '../org/') + 'activity-details.html?id=' + n.activityId;
    }
    /* A deleted proposal still waiting in the trash bin links there. */
    if (M.trashByActivityId(n.activityId) && M.canManageProposals(session)) {
      return (isSaso ? '../saso/' : '../org/') + 'trash.html';
    }
    return null;
  }

  function render() {
    renderTiles();
    renderTabs();

    var list = filtered();
    var host = document.getElementById('listHost');

    document.getElementById('btnMarkAll').disabled =
      !all().some(function (n) { return !n.read; });

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<i class="fa-regular fa-bell"></i>' +
        '<h6>' + (state.unreadOnly ? 'Nothing unread' : 'No notifications here') + '</h6>' +
        '<p>' + (state.unreadOnly
          ? 'Everything has been read.'
          : 'Notifications appear as activities move through the workflow.') + '</p>' +
      '</div>';
      return;
    }

    /* Group by recency, preserving the newest-first order inside each bucket. */
    var buckets = [];
    list.forEach(function (n) {
      var key = bucketOf(n.timestamp);
      var b = buckets.filter(function (x) { return x.key === key; })[0];
      if (!b) { b = { key: key, items: [] }; buckets.push(b); }
      b.items.push(n);
    });

    host.innerHTML = buckets.map(function (b) {
      return '<div class="notif-bucket">' +
        '<div class="notif-bucket-head">' + b.key +
          '<span class="cell-sub">' + b.items.length + '</span></div>' +
        b.items.map(function (n) {
          var urgent = C.NOTIF_URGENT.indexOf(n.type) !== -1;
          var icon = C.NOTIF_ICON[n.type] || 'fa-circle-info';
          var activity = n.activityId ? M.activityById(n.activityId) : null;
          if (!activity && n.activityId) {
            var inTrash = M.trashByActivityId(n.activityId);
            activity = inTrash ? { title: inTrash.activity.title + ' (in trash bin)' } : null;
          }
          var href = targetFor(n);

          return '<div class="notif-row' + (n.read ? '' : ' is-unread') +
              (urgent ? ' is-urgent' : '') + '" data-id="' + n.id + '">' +
            '<span class="notif-icon"><i class="fa-solid ' + icon + '"></i></span>' +
            '<div class="notif-main">' +
              (href
                ? '<a class="notif-message" href="' + href + '" data-open="' + n.id + '">' +
                  M.escapeHtml(n.message) + '</a>'
                : '<span class="notif-message">' + M.escapeHtml(n.message) + '</span>') +
              '<span class="cell-sub">' +
                (activity ? M.escapeHtml(activity.title) + ' · ' : '') +
                (C.NOTIF_GROUP_LABEL[C.NOTIF_GROUP[n.type]] || '') + '</span>' +
            '</div>' +
            '<span class="notif-time">' + M.relativeTime(n.timestamp) + '</span>' +
            '<span class="notif-actions">' +
              (n.read ? '' :
                '<button type="button" class="btn btn-sm btn-link" data-read="' + n.id +
                  '" title="Mark as read"><i class="fa-regular fa-circle-check"></i></button>') +
              '<button type="button" class="btn btn-sm btn-link text-muted" data-dismiss-notif="' +
                n.id + '" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>' +
            '</span>' +
          '</div>';
        }).join('') +
      '</div>';
    }).join('');

    bind();
  }

  function bind() {
    /* Opening the linked activity marks the notification read on the way out. */
    document.querySelectorAll('[data-open]').forEach(function (a) {
      a.addEventListener('click', function () {
        M.markNotificationRead(this.getAttribute('data-open'));
      });
    });

    document.querySelectorAll('[data-read]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.markNotificationRead(this.getAttribute('data-read'));
        render();
      });
    });

    document.querySelectorAll('[data-dismiss-notif]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.dismissNotification(this.getAttribute('data-dismiss-notif'));
        render();
      });
    });
  }

  /* ---- controls --------------------------------------------------------------------- */

  document.getElementById('fUnread').addEventListener('change', function () {
    state.unreadOnly = this.checked;
    render();
  });

  document.getElementById('btnMarkAll').addEventListener('click', function () {
    M.markAllRead(session);
    SASO.layout.toast('All notifications marked as read.');
    render();
  });

  render();
})();
