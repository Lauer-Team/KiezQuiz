import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notify-secret",
  "Content-Type": "application/json",
};

interface Payload {
  version?: string;
  effectiveDate?: string;
  dryRun?: boolean;
  testTo?: string;
}

function buildTermsHtml(
  site: string,
  version: string,
  effectiveDate: string,
  fromEmail: string,
): string {
  const termsUrl = `${site}/nutzungsbedingungen/`;
  const profileUrl = `${site}/profile/`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Änderung der Nutzungsbedingungen</title>
</head>
<body style="margin:0;padding:0;background-color:#0F1118;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Wir passen die Nutzungsbedingungen an — gültig ab ${effectiveDate}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1118;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <a href="${site}" style="text-decoration:none;display:inline-block;">
                <img
                  src="https://kiezquiz.de/assets/brand/logo/wortmarke-primaer.png"
                  width="200"
                  height="86"
                  alt="KiezQuiz — Geografie-Quiz für deine Stadt"
                  style="display:block;border:0;outline:none;text-decoration:none;width:200px;max-width:200px;height:auto;"
                >
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#171A24;border:1px solid #363B4F;border-radius:18px;padding:36px 32px 32px;">
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#FF5233;">
                Rechtliches
              </p>
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:800;line-height:1.15;color:#FCFBF8;">
                Änderung der Nutzungsbedingungen
              </h1>
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#C5C9D4;">
                Wir passen die <strong style="color:#FCFBF8;">Nutzungsbedingungen</strong> von KiezQuiz an (Version <strong style="color:#FCFBF8;">${version}</strong>).
              </p>
              <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#C5C9D4;">
                Die geänderten Bedingungen treten am <strong style="color:#FCFBF8;">${effectiveDate}</strong> in Kraft — das sind mindestens 30 Tage ab heute.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#FF5233" style="background-color:#FF5233;border-radius:12px;">
                          <a href="${termsUrl}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:12px;">
                            Nutzungsbedingungen lesen
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#9AA0B0;">
                Button funktioniert nicht? Öffne diesen Link:
              </p>
              <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">
                <a href="${termsUrl}" style="color:#5AA9FF;text-decoration:underline;font-weight:600;">Nutzungsbedingungen öffnen</a>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="height:1px;background-color:#363B4F;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#9AA0B0;">
                Wenn du den Änderungen nicht zustimmst, kannst du deinen Account bis zum ${effectiveDate} in den
                <a href="${profileUrl}" style="color:#5AA9FF;text-decoration:underline;">Profileinstellungen</a>
                löschen. Die weitere Nutzung danach gilt als Zustimmung.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#9AA0B0;">
                <a href="${site}" style="color:#C5C9D4;text-decoration:none;">kiezquiz.de</a>
                &nbsp;·&nbsp;
                <a href="${site}/datenschutz/" style="color:#9AA0B0;text-decoration:underline;">Datenschutz</a>
                &nbsp;·&nbsp;
                <a href="mailto:${fromEmail}" style="color:#9AA0B0;text-decoration:underline;">${fromEmail}</a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#565b6e;">
                KiezQuiz · Geografie-Quiz für deine Stadt
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmail(version: string, effectiveDate: string) {
  const site = Deno.env.get("SITE_URL") || "https://kiezquiz.de";
  const fromEmail = Deno.env.get("FROM_EMAIL") || "info@kiezquiz.de";
  const fromName = Deno.env.get("FROM_NAME") || "KiezQuiz";
  const termsUrl = `${site}/nutzungsbedingungen/`;
  const profileUrl = `${site}/profile/`;
  const subject = `KiezQuiz: Änderung der Nutzungsbedingungen (Version ${version})`;
  const text =
    `Hallo,\n\nwir passen die Nutzungsbedingungen von KiezQuiz an (Version ${version}).\n\n` +
    `Die geänderten Bedingungen findest du hier:\n${termsUrl}\n\n` +
    `Sie treten am ${effectiveDate} in Kraft — das sind mindestens 30 Tage ab heute.\n\n` +
    `Wenn du den Änderungen nicht zustimmst, kannst du deinen Account bis dahin in den Profileinstellungen löschen:\n${profileUrl}\n` +
    `Die weitere Nutzung danach gilt als Zustimmung.\n\n` +
    `Fragen? ${fromEmail}\n\nViele Grüße\n${fromName}`;
  const html = buildTermsHtml(site, version, effectiveDate, fromEmail);
  return {
    from: `${fromName} <${fromEmail}>`,
    subject,
    text,
    html,
  };
}

async function listUserEmails(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const emails: string[] = [];
  const seen = new Set<string>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users ?? [];
    for (const u of batch) {
      const email = (u.email || "").trim();
      if (!email || seen.has(email)) continue;
      if (!u.email_confirmed_at && !u.confirmed_at) continue;
      seen.add(email);
      emails.push(email);
    }
    if (batch.length < perPage) break;
    page += 1;
  }

  return emails.sort();
}

async function sendSmtp(
  to: string,
  mail: ReturnType<typeof buildEmail>,
): Promise<void> {
  const login = Deno.env.get("SMTP_LOGIN");
  const password = Deno.env.get("SMTP_APP_PASSWORD");
  if (!login || !password) {
    throw new Error("SMTP_LOGIN / SMTP_APP_PASSWORD fehlt in Supabase Secrets");
  }

  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") ?? "smtp.mail.me.com",
      port: Number(Deno.env.get("SMTP_PORT") ?? "587"),
      tls: true,
      auth: { username: login, password },
    },
  });

  try {
    await client.send({
      from: mail.from,
      to,
      subject: mail.subject,
      content: mail.text,
      html: mail.html,
    });
  } finally {
    await client.close();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const expected = Deno.env.get("NOTIFY_TERMS_SECRET");
  const provided = req.headers.get("x-notify-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors });
  }

  const version = body.version?.trim();
  const effectiveDate = body.effectiveDate?.trim();
  if (!version || !effectiveDate) {
    return new Response(JSON.stringify({ error: "version and effectiveDate required" }), {
      status: 400,
      headers: cors,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let recipients = await listUserEmails(supabase);
  if (body.testTo) recipients = [body.testTo.trim()];

  const mail = buildEmail(version, effectiveDate);
  const result = { version, effectiveDate, dryRun: !!body.dryRun, recipientCount: recipients.length, recipients, errors: [] as string[] };

  if (body.dryRun) {
    return new Response(JSON.stringify(result), { headers: cors });
  }

  for (const email of recipients) {
    try {
      await sendSmtp(email, mail);
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      result.errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (result.errors.length) {
    return new Response(JSON.stringify(result), { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ ...result, sent: true }), { headers: cors });
});
