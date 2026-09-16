import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { Lead } from '../models/Lead.js';
import { sendOtpEmail } from '../services/email.js';

export const leadsRouter = express.Router();
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 5, message: { message: 'Too many code requests. Please try again later.' } });
const hashOtp = (email, code) => crypto.createHash('sha256').update(`${email}:${code}:${config.jwtSecret}`).digest('hex');

leadsRouter.post('/request-otp', otpLimiter, async (req, res, next) => {
  try {
    const { name, company, domain, phone } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!name || !company || !domain || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide complete, valid contact details.' });
    }
    const code = String(crypto.randomInt(100000, 1000000));
    await Lead.findOneAndUpdate(
      { email },
      {
        name: String(name).trim(), company: String(company).trim(), domain: String(domain).trim(),
        phone: String(phone).trim(), otpHash: hashOtp(email, code),
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), otpAttempts: 0,
      },
      { upsert: true, runValidators: true },
    );
    const emailSent = await sendOtpEmail({ email, name: String(name).trim(), code });
    res.json({
      message: emailSent ? 'Verification code sent.' : 'Verification code created in demo mode.',
      ...(config.allowDemoOtp && !emailSent ? { demoOtp: code } : {}),
    });
  } catch (error) { next(error); }
});

leadsRouter.post('/verify-otp', rateLimit({ windowMs: 10 * 60 * 1000, limit: 15 }), async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '');
    const lead = await Lead.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');
    if (!lead || !lead.otpHash || lead.otpExpiresAt < new Date()) return res.status(400).json({ message: 'This code has expired. Request a new one.' });
    if (lead.otpAttempts >= 5) return res.status(429).json({ message: 'Too many incorrect attempts. Request a new code.' });
    if (hashOtp(email, code) !== lead.otpHash) {
      lead.otpAttempts += 1; await lead.save();
      return res.status(400).json({ message: 'That code does not match.' });
    }
    lead.verified = true;
    lead.verifiedAt ||= new Date();
    lead.lastLoginAt = new Date();
    lead.otpHash = undefined; lead.otpExpiresAt = undefined; lead.otpAttempts = 0;
    await lead.save();
    const accessToken = jwt.sign({ sub: lead._id, role: 'visitor' }, config.jwtSecret, { expiresIn: '24h' });
    res.json({ accessToken, lead: { name: lead.name, email: lead.email } });
  } catch (error) { next(error); }
});
