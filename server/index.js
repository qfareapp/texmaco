import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './config.js';
import { Segment } from './models/Segment.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { brochureRouter } from './routes/brochure.js';
import { leadsRouter } from './routes/leads.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      "media-src": ["'self'", 'blob:', 'https://res.cloudinary.com'],
      "connect-src": ["'self'", ...config.origins],
    },
  },
}));
app.use(cors({ origin(origin, callback) { callback(null, !origin || config.origins.includes(origin)); }, credentials: false }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/brochure', brochureRouter);
app.use('/api/admin', adminRouter);

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(root, '../dist');
const frontendIndex = path.join(dist, 'index.html');
if (existsSync(frontendIndex)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(frontendIndex));
} else {
  app.get('/', (_req, res) => res.json({
    service: 'Texmaco Brochure API',
    status: 'online',
    health: '/api/health',
  }));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.code === 11000
    ? 'That value already exists.'
    : error.code === 'ECONNRESET'
      ? 'The Cloudinary connection was interrupted after multiple attempts. Check your connection and try again.'
      : error.message || 'Something went wrong.';
  res.status(error.status || 500).json({ message });
});

async function start() {
  await mongoose.connect(config.mongoUri);
  const defaultSegments = ['Overview', 'Products', 'Capabilities', 'Locations', 'Sustainability', 'Connect'];
  if (await Segment.countDocuments() === 0) {
    await Segment.insertMany(defaultSegments.map((label, order) => ({ slug: label.toLowerCase(), label, order })));
  }
  app.listen(config.port, '0.0.0.0', () => console.log(`Texmaco API listening on port ${config.port}`));
}

start().catch((error) => { console.error('Unable to start server:', error); process.exit(1); });
