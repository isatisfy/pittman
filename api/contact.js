/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTACT FORM HANDLER  (Vercel serverless function)
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces Netlify Forms, which this site used until it moved to Vercel.
 *
 * WHY THIS EXISTS
 * Netlify intercepted the form POST at its edge and stored the submission with
 * no code at all. Vercel has no equivalent, so a form left as-is would POST to
 * a static HTML file and the message would vanish with no error anyone would
 * notice. This handler is that missing piece.
 *
 * WHAT IT DOES
 * Takes the urlencoded POST from /contact, checks the honeypot, validates the
 * fields, emails the message on, and redirects the browser to a normal page.
 * No JavaScript is needed in the browser for any of it — the form is a plain
 * HTML POST and this replies with a redirect, so it works with JS disabled.
 *
 * SETUP — IT WILL NOT SEND UNTIL THESE ARE SET IN VERCEL
 * (Project → Settings → Environment Variables)
 *
 *   RESEND_API_KEY      required. From https://resend.com → API Keys.
 *   CONTACT_FROM_EMAIL  required. Must be at a domain verified in Resend,
 *                       e.g. website@pittmanindustrial.com. It is the envelope
 *                       sender, NOT the person who filled in the form.
 *   CONTACT_TO_EMAIL    optional. Defaults to the address below.
 *
 * Missing configuration is treated as a FAILURE, never as a quiet success.
 * That is the whole lesson of the Netlify Forms trap this replaces: a contact
 * form that looks like it worked is worse than one that visibly did not.
 *
 * SWAPPING PROVIDERS
 * Resend is used through its plain REST API, so there is no dependency to
 * install and nothing here is Resend-shaped except sendEmail() below. Point
 * that one function at Postmark, SendGrid or SMTP and the rest is unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Where messages go when CONTACT_TO_EMAIL is not set. Keep in step with src/data/client.ts. */
const DEFAULT_TO = 'info@pittmanindustrial.com';

/** Page shown after a successful send. A real page in src/pages, not generated here. */
const SUCCESS_PATH = '/contact/success';

/** Back to the form. The ?error is read by a small script on the contact page. */
const ERROR_PATH = '/contact/?error=send';

/** Refuse absurd payloads before doing any work. A real message is a few KB. */
const MAX_BODY_BYTES = 64 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  let fields;
  try {
    fields = new URLSearchParams(await readBody(req));
  } catch (err) {
    console.error('[contact] could not read the request body:', err);
    return redirect(res, ERROR_PATH);
  }

  const name = (fields.get('name') || '').trim();
  const email = (fields.get('email') || '').trim();
  const phone = (fields.get('phone') || '').trim();
  const message = (fields.get('message') || '').trim();
  const honeypot = (fields.get('bot-field') || '').trim();

  // Spam bots fill in every field they find, including the hidden one. Send
  // them to the success page: telling them they were caught only teaches them
  // to stop filling it in. This mirrors what Netlify did.
  if (honeypot) {
    console.warn('[contact] honeypot filled, submission dropped');
    return redirect(res, SUCCESS_PATH);
  }

  // The browser enforces `required` too, but a POST can arrive from anywhere.
  if (!name || !email || !message || !looksLikeEmail(email)) {
    console.warn('[contact] rejected: missing or malformed fields');
    return redirect(res, ERROR_PATH);
  }

  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO;
  const from = process.env.CONTACT_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    // Loud on purpose. This is the state the site is in the moment it deploys
    // with no environment variables set, and it must not look like success.
    console.error(
      '[contact] NOT SENT - missing configuration. ' +
        `RESEND_API_KEY ${apiKey ? 'present' : 'MISSING'}, ` +
        `CONTACT_FROM_EMAIL ${from ? 'present' : 'MISSING'}. ` +
        'Set both in Vercel then redeploy.',
    );
    return redirect(res, ERROR_PATH);
  }

  try {
    await sendEmail({ apiKey, from, to, name, email, phone, message });
  } catch (err) {
    console.error('[contact] send failed:', err);
    return redirect(res, ERROR_PATH);
  }

  return redirect(res, SUCCESS_PATH);
}

/**
 * Hand the message to Resend.
 *
 * reply_to is the point of this: it is set to whoever filled in the form, so
 * hitting reply in the inbox answers the customer rather than the website.
 */
async function sendEmail({ apiKey, from, to, name, email, phone, message }) {
  const lines = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    phone ? `Phone:   ${phone}` : null,
    '',
    message,
  ].filter((line) => line !== null);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Website enquiry from ${name}`,
      text: lines.join('\n'),
      html:
        '<table cellpadding="0" cellspacing="0"><tbody>' +
        row('Name', name) +
        row('Email', email) +
        (phone ? row('Phone', phone) : '') +
        '</tbody></table>' +
        `<hr><div style="white-space:pre-wrap">${escapeHtml(message)}</div>`,
    }),
  });

  if (!response.ok) {
    // Resend puts the reason in the body; without it the log says only "400".
    const detail = await response.text().catch(() => '<no body>');
    throw new Error(`Resend responded ${response.status}: ${detail}`);
  }
}

function row(label, value) {
  return (
    `<tr><td style="padding:2px 12px 2px 0"><strong>${escapeHtml(label)}</strong></td>` +
    `<td style="padding:2px 0">${escapeHtml(value)}</td></tr>`
  );
}

/**
 * Everything here comes from a stranger on the internet and is about to be put
 * into an HTML email, so it is escaped. The plain-text part needs no escaping.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Deliberately loose. Address syntax is far stranger than most patterns allow,
 * and the only authority on whether an address works is trying to send to it.
 * This exists to catch "", "hello" and other obvious rubbish, nothing more.
 */
function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

/** Read the raw request body, refusing anything oversized. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`body exceeded ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * 303 See Other, not 302: it tells the browser to follow up with a GET. That
 * is what turns the POST into a normal page view, so a refresh on the success
 * page does not offer to submit the form again.
 */
function redirect(res, location) {
  res.setHeader('Location', location);
  return res.status(303).end();
}
