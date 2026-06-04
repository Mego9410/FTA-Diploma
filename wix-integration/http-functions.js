/* ============================================================================
 *  FTA × Novus Diploma — Wix Velo backend endpoint
 *  ----------------------------------------------------------------------------
 *  WHERE THIS GOES (do this inside the Wix Editor, not by uploading a file):
 *
 *  1. Open your Wix site → enable Dev Mode (Velo) from the top bar.
 *  2. In the left "Velo" panel, under "Backend", create a file named EXACTLY:
 *         http-functions.js
 *     (Wix only exposes endpoints from a file with this exact name.)
 *  3. Paste the entire contents of THIS file into it and Publish the site.
 *
 *  YOUR ENDPOINT URLS (used in assets/js/landing.js → REGISTER_ENDPOINT):
 *     Live (custom domain): https://www.yourdomain.com/_functions/registerInterest
 *     Live (wixsite URL):   https://USERNAME.wixsite.com/SITE/_functions/registerInterest
 *     Test (before publish): replace /_functions/ with /_functions-dev/
 *
 *  CREATE THE DATA COLLECTION (left panel → "Databases" → "+ Create Collection"):
 *     Collection name (ID):  DiplomaRegistrations
 *     Permissions:           "Custom use" is fine — this code uses suppressAuth,
 *                            so anonymous site visitors do NOT need write access.
 *     Fields (all type "Text" unless noted):
 *        firstName, lastName, email, mobile, role, gdc, qualified,
 *        region, target, timeframe, funding, budget,
 *        barrier        (Text — long text),
 *        hear, source, pageUrl, contactId,
 *        submittedAt    (Date & Time),
 *        consent        (Boolean)
 *     (Wix also auto-adds _id / _createdDate — leave those.)
 *
 *  Submissions appear in:  Contacts (CRM) + the DiplomaRegistrations collection.
 *  Tighten ALLOWED_ORIGIN below to your landing-page domain before launch.
 * ========================================================================== */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { contacts } from 'wix-crm-backend';

// Set this to the exact origin that hosts the landing page, e.g.
// 'https://diploma.franktaylor.co.uk'. Use '*' only while testing.
const ALLOWED_ORIGIN = 'https://fta-diploma.vercel.app';
const COLLECTION = 'DiplomaRegistrations';
const CONTACT_LABEL = 'Diploma — Jan 2027 interest';

const REQUIRED = [
  'firstName', 'lastName', 'email', 'mobile', 'role', 'gdc',
  'qualified', 'region', 'target', 'timeframe', 'funding', 'budget',
  'barrier', 'consent'
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// Handles the browser's CORS pre-flight request.
export function options_registerInterest() {
  return ok({ headers: corsHeaders() });
}

export async function post_registerInterest(request) {
  let body;
  try {
    body = await request.body.json();
  } catch (e) {
    return badRequest({ headers: corsHeaders(), body: { ok: false, error: 'Invalid JSON' } });
  }

  // ---- server-side validation (never trust the client) ----
  for (const key of REQUIRED) {
    const val = body[key];
    const missing = val === undefined || val === null || val === '' ||
      (key === 'consent' && val !== true);
    if (missing) {
      return badRequest({ headers: corsHeaders(), body: { ok: false, error: 'Missing field: ' + key } });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return badRequest({ headers: corsHeaders(), body: { ok: false, error: 'Invalid email address' } });
  }

  try {
    // ---- 1) create or update a CRM contact (dedupes by email/phone) ----
    let contactId = null;
    try {
      const result = await contacts.appendOrCreateContact({
        name: { first: String(body.firstName), last: String(body.lastName) },
        emails: [{ tag: 'MAIN', email: String(body.email) }],
        phones: [{ tag: 'MOBILE', phone: String(body.mobile) }],
        labels: [CONTACT_LABEL]
      });
      contactId = result && result.contactId ? result.contactId : null;
    } catch (contactErr) {
      // Don't lose the lead if contact creation hiccups — still store the record.
      contactId = null;
    }

    // ---- 2) store the full submission in the data collection ----
    const record = {
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email: String(body.email),
      mobile: String(body.mobile),
      role: String(body.role),
      gdc: String(body.gdc),
      qualified: String(body.qualified),
      region: String(body.region),
      target: String(body.target),
      timeframe: String(body.timeframe),
      funding: String(body.funding),
      budget: String(body.budget),
      barrier: String(body.barrier),
      hear: body.hear ? String(body.hear) : '',
      consent: body.consent === true,
      contactId: contactId,
      pageUrl: body.pageUrl ? String(body.pageUrl) : '',
      source: 'Diploma landing page',
      submittedAt: new Date()
    };

    await wixData.insert(COLLECTION, record, { suppressAuth: true });

    return ok({ headers: corsHeaders(), body: { ok: true, contactId: contactId } });
  } catch (err) {
    return serverError({ headers: corsHeaders(), body: { ok: false, error: 'Server error storing submission' } });
  }
}
