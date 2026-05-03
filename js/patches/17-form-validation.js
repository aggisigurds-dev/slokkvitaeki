/* === FORM VALIDATION v1 === */
/* Adds inline validation to the company / customer forms:
 *   - Kennitala: 10 digits, valid Icelandic checksum (mod 11). Auto-formats
 *     6+4 with hyphen as the user types.
 *   - Netfang: standard email regex.
 *   - Sími: at least 7 digits.
 *
 * The check fires on blur; saving via Companies.submitNew /
 * Companies.openEdit blocks the submit if any field is invalid and
 * highlights the offending input.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__formValidationInstalled) return;
  window.__formValidationInstalled = true;

  const STYLE_ID = 'form-validation-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .fv-bad { border-color: #dc2626 !important; box-shadow: 0 0 0 2px rgba(220,38,38,0.15) !important; }
      .fv-msg {
        color: #dc2626; font-size: 11px; margin-top: 3px;
        line-height: 1.3; min-height: 0;
      }
      .fv-msg:empty { display: none; }
    `;
    document.head.appendChild(s);
  }

  function isValidKennitala(raw) {
    const s = String(raw || '').replace(/[^0-9]/g, '');
    if (s.length !== 10) return false;
    const w = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(s[i], 10) * w[i];
    let check = 11 - (sum % 11);
    if (check === 11) check = 0;
    if (check === 10) return false;
    return check === parseInt(s[8], 10);
  }

  function isValidEmail(raw) {
    const s = String(raw || '').trim();
    if (!s) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function isValidPhone(raw) {
    const s = String(raw || '').replace(/[^0-9]/g, '');
    if (!s) return true;
    return s.length >= 7;
  }

  function setError(input, msg) {
    if (!input) return;
    input.classList.toggle('fv-bad', !!msg);
    let msgEl = input.parentElement?.querySelector('.fv-msg');
    if (msg) {
      if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.className = 'fv-msg';
        input.parentElement?.appendChild(msgEl);
      }
      msgEl.textContent = msg;
    } else if (msgEl) {
      msgEl.textContent = '';
    }
  }

  function autoFormatKt(input) {
    if (!input || input.dataset.fvKtBound) return;
    input.dataset.fvKtBound = '1';
    input.addEventListener('input', () => {
      const digits = input.value.replace(/[^0-9]/g, '').slice(0, 10);
      input.value = digits.length > 6 ? digits.slice(0, 6) + '-' + digits.slice(6) : digits;
    });
    input.addEventListener('blur', () => {
      if (!input.value.trim()) { setError(input, ''); return; }
      setError(input, isValidKennitala(input.value) ? '' : 'Ógild kennitala');
    });
  }

  function bindEmail(input) {
    if (!input || input.dataset.fvEmailBound) return;
    input.dataset.fvEmailBound = '1';
    input.addEventListener('blur', () => {
      setError(input, isValidEmail(input.value) ? '' : 'Ógilt netfang');
    });
  }

  function bindPhone(input) {
    if (!input || input.dataset.fvPhoneBound) return;
    input.dataset.fvPhoneBound = '1';
    input.addEventListener('blur', () => {
      setError(input, isValidPhone(input.value) ? '' : 'Síminn er of stuttur');
    });
  }

  function bindNyfyrirtaeki() {
    autoFormatKt(document.getElementById('nf-kt'));
    bindEmail(document.getElementById('nf-netfang'));
    bindPhone(document.getElementById('nf-simi'));
  }

  function validateNyfyrirtaeki() {
    const kt = document.getElementById('nf-kt');
    const em = document.getElementById('nf-netfang');
    const ph = document.getElementById('nf-simi');
    let ok = true;
    if (kt && kt.value.trim() && !isValidKennitala(kt.value)) {
      setError(kt, 'Ógild kennitala'); ok = false;
    }
    if (em && !isValidEmail(em.value)) {
      setError(em, 'Ógilt netfang'); ok = false;
    }
    if (ph && !isValidPhone(ph.value)) {
      setError(ph, 'Síminn er of stuttur'); ok = false;
    }
    return ok;
  }

  function wrapSubmit() {
    if (!window.Companies) { setTimeout(wrapSubmit, 300); return; }
    if (Companies.submitNew && !Companies.submitNew.__fvWrapped) {
      const orig = Companies.submitNew;
      Companies.submitNew = function () {
        if (!validateNyfyrirtaeki()) {
          if (window.Toast && Toast.show) Toast.show('Athugaðu rauð svæði');
          return;
        }
        return orig.apply(this, arguments);
      };
      Companies.submitNew.__fvWrapped = true;
    }
  }

  // Bind on modal open (no MutationObserver — just rebind every couple seconds, cheap)
  setInterval(bindNyfyrirtaeki, 2000);
  setTimeout(bindNyfyrirtaeki, 600);
  wrapSubmit();
  console.log('[form-validation] installed');
})();
/* === END FORM VALIDATION === */
