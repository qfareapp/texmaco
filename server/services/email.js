import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = config.smtp.host && config.smtp.user
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    })
  : null;

export async function sendOtpEmail({ email, name, code }) {
  if (!transporter) return false;
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your Texmaco brochure verification code',
    text: `Hello ${name}, your verification code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;color:#17393a;max-width:520px;padding:30px"><h2>Continue your Texmaco journey</h2><p>Hello ${name},</p><p>Use this verification code to unlock the complete brochure:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>This code expires in 10 minutes.</p></div>`,
  });
  return true;
}
