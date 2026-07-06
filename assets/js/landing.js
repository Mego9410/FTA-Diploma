/* ============================================================
   FTA × Novus — Diploma landing page interactions
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     WIX INTEGRATION CONFIG
     Form submissions are handled by the Wix Velo endpoint below.
     Landing page: https://fta-academy.com
       Live (wixsite URL):    https://USERNAME.wixsite.com/SITE/_functions/registerInterest
       Test version:          .../_functions-dev/registerInterest
     While REGISTER_ENDPOINT contains "YOURDOMAIN" the form runs in demo mode
     (shows success without sending), so the page works before go-live.
     ============================================================ */
  var REGISTER_ENDPOINT = 'https://oliveracton.wixsite.com/my-site-1/_functions/registerInterest';

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
    var custom = field.closest('.custom-select');
    if (custom) custom.classList.toggle('invalid', on);
    var group = field.closest('.field-group');
    if (!group) return;
    var msg = group.querySelector('.err-msg');
    if (msg) msg.classList.toggle('show', on);
  }

  function focusField(field) {
    if (field.closest('.custom-select')) {
      var trigger = field.closest('.custom-select').querySelector('.custom-select-trigger');
      if (trigger) {
        trigger.focus({ preventScroll: true });
        return;
      }
    }
    field.focus({ preventScroll: true });
  }

  function initCustomSelects() {
    var chevSrc = 'assets/icons/down-yellow-plain-arrow.svg';
    form.querySelectorAll('select.inp').forEach(function (select) {
      var wrap = document.createElement('div');
      wrap.className = 'custom-select';
      select.parentNode.insertBefore(wrap, select);
      wrap.appendChild(select);

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-select-trigger inp';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML =
        '<span class="value"></span>' +
        '<img class="chev" src="' + chevSrc + '" alt="" aria-hidden="true">';

      var list = document.createElement('ul');
      list.className = 'custom-select-list';
      list.setAttribute('role', 'listbox');
      list.id = select.id + '-list';

      var valueEl = trigger.querySelector('.value');
      var placeholder = '';

      function syncTrigger() {
        var option = select.options[select.selectedIndex];
        var empty = !select.value;
        var label = empty ? placeholder : (option ? option.textContent : '');
        valueEl.textContent = label;
        valueEl.classList.toggle('is-placeholder', empty);
        list.querySelectorAll('.custom-select-option').forEach(function (item) {
          item.setAttribute('aria-selected', item.dataset.value === select.value ? 'true' : 'false');
        });
      }

      Array.prototype.forEach.call(select.options, function (option, index) {
        if (option.value === '') {
          if (!placeholder) placeholder = option.textContent;
          return;
        }
        var item = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-select-option';
        btn.setAttribute('role', 'option');
        btn.dataset.value = option.value;
        btn.textContent = option.textContent;
        btn.addEventListener('click', function () {
          select.value = option.value;
          syncTrigger();
          closeAllCustomSelects();
          select.dispatchEvent(new Event('change', { bubbles: true }));
          trigger.focus();
        });
        item.appendChild(btn);
        list.appendChild(item);
      });

      trigger.setAttribute('aria-controls', list.id);
      trigger.addEventListener('click', function () {
        var open = wrap.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) closeAllCustomSelects(wrap);
      });

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          wrap.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          closeAllCustomSelects(wrap);
          var selected = list.querySelector('[aria-selected="true"]') || list.querySelector('.custom-select-option');
          if (selected) selected.focus();
        } else if (e.key === 'Escape') {
          closeAllCustomSelects();
        }
      });

      list.addEventListener('keydown', function (e) {
        var options = Array.prototype.slice.call(list.querySelectorAll('.custom-select-option'));
        var current = document.activeElement;
        var index = options.indexOf(current);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          var next = options[Math.min(index + 1, options.length - 1)] || options[0];
          next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          var prev = options[Math.max(index - 1, 0)] || options[options.length - 1];
          prev.focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (current && current.classList.contains('custom-select-option')) current.click();
        } else if (e.key === 'Escape') {
          closeAllCustomSelects();
          trigger.focus();
        }
      });

      wrap.appendChild(trigger);
      wrap.appendChild(list);
      if (!placeholder && select.options.length) placeholder = select.options[0].textContent;
      syncTrigger();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.custom-select')) closeAllCustomSelects();
    });
  }

  function closeAllCustomSelects(except) {
    form.querySelectorAll('.custom-select.open').forEach(function (wrap) {
      if (except && wrap === except) return;
      wrap.classList.remove('open');
      var trigger = wrap.querySelector('.custom-select-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  initCustomSelects();

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
        focusField(firstBad);
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
        return res.json().then(function (data) {
          if (!res.ok) {
            var err = new Error((data && data.error) || 'Request failed (' + res.status + ')');
            err.detail = data && data.detail;
            throw err;
          }
          return data;
        });
      })
      .then(function (data) {
        if (data && data.ok) {
          showSuccess();
        } else {
          var fail = new Error((data && data.error) || 'Submission failed');
          fail.detail = data && data.detail;
          throw fail;
        }
      })
      .catch(function (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtnHtml;
        }
        var detail = err && err.detail;
        if (detail) {
          console.error('Registration submission failed:', detail);
        }
        var message = "Sorry — something went wrong sending your registration. Please try again, or call us on 0330 088 1156.";
        if (detail) {
          message += ' Technical detail: ' + detail;
        }
        showFormError(message);
      });
  });
})();
