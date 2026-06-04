/* ============================================================
   FTA × Novus — Diploma landing page interactions
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     WIX INTEGRATION CONFIG
     Replace REGISTER_ENDPOINT with your published Wix Velo endpoint:
       Live (custom domain):  https://www.yourdomain.com/_functions/registerInterest
       Live (wixsite URL):    https://USERNAME.wixsite.com/SITE/_functions/registerInterest
       Test version:          .../_functions-dev/registerInterest
     While it still contains "YOURDOMAIN" the form runs in demo mode
     (shows success without sending), so the page works before go-live.
     ============================================================ */
  var REGISTER_ENDPOINT = 'https://www.YOURDOMAIN.com/_functions/registerInterest';

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Sticky mobile CTA (hide near the form) ---------- */
  var sticky = document.getElementById('stickyCta');
  var register = document.getElementById('register');
  if (sticky && register) {
    window.addEventListener('scroll', function () {
      var showAfter = window.scrollY > 700;
      var regTop = register.getBoundingClientRect().top;
      var nearForm = regTop < window.innerHeight && regTop > -register.offsetHeight;
      if (showAfter && !nearForm) {
        sticky.classList.add('show');
      } else {
        sticky.classList.remove('show');
      }
    }, { passive: true });
  }

  /* ---------- Form validation ---------- */
  var form = document.getElementById('regForm');
  if (!form) return;
  var success = document.getElementById('regSuccess');

  function setError(field, on) {
    field.classList.toggle('invalid', on);
    var group = field.closest('.field-group');
    if (!group) return;
    var msg = group.querySelector('.err-msg');
    if (msg) msg.classList.toggle('show', on);
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validateField(field) {
    var ok = true;
    if (field.type === 'checkbox') {
      ok = field.checked;
    } else if (field.type === 'email') {
      ok = validEmail(field.value.trim());
    } else if (field.hasAttribute('required')) {
      ok = field.value.trim() !== '';
    }
    setError(field, !ok);
    return ok;
  }

  // live-clear errors as the user fixes them
  form.querySelectorAll('.inp, input[type=checkbox]').forEach(function (field) {
    field.addEventListener('input', function () {
      if (field.classList.contains('invalid') || (field.type === 'checkbox')) {
        validateField(field);
      }
    });
    field.addEventListener('change', function () { validateField(field); });
  });

  var submitBtn = form.querySelector('button[type=submit]');
  var submitBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  function collectPayload() {
    return {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      mobile: form.mobile.value.trim(),
      role: form.role.value,
      gdc: form.gdc.value.trim(),
      qualified: form.qualified.value,
      region: form.region.value.trim(),
      target: form.target.value.trim(),
      timeframe: form.timeframe.value,
      funding: form.funding.value,
      budget: form.budget.value,
      barrier: form.barrier.value.trim(),
      hear: form.hear.value,
      consent: form.consent.checked,
      pageUrl: window.location.href
    };
  }

  function showSuccess() {
    form.style.display = 'none';
    if (success) {
      success.classList.add('show');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showFormError(message) {
    var box = document.getElementById('formErrorBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'formErrorBox';
      box.className = 'form-error-box';
      form.insertBefore(box, form.querySelector('.form-submit'));
    }
    box.textContent = message;
    box.style.display = 'block';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = form.querySelectorAll('[required]');
    var allOk = true;
    var firstBad = null;
    fields.forEach(function (field) {
      var ok = validateField(field);
      if (!ok && !firstBad) firstBad = field;
      if (!ok) allOk = false;
    });

    if (!allOk) {
      if (firstBad) {
        firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstBad.focus({ preventScroll: true });
      }
      return;
    }

    // Demo mode: endpoint not configured yet — show success without sending.
    if (REGISTER_ENDPOINT.indexOf('YOURDOMAIN') !== -1) {
      showSuccess();
      return;
    }

    // Submit to Wix Velo endpoint.
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting&hellip;';
    }
    var errBox = document.getElementById('formErrorBox');
    if (errBox) errBox.style.display = 'none';

    fetch(REGISTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectPayload())
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed (' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          showSuccess();
        } else {
          throw new Error((data && data.error) || 'Submission failed');
        }
      })
      .catch(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtnHtml;
        }
        showFormError("Sorry — something went wrong sending your registration. Please try again, or call us on 0330 088 1156.");
      });
  });
})();
