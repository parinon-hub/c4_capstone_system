/* =========================================================================
   layout.js  —  Shared chrome for every signed-in page.

   Pages declare window.SASO_BASE (path back to the project root) and call
   SASO.layout.init({ role, page, title, breadcrumb }). Everything else —
   navbar, notification bell, sidebar, badge counts, logout, toasts — is
   rendered from here so no page reimplements navigation.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.layout = (function () {
  'use strict';

  var C = SASO.config;
  var base = window.SASO_BASE || './';
  var session = null;

  /* ---- menu definitions -------------------------------------------------- */

  var MENUS = {
    SASO: [
      { key: 'dashboard',    label: 'Dashboard',          icon: 'fa-gauge-high',        href: 'pages/saso/dashboard.html' },
      { key: 'organizations',label: 'Organizations',      icon: 'fa-people-group',      href: 'pages/saso/organizations.html' },
      { key: 'proposals',    label: 'Activity Proposals', icon: 'fa-file-circle-plus',  href: 'pages/saso/proposals.html',  badge: 'proposals' },
      { key: 'activities',   label: 'Activities',         icon: 'fa-calendar-check',    href: 'pages/saso/activities.html' },
      { key: 'requirements', label: 'Requirements',       icon: 'fa-list-check',        href: 'pages/saso/requirements.html', badge: 'requirements' },
      { key: 'terminal',     label: 'Terminal Reports',   icon: 'fa-file-circle-check', href: 'pages/saso/terminal-reports.html', badge: 'terminal' },
      { key: 'reports',      label: 'Reports',            icon: 'fa-chart-column',      href: 'pages/saso/reports.html' },
      { key: 'notifications',label: 'Notifications',      icon: 'fa-bell',              href: 'pages/saso/notifications.html', badge: 'notifications' },
      { key: 'settings',     label: 'Settings',           icon: 'fa-gear',              href: 'pages/saso/settings.html' }
    ],
    ORG: [
      { key: 'dashboard',    label: 'Dashboard',        icon: 'fa-gauge-high',        href: 'pages/org/dashboard.html' },
      { key: 'activities',   label: 'My Activities',    icon: 'fa-calendar-check',    href: 'pages/org/activities.html' },
      { key: 'submit',       label: 'Submit Activity',  icon: 'fa-circle-plus',       href: 'pages/org/submit-activity.html' },
      { key: 'requirements', label: 'Requirements',     icon: 'fa-list-check',        href: 'pages/org/requirements.html', badge: 'requirements' },
      { key: 'terminal',     label: 'Terminal Reports', icon: 'fa-file-circle-check', href: 'pages/org/terminal-reports.html', badge: 'terminal' },
      { key: 'notifications',label: 'Notifications',    icon: 'fa-bell',              href: 'pages/org/notifications.html', badge: 'notifications' },
      { key: 'profile',      label: 'Profile',          icon: 'fa-id-badge',          href: 'pages/org/profile.html' }
    ]
  };

  /* ---- link resolver -------------------------------------------------------
     Pages that exist resolve normally. Anything scheduled for a later phase
     resolves to the placeholder, so no link in the prototype 404s mid-demo.
     Add each page to BUILT as its phase lands.
     --------------------------------------------------------------------------- */

  /* One map, one truth: 0 means the page exists, any other number is the
     phase it is scheduled for. Sidebar rendering and link resolution both
     read from here, so they can never drift apart. Set a page to 0 as its
     phase lands. */
  var PAGES = {
    'index.html': 0,
    'pages/saso/dashboard.html': 0,
    'pages/org/dashboard.html': 0,

    'pages/org/submit-activity.html': 3,
    'pages/org/activities.html': 3,
    'pages/org/activity-details.html': 4,
    'pages/saso/activity-details.html': 4,
    'pages/org/requirements.html': 5,
    'pages/saso/requirements.html': 5,
    'pages/saso/proposals.html': 6,
    'pages/saso/activities.html': 6,
    'pages/saso/organizations.html': 6,
    'pages/saso/notifications.html': 7,
    'pages/org/notifications.html': 7,
    'pages/saso/terminal-reports.html': 9,
    'pages/org/terminal-reports.html': 9,
    'pages/saso/reports.html': 10,
    'pages/saso/settings.html': 13,
    'pages/org/profile.html': 13
  };

  function phaseOf(path) {
    var clean = path.split('?')[0];
    return PAGES[clean] === undefined ? 3 : PAGES[clean];
  }

  function isBuilt(path) { return phaseOf(path) === 0; }

  /* path is always project-root relative, e.g. 'pages/saso/proposals.html' */
  function href(path, moduleLabel) {
    if (isBuilt(path)) { return base + path; }
    return base + 'pages/coming-soon.html?m=' +
      encodeURIComponent(moduleLabel || path.split('?')[0]) + '&p=' + phaseOf(path);
  }

  /* ---- badge counts ------------------------------------------------------- */

  function badgeCounts() {
    var M = SASO.model;
    var counts = { proposals: 0, requirements: 0, terminal: 0, notifications: 0 };
    counts.notifications = M.unreadCount(session);

    if (session.role === C.ROLE.SASO) {
      counts.proposals = M.allActivities().filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.SUBMITTED ||
               a.proposalStatus === C.PROPOSAL.FOR_REVIEW;
      }).length;
      counts.requirements = M.db().requirements.filter(function (r) {
        return r.status === C.REQUIREMENT.UNDER_REVIEW;
      }).length;
      counts.terminal = M.allActivities().filter(function (a) {
        return M.stageOf(a) === C.STAGE.AWAITING_TERMINAL_REPORT;
      }).length;
    } else {
      var mine = M.activitiesFor(session.organizationId);
      counts.requirements = mine.filter(function (a) {
        return a.proposalStatus === C.PROPOSAL.REQUIREMENTS_NEEDED ||
               a.proposalStatus === C.PROPOSAL.REVISION_REQUIRED;
      }).length;
      counts.terminal = mine.filter(function (a) {
        return M.stageOf(a) === C.STAGE.AWAITING_TERMINAL_REPORT;
      }).length;
    }
    return counts;
  }

  /* ---- rendering ---------------------------------------------------------- */

  function renderSidebar(activeKey) {
    var counts = badgeCounts();
    var org = SASO.auth.organization();
    var items = MENUS[session.role].map(function (m) {
      var count = m.badge ? counts[m.badge] : 0;
      var badgeHtml = count > 0
        ? ' <span class="badge badge-' + (m.badge === 'terminal' ? 'warning' : 'info') +
          ' right">' + count + '</span>'
        : '';

      if (!isBuilt(m.href)) {
        var phase = phaseOf(m.href);
        return '' +
          '<li class="nav-item">' +
            '<span class="nav-link nav-link-pending" title="Scheduled for phase ' + phase + '">' +
              '<i class="nav-icon fa-solid ' + m.icon + '"></i>' +
              '<p>' + m.label + badgeHtml +
                '<span class="phase-tag">Phase ' + phase + '</span></p>' +
            '</span>' +
          '</li>';
      }

      return '' +
        '<li class="nav-item">' +
          '<a href="' + base + m.href + '" class="nav-link' + (m.key === activeKey ? ' active' : '') + '">' +
            '<i class="nav-icon fa-solid ' + m.icon + '"></i>' +
            '<p>' + m.label + badgeHtml + '</p>' +
          '</a>' +
        '</li>';
    }).join('');

    return '' +
      '<aside class="main-sidebar sidebar-dark-primary elevation-2">' +
        '<a href="' + SASO.auth.homeFor(session, base) + '" class="brand-link">' +
          '<span class="brand-mark">CSPC</span>' +
          '<span class="brand-text">SASO<small>Activity Monitoring</small></span>' +
        '</a>' +
        '<div class="sidebar">' +
          '<div class="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">' +
            '<div class="user-avatar">' + initials(session.name) + '</div>' +
            '<div class="info">' +
              '<a href="#" class="d-block">' + SASO.model.escapeHtml(session.name) + '</a>' +
              '<small>' + SASO.model.escapeHtml(org ? org.acronym : 'SASO') + '</small>' +
            '</div>' +
          '</div>' +
          '<nav class="mt-2">' +
            '<ul class="nav nav-pills nav-sidebar flex-column" role="menu">' + items + '</ul>' +
          '</nav>' +
        '</div>' +
      '</aside>';
  }

  function renderNavbar() {
    var notes = SASO.model.notificationsFor(session).slice(0, 5);
    var unread = SASO.model.unreadCount(session);
    var notifPage = session.role === C.ROLE.SASO
      ? 'pages/saso/notifications.html' : 'pages/org/notifications.html';

    var items = notes.length
      ? notes.map(function (n) {
          var icon = C.NOTIF_ICON[n.type] || 'fa-circle-info';
          return '' +
            '<a href="' + base + notifPage + '" class="dropdown-item notif-item' +
              (n.read ? '' : ' notif-unread') + '">' +
              '<i class="fa-solid ' + icon + ' mr-2"></i>' +
              '<span class="notif-text">' + SASO.model.escapeHtml(n.message) + '</span>' +
              '<span class="float-right text-muted text-sm">' + SASO.model.relativeTime(n.timestamp) + '</span>' +
            '</a><div class="dropdown-divider"></div>';
        }).join('')
      : '<span class="dropdown-item text-muted">Nothing new right now.</span><div class="dropdown-divider"></div>';

    return '' +
      '<nav class="main-header navbar navbar-expand navbar-white navbar-light">' +
        '<ul class="navbar-nav">' +
          '<li class="nav-item"><a class="nav-link" data-widget="pushmenu" href="#" role="button">' +
            '<i class="fa-solid fa-bars"></i></a></li>' +
          '<li class="nav-item d-none d-sm-inline-block navbar-context">' +
            'Camarines Sur Polytechnic Colleges — Student Affairs and Services Office' +
          '</li>' +
        '</ul>' +
        '<ul class="navbar-nav ml-auto">' +
          '<li class="nav-item"><span class="prototype-flag">Prototype</span></li>' +
          '<li class="nav-item dropdown">' +
            '<a class="nav-link" data-toggle="dropdown" href="#" aria-label="Notifications">' +
              '<i class="fa-regular fa-bell"></i>' +
              (unread ? '<span class="badge badge-warning navbar-badge">' + unread + '</span>' : '') +
            '</a>' +
            '<div class="dropdown-menu dropdown-menu-lg dropdown-menu-right">' +
              '<span class="dropdown-header">' + unread + ' unread</span>' +
              '<div class="dropdown-divider"></div>' +
              items +
              '<a href="' + base + notifPage + '" class="dropdown-item dropdown-footer">See all notifications</a>' +
            '</div>' +
          '</li>' +
          '<li class="nav-item dropdown">' +
            '<a class="nav-link" data-toggle="dropdown" href="#">' +
              '<i class="fa-regular fa-user"></i> <span class="d-none d-md-inline">' +
              SASO.model.escapeHtml(session.name.split(' ')[0]) + '</span>' +
            '</a>' +
            '<div class="dropdown-menu dropdown-menu-right">' +
              '<span class="dropdown-header">' + SASO.model.escapeHtml(session.position) + '</span>' +
              '<div class="dropdown-divider"></div>' +
              '<a href="#" class="dropdown-item" id="btnResetDemo">' +
                '<i class="fa-solid fa-rotate mr-2"></i>Reset demo data</a>' +
              '<div class="dropdown-divider"></div>' +
              '<a href="#" class="dropdown-item text-danger" id="btnLogout">' +
                '<i class="fa-solid fa-right-from-bracket mr-2"></i>Sign out</a>' +
            '</div>' +
          '</li>' +
        '</ul>' +
      '</nav>';
  }

  function renderHeader(title, breadcrumb) {
    var crumbs = (breadcrumb || []).map(function (b, i, arr) {
      return i === arr.length - 1
        ? '<li class="breadcrumb-item active">' + b.label + '</li>'
        : '<li class="breadcrumb-item"><a href="' + base + b.href + '">' + b.label + '</a></li>';
    }).join('');

    return '' +
      '<div class="content-header">' +
        '<div class="container-fluid">' +
          '<div class="row mb-2 align-items-center">' +
            '<div class="col-sm-6"><h1 class="page-title">' + title + '</h1></div>' +
            '<div class="col-sm-6">' +
              '<ol class="breadcrumb float-sm-right">' + crumbs + '</ol>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function initials(name) {
    return String(name || '?').split(' ')
      .filter(function (p) { return p.length; })
      .slice(0, 2)
      .map(function (p) { return p[0].toUpperCase(); })
      .join('');
  }

  /* ---- feedback helpers ---------------------------------------------------- */

  function toast(message, variant) {
    var id = 'toast-' + Date.now();
    var host = document.getElementById('sasoToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sasoToastHost';
      host.className = 'saso-toast-host';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'saso-toast saso-toast-' + (variant || 'success');
    el.id = id;
    el.innerHTML = '<i class="fa-solid ' +
      (variant === 'danger' ? 'fa-circle-exclamation'
        : variant === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check') +
      ' mr-2"></i>' + SASO.model.escapeHtml(message);
    host.appendChild(el);
    window.setTimeout(function () { el.classList.add('is-leaving'); }, 3200);
    window.setTimeout(function () { el.remove(); }, 3600);
  }

  function confirmDialog(opts, onConfirm) {
    var id = 'sasoConfirm';
    var existing = document.getElementById(id);
    if (existing) { existing.remove(); }

    var needsRemarks = !!opts.remarksRequired;
    var html = '' +
      '<div class="modal fade" id="' + id + '" tabindex="-1">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">' + SASO.model.escapeHtml(opts.title) + '</h5>' +
              '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<p>' + SASO.model.escapeHtml(opts.body) + '</p>' +
              (opts.remarks || needsRemarks
                ? '<div class="form-group mb-0">' +
                    '<label for="confirmRemarks">Remarks' + (needsRemarks ? ' <span class="text-danger">*</span>' : ' (optional)') + '</label>' +
                    '<textarea class="form-control" id="confirmRemarks" rows="3" placeholder="' +
                      SASO.model.escapeHtml(opts.remarksPlaceholder || 'Tell the organization what to do next') + '"></textarea>' +
                    '<div class="invalid-feedback" id="confirmRemarksError">Remarks are required so the organization knows what to fix.</div>' +
                  '</div>'
                : '') +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-light" data-dismiss="modal">Cancel</button>' +
              '<button type="button" class="btn btn-' + (opts.variant || 'primary') + '" id="confirmAction">' +
                SASO.model.escapeHtml(opts.confirmLabel || 'Confirm') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var $modal = window.jQuery('#' + id);
    $modal.modal('show');

    document.getElementById('confirmAction').addEventListener('click', function () {
      var remarksEl = document.getElementById('confirmRemarks');
      var remarks = remarksEl ? remarksEl.value.trim() : '';
      if (needsRemarks && !remarks) {
        remarksEl.classList.add('is-invalid');
        return;
      }
      $modal.modal('hide');
      onConfirm(remarks);
    });

    $modal.on('hidden.bs.modal', function () { $modal.remove(); });
  }

  /* ---- init ---------------------------------------------------------------- */

  function init(opts) {
    opts = opts || {};
    session = SASO.auth.guard(opts.role, base);
    if (!session) { return null; }

    SASO.model.refreshOverdue();

    var wrapper = document.getElementById('appWrapper') || document.body;
    wrapper.insertAdjacentHTML('afterbegin', renderNavbar() + renderSidebar(opts.page));

    var header = document.getElementById('pageHeader');
    if (header) {
      header.innerHTML = renderHeader(opts.title || '', opts.breadcrumb || []);
    }

    var logout = document.getElementById('btnLogout');
    if (logout) {
      logout.addEventListener('click', function (e) {
        e.preventDefault();
        SASO.auth.logout(base);
      });
    }

    var reset = document.getElementById('btnResetDemo');
    if (reset) {
      reset.addEventListener('click', function (e) {
        e.preventDefault();
        confirmDialog({
          title: 'Reset demo data',
          body: 'This clears everything done in this session and restores the original sample data. Use it before a fresh walkthrough.',
          confirmLabel: 'Reset data',
          variant: 'warning'
        }, function () {
          SASO.storage.reset();
          window.location.reload();
        });
      });
    }

    return session;
  }

  return {
    init: init,
    href: href,
    toast: toast,
    confirmDialog: confirmDialog,
    initials: initials,
    base: function () { return base; }
  };
})();
