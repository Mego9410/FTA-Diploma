const FINANCE_NOTIFY_EMAIL = 'Pete.George@performancefinance.co.uk';
const FINANCE_CC_EMAILS = [
  'chris.strevens@ft-associates.com',
  'oliver.acton@ft-associates.com'
];
const ALLOWED_ORIGINS = [
  'https://fta-academy.com',
  'https://www.fta-academy.com',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    var raw = '';
    req.on('data', function (chunk) { raw += chunk; });
    req.on('end', function () {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || '';
  var headers = corsHeaders(origin);
  Object.keys(headers).forEach(function (key) {
    res.setHeader(key, headers[key]);
  });

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  var body;
  try {
    body = await readJson(req);
  } catch (err) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
    return;
  }

  var firstName = String(body.firstName || '').trim();
  var lastName = String(body.lastName || '').trim();
  var email = String(body.email || '').trim();
  var mobile = String(body.mobile || '').trim();
  var pageUrl = String(body.pageUrl || '').trim();

  if (!firstName || !lastName || !email || !mobile) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Missing required fields' }));
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Invalid email address' }));
    return;
  }

  var payload = {
    _subject: 'FTA Diploma - finance eligibility request',
    _template: 'table',
    _captcha: 'false',
    _cc: FINANCE_CC_EMAILS.join(','),
    _replyto: email,
    name: firstName + ' ' + lastName,
    email: email,
    mobile: mobile,
    partner: 'Performance Finance',
    pageUrl: pageUrl,
    note: 'Basic contact details only. Shared with consent via the diploma registration finance CTA.'
  };

  try {
    var response = await fetch(
      'https://formsubmit.co/ajax/' + encodeURIComponent(FINANCE_NOTIFY_EMAIL),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
    var data = await response.json().catch(function () { return {}; });

    if (!response.ok || data.success === 'false' || data.success === false) {
      res.statusCode = 502;
      res.end(JSON.stringify({
        ok: false,
        error: 'Could not send finance request email',
        detail: data.message || data.error || ('FormSubmit status ' + response.status)
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      error: 'Server error sending finance request',
      detail: String((err && err.message) || err)
    }));
  }
};
