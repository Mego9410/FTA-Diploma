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
     Finance CTA uses:        .../_functions/requestFinance
     While REGISTER_ENDPOINT contains "YOURDOMAIN" the form runs in demo mode
     (shows success without sending), so the page works before go-live.
     ============================================================ */
  var REGISTER_ENDPOINT = 'https://oliveracton.wixsite.com/my-site-1/_functions/registerInterest';
  var FINANCE_ENDPOINT = 'https://oliveracton.wixsite.com/my-site-1/_functions/requestFinance';
  // FormSubmit must be called from the browser (server/Vercel IPs get 403).
  var FINANCE_NOTIFY_EMAILS = [
    'Pete.George@performancefinance.co.uk',
    'chris.strevens@ft-associates.com',
    'oliver.acton@ft-associates.com'
  ];
  // Basic contact fields only — kept after submit for the optional finance CTA.
  var lastBasicDetails = null;

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

  var BMC_DISCOUNT_NOTE = 'Buyers Masterclass delegate, 15% discount applies';

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isBmcAttendee(email) {
    var list = window.BMC_ATTENDEE_EMAILS;
    if (!list || !list.length) return false;
    var needle = normalizeEmail(email);
    for (var i = 0; i < list.length; i++) {
      if (normalizeEmail(list[i]) === needle) return true;
    }
    return false;
  }

  function collectPayload() {
    var email = form.email.value.trim();
    var bmcDelegate = isBmcAttendee(email);
    return {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: email,
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
      pageUrl: window.location.href,
      bmcDelegate: bmcDelegate,
      bmcNote: bmcDelegate ? BMC_DISCOUNT_NOTE : ''
    };
  }

  function basicDetailsFromPayload(payload) {
    return {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      mobile: payload.mobile,
      pageUrl: payload.pageUrl || window.location.href,
      bmcDelegate: !!payload.bmcDelegate,
      bmcNote: payload.bmcNote || ''
    };
  }

  function showSuccess(payload) {
    if (payload) lastBasicDetails = basicDetailsFromPayload(payload);
    form.style.display = 'none';
    if (success) {
      success.classList.add('show');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function setFinanceStatus(message, kind) {
    var status = document.getElementById('financeStatus');
    if (!status) return;
    status.hidden = !message;
    status.textContent = message || '';
    status.classList.toggle('is-ok', kind === 'ok');
    status.classList.toggle('is-err', kind === 'err');
  }

  function sendFinanceEmailTo(to, details) {
    var baseNote = 'Basic contact details only. Shared with consent via the diploma registration finance CTA.';
    var note = details.bmcNote
      ? details.bmcNote + ' | ' + baseNote
      : baseNote;

    return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: details.bmcNote
          ? 'FTA Diploma - finance eligibility request (BMC 15% discount)'
          : 'FTA Diploma - finance eligibility request',
        _template: 'table',
        _captcha: 'false',
        _replyto: details.email,
        name: details.firstName + ' ' + details.lastName,
        email: details.email,
        mobile: details.mobile,
        partner: 'Performance Finance',
        pageUrl: details.pageUrl || '',
        discount: details.bmcNote || 'None',
        note: note
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.success === 'false' || data.success === false) {
          throw new Error((data && (data.message || data.error)) || ('Email send failed (' + res.status + ')'));
        }
        return data;
      });
    });
  }

  var financeBtn = document.getElementById('financeSendBtn');
  var financeBtnHtml = financeBtn ? financeBtn.innerHTML : '';
  if (financeBtn) {
    financeBtn.addEventListener('click', function () {
      if (!lastBasicDetails) {
        setFinanceStatus('Sorry — we could not find your details. Please refresh and register again.', 'err');
        return;
      }
      if (REGISTER_ENDPOINT.indexOf('YOURDOMAIN') !== -1) {
        setFinanceStatus('Thanks — your details would be sent for a finance check (demo mode).', 'ok');
        financeBtn.disabled = true;
        return;
      }

      financeBtn.disabled = true;
      financeBtn.innerHTML = 'Sending&hellip;';
      setFinanceStatus('', '');

      var settled = typeof Promise.allSettled === 'function'
        ? Promise.allSettled(FINANCE_NOTIFY_EMAILS.map(function (to) {
          return sendFinanceEmailTo(to, lastBasicDetails);
        }))
        : Promise.all(FINANCE_NOTIFY_EMAILS.map(function (to) {
          return sendFinanceEmailTo(to, lastBasicDetails).then(
            function (value) { return { status: 'fulfilled', value: value }; },
            function (reason) { return { status: 'rejected', reason: reason }; }
          );
        }));

      settled
        .then(function (results) {
          var anyOk = results.some(function (result) { return result.status === 'fulfilled'; });
          if (!anyOk) {
            var firstErr = results[0] && results[0].reason;
            throw firstErr || new Error('All finance email sends failed');
          }

          setFinanceStatus('Thanks — your details have been sent to Performance Finance. They will be in touch about eligibility.', 'ok');
          financeBtn.innerHTML = 'Details sent';

          // Best-effort CRM / CMS flag — do not block the success state.
          fetch(FINANCE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lastBasicDetails)
          }).catch(function (err) {
            console.error('Finance CRM label failed:', err);
          });
        })
        .catch(function (err) {
          console.error('Finance request failed:', err && (err.message || err));
          financeBtn.disabled = false;
          financeBtn.innerHTML = financeBtnHtml;
          setFinanceStatus('Sorry — we could not send your details just now. Please try again, or call us on 0330 088 1156.', 'err');
        });
    });
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
      showSuccess(collectPayload());
      return;
    }

    // Submit to Wix Velo endpoint.
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting&hellip;';
    }
    var errBox = document.getElementById('formErrorBox');
    if (errBox) errBox.style.display = 'none';

    var payload = collectPayload();
    fetch(REGISTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
          showSuccess(payload);
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
