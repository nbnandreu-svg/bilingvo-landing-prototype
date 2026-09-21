/* Defense in depth only: the host must also send frame-ancestors / X-Frame-Options.
 * Markup stays hidden if this script is blocked, unavailable or runs in a frame.
 * No parent-origin/referrer allowlist and no attempt to navigate the parent.
 * ES5 syntax deliberately supports browsers older than the main application.
 */
(function () {
  'use strict';
  var site = document.getElementById('bilingvo-site');
  if (!site) return;
  try {
    if (window.self !== window.top) return;
    site.style.removeProperty('display');
  } catch (error) {
    // Leave the initial display:none!important intact on any failure.
  }
}());
