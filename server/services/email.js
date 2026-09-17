import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = config.smtp.host && config.smtp.user
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

const safeSmtpError = (error) => ({
  code: error.code,
  command: error.command,
  responseCode: error.responseCode,
  message: error.message,
});

export async function verifyEmailTransport() {
  if (!transporter) {
    console.warn('[email] SMTP is not configured.');
    return false;
  }
  try {
    await transporter.verify();
    console.log(`[email] SMTP connection verified (${config.smtp.host}:${config.smtp.port}, secure=${config.smtp.secure}).`);
    return true;
  } catch (error) {
    console.error('[email] SMTP verification failed:', safeSmtpError(error));
    return false;
  }
}

export async function sendOtpEmail({ email, name, code }) {
  if (!transporter) return false;
  try {
    const result = await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: 'Your Texmaco brochure verification code',
      text: `Hello ${name}, your verification code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;color:#17393a;max-width:520px;padding:30px"><h2>Continue your Texmaco journey</h2><p>Hello ${name},</p><p>Use this verification code to unlock the complete brochure:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>This code expires in 10 minutes.</p></div>`,
    });
    console.log('[email] OTP accepted by SMTP server:', { messageId: result.messageId, accepted: result.accepted });
    return true;
  } catch (error) {
    console.error('[email] OTP delivery failed:', safeSmtpError(error));
    const deliveryError = new Error('The verification email could not be sent. Please try again shortly.');
    deliveryError.status = 502;
    throw deliveryError;
  }
}
