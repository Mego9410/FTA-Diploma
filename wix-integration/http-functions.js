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
 *     Live (wixsite URL):   https://USERNAME.wixsite.com/SITE/_functions/registerInterest
 *     Landing page:         https://www.fta-academy.com
 *     Test (before publish): replace /_functions/ with /_functions-dev/
 *
 *  CREATE THE DATA COLLECTION (Wix Editor → Dev Mode → Databases):
 *     IMPORTANT — HTTP functions write to the LIVE database, not Sandbox.
 *     After creating the collection you must Publish the site so it exists live.
 *     The Collection ID in code must match exactly (case-sensitive):
 *       Dev Mode → Databases → hover collection → "Copy collection ID"
 *     Paste that value into COLLECTION below (may NOT be "DiplomaRegistrations"
 *     if Wix auto-named it during CSV import, e.g. "Import1").
 *     Permissions:           "Custom use" is fine — this code uses suppressAuth,
 *                            so anonymous site visitors do NOT need write access.
 *     Fields (match your CMS schema — Import1 from CSV import):
 *        title          (Text — primary field; auto-filled from name),
 *        firstName, lastName, email, role, qualified,
 *        region, target, timeframe, funding, budget,
 *        barrier, hear, source, pageUrl, contactId  (Text),
 *        mobile, gdc    (Number),
 *        submittedAt    (Date & Time),
 *        consent        (Boolean)
 *     (Wix also auto-adds _id / _createdDate — leave those.)
 *
 *  Submissions appear in:  Contacts (CRM) + the DiplomaRegistrations collection.
 *  Contact custom fields are created automatically on first submission (prefixed
 *  "Diploma — …" in Contacts → Manage Fields). View them on a contact's profile.
 *  Tighten ALLOWED_ORIGIN below to your landing-page domain before launch.
 * ========================================================================== */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { contacts } from 'wix-crm-backend';

// Origins that host the landing page (Vercel). Use '*' only while testing.
const ALLOWED_ORIGINS = [
  'https://www.fta-academy.com',
  'https://fta-academy.com'
];
// Collection ID from Dev Mode → Databases (display name may differ, e.g. Import1).
const COLLECTION = 'Import1';
const CONTACT_LABEL = 'Diploma — Jan 2027 interest';
const CRM_AUTH = { suppressAuth: true };

// Maps form data to Wix Contact custom fields (extendedFields).
const CONTACT_FIELD_DEFS = [
  { bodyKey: 'role', displayName: 'Diploma — Current role', dataType: 'TEXT' },
  { bodyKey: 'gdc', displayName: 'Diploma — GDC number', dataType: 'TEXT' },
  { bodyKey: 'qualified', displayName: 'Diploma — Years since qualifying', dataType: 'TEXT' },
  { bodyKey: 'region', displayName: 'Diploma — Based in', dataType: 'TEXT' },
  { bodyKey: 'target', displayName: 'Diploma — Wants to buy in', dataType: 'TEXT' },
  { bodyKey: 'timeframe', displayName: 'Diploma — Buy timeframe', dataType: 'TEXT' },
  { bodyKey: 'funding', displayName: 'Diploma — Funding status', dataType: 'TEXT' },
  { bodyKey: 'budget', displayName: 'Diploma — Buying budget', dataType: 'TEXT' },
  { bodyKey: 'barrier', displayName: 'Diploma — Main barrier', dataType: 'TEXT' },
  { bodyKey: 'hear', displayName: 'Diploma — How they heard', dataType: 'TEXT' },
  {
    bodyKey: 'consent',
    displayName: 'Diploma — Marketing consent',
    dataType: 'TEXT',
    valueFrom: (body) => (body.consent === true ? 'Yes' : 'No')
  },
  { bodyKey: 'pageUrl', displayName: 'Diploma — Registration page', dataType: 'TEXT' },
  {
    bodyKey: 'source',
    displayName: 'Diploma — Lead source',
    dataType: 'TEXT',
    valueFrom: () => 'Diploma landing page'
  },
  {
    bodyKey: 'submittedAt',
    displayName: 'Diploma — Registered at',
    dataType: 'TEXT',
    valueFrom: () => new Date().toISOString()
  }
];

let contactFieldKeyCache = null;

function digitsAsNumber(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

async function ensureContactFieldKeys() {
  if (contactFieldKeyCache) return contactFieldKeyCache;

  const keys = {};
  for (const def of CONTACT_FIELD_DEFS) {
    const result = await contacts.findOrCreateExtendedField(
      { displayName: def.displayName, dataType: def.dataType },
      CRM_AUTH
    );
    keys[def.bodyKey] = result.extendedField.key;
  }

  contactFieldKeyCache = keys;
  return keys;
}

function buildContactExtendedFields(body, fieldKeys) {
  const extendedFields = {};

  for (const def of CONTACT_FIELD_DEFS) {
    const fieldKey = fieldKeys[def.bodyKey];
    const rawValue = def.valueFrom ? def.valueFrom(body) : body[def.bodyKey];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    extendedFields[fieldKey] = String(rawValue);
  }

  return extendedFields;
}

async function findContactByEmail(email) {
  const results = await contacts.queryContacts()
    .eq('primaryInfo.email', email)
    .limit(1)
    .find(CRM_AUTH);

  if (results.items.length) return results.items[0];

  const byEmailField = await contacts.queryContacts()
    .eq('info.emails.email', email)
    .limit(1)
    .find(CRM_AUTH);

  return byEmailField.items.length ? byEmailField.items[0] : null;
}

async function upsertContactWithFormData(body) {
  const fieldKeys = await ensureContactFieldKeys();
  const extendedFields = buildContactExtendedFields(body, fieldKeys);
  const firstName = String(body.firstName);
  const lastName = String(body.lastName);
  const email = String(body.email);
  const mobile = String(body.mobile);

  const labelResult = await contacts.findOrCreateLabel(CONTACT_LABEL, CRM_AUTH);
  const labelKey = labelResult.label.key;

  const contactInfo = {
    name: { first: firstName, last: lastName },
    emails: [{ tag: 'MAIN', email: email, primary: true }],
    phones: [{ tag: 'MOBILE', phone: mobile, countryCode: 'GB', primary: true }],
    labelKeys: [labelKey],
    extendedFields: extendedFields
  };

  const createOptions = { suppressAuth: true, allowDuplicates: false };
  const existing = await findContactByEmail(email);
  let contactId;

  if (existing) {
    const updated = await contacts.updateContact(
      { contactId: existing._id, revision: existing.revision },
      contactInfo,
      createOptions
    );
    contactId = updated._id;
  } else {
    const created = await contacts.createContact(contactInfo, createOptions);
    contactId = created._id;
  }

  try {
    await contacts.labelContact(contactId, [labelKey], CRM_AUTH);
  } catch (labelErr) {
    // Label may already be on the contact.
  }

  return contactId;
}

const REQUIRED = [
  'firstName', 'lastName', 'email', 'mobile', 'role', 'gdc',
  'qualified', 'region', 'target', 'timeframe', 'funding', 'budget',
  'barrier', 'consent'
];

function corsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

function requestOrigin(request) {
  if (!request || !request.headers) return '';
  return request.headers.origin || request.headers.Origin || '';
}

// Handles the browser's CORS pre-flight request.
export function options_registerInterest(request) {
  return ok({ headers: corsHeaders(requestOrigin(request)) });
}

// Open in a browser after publishing to verify the live CMS collection is wired up:
//   https://oliveracton.wixsite.com/my-site-1/_functions/registerInterest
export async function get_registerInterest(request) {
  const headers = corsHeaders(requestOrigin(request));
  try {
    const result = await wixData.query(COLLECTION).limit(1).find({ suppressAuth: true });
    return ok({
      headers: headers,
      body: {
        ok: true,
        collectionId: COLLECTION,
        liveItemCount: result.totalCount,
        message: 'Collection found on the live database.'
      }
    });
  } catch (err) {
    return ok({
      headers: headers,
      body: {
        ok: false,
        collectionId: COLLECTION,
        error: String((err && err.message) || err),
        fix: [
          'Dev Mode → Databases → hover your collection → Copy collection ID → set COLLECTION in this file.',
          'Publish the site after creating or renaming the collection (HTTP functions use LIVE data).',
          'Confirm the collection is on this site (oliveracton.wixsite.com/my-site-1), not another Wix site.'
        ]
      }
    });
  }
}

export async function post_registerInterest(request) {
  const headers = corsHeaders(requestOrigin(request));
  let body;
  try {
    body = await request.body.json();
  } catch (e) {
    return badRequest({ headers: headers, body: { ok: false, error: 'Invalid JSON' } });
  }

  // ---- server-side validation (never trust the client) ----
  for (const key of REQUIRED) {
    const val = body[key];
    const missing = val === undefined || val === null || val === '' ||
      (key === 'consent' && val !== true);
    if (missing) {
      return badRequest({ headers: headers, body: { ok: false, error: 'Missing field: ' + key } });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return badRequest({ headers: headers, body: { ok: false, error: 'Invalid email address' } });
  }

  try {
    // ---- 1) create or update CRM contact with all form fields ----
    let contactId = null;
    let contactError = null;
    try {
      contactId = await upsertContactWithFormData(body);
    } catch (contactErr) {
      // Don't lose the lead if contact sync hiccups — still store the CMS record.
      contactError = String((contactErr && contactErr.message) || contactErr);
      contactId = null;
    }

    // ---- 2) store the full submission in the data collection ----
    const firstName = String(body.firstName);
    const lastName = String(body.lastName);
    const record = {
      title: firstName + ' ' + lastName,
      firstName: firstName,
      lastName: lastName,
      email: String(body.email),
      mobile: digitsAsNumber(body.mobile),
      role: String(body.role),
      gdc: digitsAsNumber(body.gdc),
      qualified: String(body.qualified),
      region: String(body.region),
      target: String(body.target),
      timeframe: String(body.timeframe),
      funding: String(body.funding),
      budget: String(body.budget),
      barrier: String(body.barrier),
      hear: body.hear ? String(body.hear) : '',
      consent: body.consent === true,
      contactId: contactId || '',
      pageUrl: body.pageUrl ? String(body.pageUrl) : '',
      source: 'Diploma landing page',
      submittedAt: new Date()
    };

    await wixData.insert(COLLECTION, record, { suppressAuth: true });

    return ok({
      headers: headers,
      body: { ok: true, contactId: contactId, contactError: contactError }
    });
  } catch (err) {
    // Temporary: surface the real error to help diagnose setup issues.
    // Revert `error` back to a generic message before launch.
    return serverError({ headers: headers, body: { ok: false, error: 'Server error storing submission', detail: String((err && err.message) || err) } });
  }
}
