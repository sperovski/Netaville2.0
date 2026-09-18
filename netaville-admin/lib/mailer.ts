/**
 * Sending mail.
 *
 * One function, one provider seam. Right now the only mail Netaville sends is a
 * verification code, and the provider is Resend — a single API key and one HTTP
 * POST, no SMTP handshake to babysit. Swapping it for SendGrid, SES or raw SMTP
 * is a change to `deliver` below and nothing else.
 *
 * With no `RESEND_API_KEY` set the code is logged to the server console instead
 * of sent. That is the whole local-dev story: register, read the code off the
 * terminal, type it in. A production deployment sets the key (and `MAIL_FROM`
 * to an address on a domain verified with the provider).
 */

export type Mail = {
  to: string;
  subject: string;
  /** Always provided — the plain-text part, and the fallback when HTML is off. */
  text: string;
  html?: string;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend's shared sandbox sender. It only delivers to the address that owns the
 * Resend account, so it is fine for a first smoke test and useless for real
 * users — set MAIL_FROM to your own verified domain before launch.
 */
const DEFAULT_FROM = 'Netaville <onboarding@resend.dev>';

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (key === undefined || key.length === 0) {
    logToConsole('RESEND_API_KEY not set, not actually sending', mail);
    return;
  }

  try {
    await deliver(key, mail);
  } catch (caught) {
    // In production a failed send is a real failure — the route turns it into a
    // 502 so nobody registers into a dead end. In development it usually means
    // the Resend sandbox sender is refusing an address that is not the account
    // owner (verify a domain to lift that), and blocking on it would stop all
    // local testing. So there, log the mail and carry on.
    if (process.env.NODE_ENV === 'production') {
      throw caught;
    }
    logToConsole(
      `send failed (${caught instanceof Error ? caught.message : 'unknown'}) — logging instead`,
      mail,
    );
  }
}

function logToConsole(reason: string, mail: Mail): void {
  console.info(
    [
      '',
      `  ┌─ netaville:mail ─ ${reason}`,
      `  │  to:      ${mail.to}`,
      `  │  subject: ${mail.subject}`,
      ...mail.text.split('\n').map(line => `  │  ${line}`),
      '  └─',
      '',
    ].join('\n'),
  );
}

async function deliver(apiKey: string, mail: Mail): Promise<void> {
  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? DEFAULT_FROM,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html === undefined ? {} : {html: mail.html}),
      }),
    });
  } catch (caught) {
    // Network failure reaching Resend. Surfaced to the caller so the route can
    // answer "couldn't send, try again" rather than pretend it worked.
    throw new Error(
      `Could not reach the mail provider: ${
        caught instanceof Error ? caught.message : 'unknown error'
      }`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Mail provider rejected the send (${response.status}): ${body.slice(0, 200)}`,
    );
  }
}
