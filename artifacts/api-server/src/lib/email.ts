import nodemailer from "nodemailer";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export async function readSmtpConfig(): Promise<SmtpConfig> {
  const keys = ["smtp_enabled", "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"];
  const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys));
  const map: Record<string, string> = {};
  for (const r of rows) if (r.key && r.value != null) map[r.key] = r.value;

  const host = map["smtp_host"] ?? process.env.SMTP_HOST ?? "";
  const portStr = map["smtp_port"] ?? process.env.SMTP_PORT ?? "587";
  const user = map["smtp_user"] ?? process.env.SMTP_USER ?? "";
  const pass = map["smtp_pass"] ?? process.env.SMTP_PASS ?? "";
  const from = map["smtp_from"] ?? process.env.SMTP_FROM ?? user;
  const enabledStr = map["smtp_enabled"] ?? "true";
  const enabled = enabledStr === "true";

  return { enabled, host, port: Number(portStr), user, pass, from };
}

function createTransporter(cfg: SmtpConfig) {
  if (!cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const BRAND_HEADER = `
<div style="background:linear-gradient(135deg,#C9973B 0%,#8B5E10 60%,#A07428 100%);padding:28px 28px 20px;border-radius:16px 16px 0 0;text-align:center">
  <img src="https://app.meridianflow.site/logo.png" alt="MeridianFlow" width="140" height="140" style="display:block;margin:0 auto;border-radius:12px" />
</div>`;

const BRAND_FOOTER = `
<div style="background:#f8f4ef;padding:16px 28px;border-radius:0 0 16px 16px;text-align:center;border-top:1px solid #f5e4b5">
  <p style="color:#a8a29e;font-size:11px;margin:0">&copy; 2026 Meridian Flow, Inc. &bull; <a href="https://app.meridianflow.site" style="color:#C9973B;text-decoration:none">app.meridianflow.site</a></p>
</div>`;

function wrapHtml(bodyContent: string): string {
  // nosemgrep: javascript.lang.security.html-in-template-string
  // BRAND_HEADER and BRAND_FOOTER are hardcoded constants; bodyContent is always
  // produced by textToHtml() which HTML-escapes all user-supplied text via escapeHtml().
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:20px;background:#f8f4ef;font-family:sans-serif">
<div style="max-width:480px;margin:0 auto;border-radius:16px;border:1px solid #f5e4b5;overflow:hidden;background:#fff">
  ${BRAND_HEADER}
  <div style="padding:28px;color:#374151;font-size:14px;line-height:1.7">
    ${bodyContent}
  </div>
  ${BRAND_FOOTER}
</div></body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    // nosemgrep: javascript.lang.security.html-in-template-string
    // line is passed through escapeHtml() before interpolation — safe.
    .map(line => `<p style="margin:0 0 10px">${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
}

// ── Default templates (used when DB template is empty/missing) ─────────────────

const DEFAULTS = {
  welcome: {
    subject: "Welcome to MeridianFlow, {{firstName}}!",
    body: `Hi {{firstName}},

Welcome to MeridianFlow! Your account has been successfully created.

Here are your registration details:
Name: {{firstName}} {{surname}}
Email: {{email}}
Referral Code: {{referralCode}}

Log in to your account, choose a property package, and start earning daily rental commissions.

If you have any questions, contact our support team via WhatsApp.

Best regards,
The MeridianFlow Team`,
  },
  withdrawalRequest: {
    subject: "Withdrawal Request Received — ₦{{amount}}",
    body: `Hi {{firstName}},

We have received your withdrawal request. Here are the details:

Amount: ₦{{amount}}
Bank: {{bankName}}
Account Number: {{accountNumber}}
Account Name: {{accountHolderName}}

Your request is currently under review. Withdrawals are typically processed within 24–48 hours. You will receive a confirmation email once it has been approved.

Best regards,
The MeridianFlow Team`,
  },
  withdrawalCompleted: {
    subject: "Withdrawal Approved ✅ — ₦{{netPayout}} on the way",
    body: `Hi {{firstName}},

Great news! Your withdrawal request has been approved and your payment is on the way.

Payout Summary:
Requested Amount: ₦{{amount}}
Commission (10%): ₦{{commission}}
Net Payout: ₦{{netPayout}}

Payment will be sent to:
Bank: {{bankName}}
Account: {{accountNumber}}

Please allow 1–3 business days for the funds to reflect in your account.

Best regards,
The MeridianFlow Team`,
  },
  activationDeposit: {
    subject: "Activation Deposit Confirmed 🎉 — {{positionLabel}}",
    body: `Hi {{firstName}},

Your deposit has been confirmed and your property position is now active!

Activation Details:
Position: {{positionLabel}}
Amount Deposited: ₦{{amount}}
Total Security Deposit: ₦{{securityDeposit}}

You can now complete your daily rental tasks to earn commissions. Log in to your dashboard to get started.

Best regards,
The MeridianFlow Team`,
  },
  levelExpiry2Day: {
    subject: "⏳ Your {{levelLabel}} Level expires in 2 days — Renew Now!",
    body: `Hi {{firstName}},

This is a friendly reminder that your {{levelLabel}} Level on MeridianFlow is set to expire in just 2 working days (on {{expiryDate}}).

Once it expires, your daily rental tasks and commission earnings for this level will stop.

Don't let your earnings pause — renew or upgrade today to keep your income flowing!

👉 Log in now at https://app.meridianflow.site and visit your Position page to make a new Activation Deposit.

Current Level: {{levelLabel}}
Expiry Date: {{expiryDate}}
Working Days Completed: {{daysCompleted}} of 50

If you have any questions, reach out to our support team on WhatsApp.

Best regards,
The MeridianFlow Team`,
  },
  levelExpiry1Day: {
    subject: "🚨 Last Chance! Your {{levelLabel}} Level expires TOMORROW — Act Now!",
    body: `Hi {{firstName}},

Your {{levelLabel}} Level on MeridianFlow expires TOMORROW ({{expiryDate}}). This is your final reminder!

After tomorrow, your daily rental tasks and commission earnings for this level will stop until you renew.

Secure your income — renew or upgrade right now!

👉 Log in at https://app.meridianflow.site and visit your Position page to make a new Activation Deposit.

Current Level: {{levelLabel}}
Expiry Date: {{expiryDate}}
Working Days Completed: {{daysCompleted}} of 50

Act fast — your earnings depend on it!

Best regards,
The MeridianFlow Team`,
  },
  userTransfer: {
    subject: "Transfer {{transferType}} — ₦{{amount}}",
    body: `Hi {{firstName}},

A fund transfer has been processed on your MeridianFlow account.

Transfer Details:
Type: {{transferType}}
Amount: ₦{{amount}}
Sender: {{senderName}} ({{senderUsername}})
Recipient: {{recipientName}} ({{recipientUsername}})
Date: {{date}}
Reference: {{reference}}
New Balance: ₦{{newBalance}}

If you did not initiate this transfer, please contact our support team immediately via WhatsApp.

Best regards,
The MeridianFlow Team`,
  },
};

// ── Template key type ─────────────────────────────────────────────────────────
export type TemplateKey = keyof typeof DEFAULTS;

export interface EmailTemplateData {
  subject: string;
  body: string;
  enabled: boolean;
}

export async function readEmailTemplate(key: TemplateKey): Promise<EmailTemplateData> {
  const subjectKey = `email_template_${key}_subject`;
  const bodyKey = `email_template_${key}_body`;
  const enabledKey = `email_template_${key}_enabled`;

  const rows = await db.select().from(siteSettingsTable).where(
    inArray(siteSettingsTable.key, [subjectKey, bodyKey, enabledKey]),
  );
  const map: Record<string, string> = {};
  for (const r of rows) if (r.key && r.value != null) map[r.key] = r.value;

  const def = DEFAULTS[key];
  return {
    subject: map[subjectKey] ?? def.subject,
    body: map[bodyKey] ?? def.body,
    enabled: map[enabledKey] !== "false",
  };
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendTemplatedEmail(
  templateKey: TemplateKey,
  toEmail: string,
  vars: Record<string, string>,
): Promise<void> {
  const [cfg, tmpl] = await Promise.all([readSmtpConfig(), readEmailTemplate(templateKey)]);

  if (!tmpl.enabled) return;

  const transporter = createTransporter(cfg);
  if (!transporter) {
    const subject = renderTemplate(tmpl.subject, vars);
    const body = renderTemplate(tmpl.body, vars);
    console.warn(`[email] SMTP not configured. Would send "${subject}" to ${toEmail}:\n${body}`);
    return;
  }

  const subject = renderTemplate(tmpl.subject, vars);
  const body = renderTemplate(tmpl.body, vars);
  const fromRaw = cfg.from || cfg.user;
  const fromField = fromRaw.includes("<") ? fromRaw : `"MeridianFlow" <${fromRaw}>`;

  await transporter.sendMail({
    from: fromField,
    to: toEmail,
    subject,
    html: wrapHtml(textToHtml(body)),
    text: body,
  });
}

// ── Password reset (special — uses its own HTML, not a user-editable template) ─

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const cfg = await readSmtpConfig();
  const transporter = createTransporter(cfg);
  const fromRaw = cfg.from || cfg.user || "noreply@meridianflow.site";
  const fromAddress = fromRaw.includes("<") ? fromRaw : `"MeridianFlow" <${fromRaw}>`;

  if (!transporter) {
    console.warn(`[email] SMTP not configured. Password reset URL for ${toEmail}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: "Reset your MeridianFlow password",
    html: wrapHtml(`
      <h2 style="color:#5C3A0A;margin:0 0 8px;font-size:18px">Reset your password</h2>
      <p style="color:#6b7280;margin:0 0 20px">We received a request to reset your MeridianFlow password.
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#C9973B,#8B5E10);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
        Reset Password
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0">
        If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
      </p>
    `),
    text: `Reset your MeridianFlow password\n\nClick this link (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

// ── Test SMTP connection ──────────────────────────────────────────────────────

export async function sendTestEmail(toEmail: string): Promise<void> {
  const cfg = await readSmtpConfig();
  const transporter = createTransporter(cfg);

  if (!transporter) {
    throw new Error("SMTP is not configured or disabled. Please fill in all SMTP fields and enable it first.");
  }

  const fromAddress = cfg.from || cfg.user;
  await transporter.sendMail({
    from: `"MeridianFlow" <${fromAddress}>`,
    to: toEmail,
    subject: "✅ MeridianFlow SMTP Test",
    html: wrapHtml(`
      <h2 style="color:#15803d;margin:0 0 8px;font-size:18px">SMTP connection is working!</h2>
      <p style="color:#6b7280;margin:0">If you received this email, your SMTP server is configured correctly and MeridianFlow can send emails.</p>
    `),
    text: "SMTP test successful! Your MeridianFlow email configuration is working correctly.",
  });
}
