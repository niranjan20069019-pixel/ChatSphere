import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const generateToken = (): string => crypto.randomBytes(32).toString('hex');

let devTransporter: nodemailer.Transporter | null = null;

async function getDevTransporter() {
  if (!devTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    devTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info(
      `[EMAIL] Using Ethereal test account: ${testAccount.user} (see emails at https://ethereal.email/login)`
    );
  }
  return devTransporter;
}

const createTransporter = () => {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = createTransporter();

  if (transporter) {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    logger.info(`[EMAIL] Sent to ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return info;
  }

  const dev = await getDevTransporter();
  const info = await dev.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  logger.info(
    `[EMAIL DEV] To: ${to} | Subject: "${subject}" | Preview: ${previewUrl}`
  );
  return { messageId: info.messageId, previewUrl };
};

export const sendVerificationEmail = async (email: string, token: string, username: string) => {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail(
    email,
    'Verify your ChatSphere account',
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h1 style="color:#6366f1">Welcome to ChatSphere, ${username}!</h1>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">Verify Email</a>
      <p style="color:#666;margin-top:24px">Or copy this link: ${url}</p>
    </div>`
  );
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail(
    email,
    'Reset your ChatSphere password',
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h1 style="color:#6366f1">Password Reset</h1>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">Reset Password</a>
      <p style="color:#666;margin-top:24px">If you didn't request this, ignore this email.</p>
    </div>`
  );
};
