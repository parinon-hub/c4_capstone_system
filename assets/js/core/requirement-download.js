/* =========================================================================
   requirement-download.js  —  Download a blank form for a requirement.

   Each requirement row offers a Download button beside Attach, so the
   organization can get the form, fill it in and attach it back. The
   prototype has no real SASO forms, so the download is a Word-compatible
   template carrying the requirement's name, the organization and the
   activity, with blank fields to complete.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.requirementDownload = (function () {
  'use strict';

  var M = SASO.model;

  function button(requirementName) {
    return '<button type="button" class="btn btn-sm btn-outline-secondary mr-1 mb-0" ' +
      'data-download="' + M.escapeHtml(requirementName) + '" ' +
      'title="Download a blank ' + M.escapeHtml(requirementName) + ' form">' +
      '<i class="fa-solid fa-download mr-1"></i>Download</button>';
  }

  function fileName(requirementName) {
    return requirementName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_template.doc';
  }

  function templateHtml(requirementName, org, activity) {
    var esc = M.escapeHtml;
    function line(label, value) {
      return '<tr><td style="width:32%;padding:6px 8px;border:1px solid #999;font-weight:bold">' +
        label + '</td><td style="padding:6px 8px;border:1px solid #999">' + (value ? esc(value) : '&nbsp;') +
        '</td></tr>';
    }
    return '<html><head><meta charset="utf-8"><title>' + esc(requirementName) + '</title></head>' +
      '<body style="font-family:Arial,sans-serif;font-size:11pt">' +
        '<p style="text-align:center;margin:0">Camarines Sur Polytechnic Colleges</p>' +
        '<p style="text-align:center;margin:0 0 12pt">Student Affairs and Services Office</p>' +
        '<h2 style="text-align:center">' + esc(requirementName) + '</h2>' +
        '<table style="width:100%;border-collapse:collapse">' +
          line('Organization', org ? org.name : '') +
          line('Activity', activity && activity.title) +
          line('Date of activity', activity && activity.dateStart
            ? M.formatDateRange(activity.dateStart, activity.dateEnd) : '') +
          line('Venue', activity && activity.venue) +
          line('Prepared by', '') +
          line('Date prepared', '') +
        '</table>' +
        '<p style="margin-top:18pt"><b>Details</b></p>' +
        '<p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>' +
        '<p style="margin-top:36pt">______________________________<br>Signature over printed name</p>' +
        '<p style="margin-top:18pt">______________________________<br>Adviser</p>' +
      '</body></html>';
  }

  function download(requirementName, org, activity) {
    var blob = new Blob(['﻿', templateHtml(requirementName, org, activity)],
      { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName(requirementName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* `context()` returns { org, activity } at click time, so a draft's
     latest title is used. */
  function bind(root, context) {
    root.querySelectorAll('[data-download]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ctx = context() || {};
        download(this.getAttribute('data-download'), ctx.org, ctx.activity);
      });
    });
  }

  return { button: button, bind: bind, fileName: fileName };
})();
