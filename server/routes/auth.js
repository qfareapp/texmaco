import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const authRouter = express.Router();

authRouter.post('/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }), (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  const emailBuffer = digest(email);
  const expectedEmail = digest(config.adminEmail);
  const passBuffer = digest(password);
  const expectedPass = digest(config.adminPassword);
  const valid = crypto.timingSafeEqual(emailBuffer, expectedEmail) && crypto.timingSafeEqual(passBuffer, expectedPass);
  if (!valid) return res.status(401).json({ message: 'Incorrect email or password.' });

  const token = jwt.sign({ sub: email, role: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
  res.json({ token, admin: { email } });
});
