import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@meridianflow.site";

  if (!transporter) {
    console.warn(
      `[email] SMTP not configured. Password reset URL for ${toEmail}: ${resetUrl}`
    );
    return;
  }

  await transporter.sendMail({
    from: `"MeridianFlow" <${from}>`,
    to: toEmail,
    subject: "Reset your MeridianFlow password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #f5e4b5">
        <img src="https://app.meridianflow.site/logo.png" alt="MeridianFlow" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#5C3A0A;margin:0 0 8px">Reset your password</h2>
        <p style="color:#78716c;font-size:14px;line-height:1.6;margin:0 0 24px">
          We received a request to reset your MeridianFlow password.
          Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#C9973B,#8B5E10);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Reset Password
        </a>
        <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">
          If you didn't request this, you can safely ignore this email.<br/>
          This link will expire in 1 hour.
        </p>
        <hr style="border:none;border-top:1px solid #f5e4b5;margin:24px 0" />
        <p style="color:#a8a29e;font-size:11px;margin:0">
          &copy; 2026 Meridian Flow, Inc. &bull; <a href="https://app.meridianflow.site" style="color:#C9973B">app.meridianflow.site</a>
        </p>
      </div>
    `,
    text: `Reset your MeridianFlow password\n\nClick this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}
