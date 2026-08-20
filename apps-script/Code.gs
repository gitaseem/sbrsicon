/**
 * SBRS ICON 2027 — form receiver
 *
 * Receives the Register and Submit Abstract forms from the website, emails you
 * each submission, and appends a row to a Google Sheet so you have a record.
 *
 * ── SETUP ────────────────────────────────────────────────────────────────────
 * 1. Create a Google Sheet. Note its ID from the URL:
 *      docs.google.com/spreadsheets/d/<THIS IS THE ID>/edit
 * 2. In that Sheet:  Extensions → Apps Script.  Paste this file in, replacing
 *    whatever is there.  Set NOTIFY_TO and SHEET_ID below.
 * 3. Deploy → New deployment → type "Web app".
 *      Execute as:          Me
 *      Who has access:      Anyone            ← must be "Anyone", not "Anyone with Google account"
 *    Deploy, authorise when prompted, and copy the /exec URL.
 * 4. Paste that URL into index.html, into:   var FORM_ENDPOINT = "";
 * 5. Re-deploy after ANY edit here: Deploy → Manage deployments → edit → Version:
 *    "New version" → Deploy. Editing without a new version changes nothing live.
 *
 * Gmail sending limit is 100 recipients/day on a free account, 1500 on Workspace.
 */

var NOTIFY_TO = 'office@sbrsin.org';   // where submissions are emailed
var SHEET_ID  = '';                    // optional: Sheet ID to log to. Leave '' to skip logging.
var REPLY_TO_SUBMITTER = true;         // set the submitter's address as Reply-To

var FIELDS = {
  registration: ['name', 'email', 'country', 'phone', 'affiliation', 'category', 'city', 'notes'],
  abstract:     ['name', 'email', 'country', 'phone', 'affiliation', 'track', 'presentation',
                 'coauthors', 'title', 'abstract']
};

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return json({ ok: true });            // honeypot: silently accept, do nothing

    var kind = p.form === 'abstract' ? 'abstract' : 'registration';
    if (!p.name || !p.email) return json({ ok: false, error: 'name and email are required' });

    var keys = FIELDS[kind];
    var rows = keys.map(function (k) { return [k, p[k] || '']; });

    var subject = kind === 'abstract'
      ? 'SBRS ICON 2027 — Abstract: ' + (p.title || '(untitled)') + ' — ' + p.name
      : 'SBRS ICON 2027 — Registration: ' + p.name + ' (' + (p.country || '') + ')';

    var body = rows.map(function (r) {
      return r[0].toUpperCase() + ':\n' + (r[1] || '—') + '\n';
    }).join('\n');
    body += '\n---\nSubmitted: ' + (p.submitted_at || new Date().toISOString());
    body += '\nFrom page: ' + (p.page || '');

    var opts = { name: 'SBRS ICON 2027 website' };
    if (REPLY_TO_SUBMITTER && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(p.email)) opts.replyTo = p.email;
    MailApp.sendEmail(NOTIFY_TO, subject, body, opts);

    if (SHEET_ID) logToSheet(kind, keys, p);

    return json({ ok: true });
  } catch (err) {
    // Still tell the browser something went wrong rather than failing silently.
    return json({ ok: false, error: String(err) });
  }
}

function logToSheet(kind, keys, p) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(kind);
  if (!sheet) {
    sheet = ss.insertSheet(kind);
    sheet.appendRow(['received_at'].concat(keys));
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date()].concat(keys.map(function (k) { return p[k] || ''; })));
}

function doGet() {
  return json({ ok: true, service: 'SBRS ICON 2027 form receiver' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to check email delivery before going live. */
function testSend() {
  doPost({ parameter: {
    form: 'registration', name: 'Test Person', email: 'test@example.com',
    country: 'India', phone: '+91 9999999999', affiliation: 'Test Institute',
    category: 'Researcher / Academician', submitted_at: new Date().toISOString()
  }});
}
