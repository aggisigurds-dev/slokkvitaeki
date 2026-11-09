/* Brunahólf login mockup details. Keeps server-side authentication unchanged.
   Only remembers an email address when the visitor explicitly opts in. */
(function () {
  'use strict';
  function init() {
    var login = document.getElementById('login');
    if (!login) return;
    var register = document.getElementById('lp-register-switch');
    var registerTab = document.getElementById('lg-t-reg');
    if (register && registerTab) {
      register.addEventListener('click', function () { registerTab.click(); });
    }
    var eye = document.getElementById('lp-eye');
    var password = document.getElementById('password');
    if (eye && password) {
      eye.addEventListener('click', function () {
        var showing = password.type === 'password';
        password.type = showing ? 'text' : 'password';
        eye.setAttribute('aria-pressed', String(showing));
        eye.setAttribute('aria-label', showing ? 'Fela lykilorð' : 'Sýna lykilorð');
      });
    }
    var remember = document.getElementById('lp-remember');
    var email = document.getElementById('email');
    var form = document.getElementById('loginForm');
    if (!remember || !email || !form) return;
    var storageKey = 'brunaholf_login_email';
    try {
      var saved = window.localStorage.getItem(storageKey);
      if (saved) {
        email.value = saved;
        remember.checked = true;
      }
    } catch (_) { /* localStorage can be blocked */ }
    form.addEventListener('submit', function () {
      try {
        if (remember.checked && email.value.trim()) {
          window.localStorage.setItem(storageKey, email.value.trim());
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch (_) { /* login can still proceed */ }
    });
    remember.addEventListener('change', function () {
      if (!remember.checked) {
        try { window.localStorage.removeItem(storageKey); } catch (_) {}
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
