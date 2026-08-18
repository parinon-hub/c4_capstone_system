/* =========================================================================
   storage.js  —  Client-side persistence.

   The prototype has no backend. The entire simulated database lives in one
   localStorage key and is read into memory on page load. This is the only
   file that touches localStorage directly.
   ========================================================================= */

window.SASO = window.SASO || {};

SASO.storage = (function () {
  'use strict';

  var KEY = SASO.config.STORAGE_KEY;
  var cache = null;

  function available() {
    try {
      window.localStorage.setItem('__saso_test__', '1');
      window.localStorage.removeItem('__saso_test__');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Loads the database, seeding it on first run. */
  function load() {
    if (cache) { return cache; }

    if (!available()) {
      console.warn('[SASO] localStorage unavailable — running in memory only.');
      cache = SASO.buildSeed();
      return cache;
    }

    var raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = SASO.buildSeed();
      save();
      return cache;
    }

    try {
      cache = JSON.parse(raw);
    } catch (e) {
      console.warn('[SASO] Stored data was unreadable — reseeding.');
      cache = SASO.buildSeed();
      save();
    }
    return cache;
  }

  function save() {
    if (!cache || !available()) { return; }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('[SASO] Could not save — storage may be full.', e);
    }
  }

  /* Discards all demonstration progress and restores the original sample
     data. Used by the "Reset demo data" control so the prototype can be
     re-demonstrated cleanly between panel members. */
  function reset() {
    cache = SASO.buildSeed();
    save();
    return cache;
  }

  function nextId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' +
      Math.floor(Math.random() * 1000).toString(36);
  }

  return {
    load: load,
    save: save,
    reset: reset,
    nextId: nextId
  };
})();
