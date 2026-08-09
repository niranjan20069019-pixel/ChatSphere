import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: nodemailer.Transporter | null = null;
let devTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

async function getDevTransporter() {
  if (devTransporter) return devTransporter;
  const testAccount = await nodemailer.createTestAccount();
  devTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  logger.info(`[EMAIL] Dev mode — using Ethereal account: ${testAccount.user}`);
  return devTransporter;
}

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="padding:48px 32px 32px;text-align:center">
<div style="width:56px;height:56px;background:#1a1a1a;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px">
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</div>
${content}
</td></tr>
<tr><td style="padding:24px 32px;background:#fafafa;text-align:center;font-size:12px;color:#999">
ChatSphere &mdash; &copy; ${new Date().getFullYear()}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0">${label}</a>`;
}

export async function sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  const html = baseHtml(`
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 4px">Verify your email</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px;line-height:1.6">
      Thanks for joining ChatSphere!<br>Click the button below to verify your email address.
    </p>
    ${button(verificationUrl, 'Verify Email')}
    <p style="font-size:12px;color:#999;margin-top:24px">
      Or copy this link: <br>
      <span style="color:#6366f1">${verificationUrl}</span>
    </p>
    <p style="font-size:12px;color:#999;margin-top:16px">
      This link expires in 24 hours.
    </p>
  `);
  await sendEmail(email, 'Verify your ChatSphere account', html);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const html = baseHtml(`
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 4px">Reset your password</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px;line-height:1.6">
      We received a request to reset your ChatSphere password.<br>
      Click the button below to create a new password.
    </p>
    ${button(resetUrl, 'Reset Password')}
    <p style="font-size:12px;color:#999;margin-top:24px">
      Or copy this link: <br>
      <span style="color:#6366f1">${resetUrl}</span>
    </p>
    <p style="font-size:12px;color:#999;margin-top:16px">
      This link expires in 15 minutes.<br>
      If you didn't request this, you can safely ignore this email.
    </p>
  `);
  await sendEmail(email, 'Reset your ChatSphere password', html);
}

async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (t) {
    try {
      const info = await t.sendMail({ from: env.EMAIL_FROM, to, subject, html });
      logger.info(`[EMAIL] Sent to ${to} | Subject: "${subject}" | Id: ${info.messageId}`);
    } catch (err) {
      logger.error(`[EMAIL] Failed to send to ${to} | Subject: "${subject}" | ${(err as Error).message}`);
    }
    return;
  }

  if (env.NODE_ENV === 'production') {
    logger.warn(`[EMAIL] SMTP not configured — email NOT delivered. To: ${to} | Subject: "${subject}"`);
    logger.info(`[EMAIL] Would have sent:\n${html}`);
    return;
  }

  try {
    const dev = await getDevTransporter();
    const info = await dev.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`[EMAIL DEV] To: ${to} | Subject: "${subject}" | Preview: ${previewUrl}`);
  } catch (err) {
    logger.error(`[EMAIL DEV] Ethereal send failed for ${to}: ${(err as Error).message}`);
    logger.info(`[EMAIL DEV] Fallback — would have sent:\n${html}`);
  }
}

export async function verifySmtpConnection(): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.warn('[EMAIL] SMTP not configured — emails will be previewed via Ethereal');
    return;
  }
  try {
    await t.verify();
    logger.info('[EMAIL] SMTP connection verified');
  } catch (err) {
    logger.error('[EMAIL] SMTP connection failed — check your SMTP_HOST, SMTP_USER, SMTP_PASS');
  }
}
