import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/texmaco-brochure',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@texmaco.in').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'change-me-now',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'Texmaco Brochure <noreply@texmaco.in>',
  },
  origins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()),
  allowDemoOtp: process.env.ALLOW_DEMO_OTP === 'true' || process.env.NODE_ENV !== 'production',
};
