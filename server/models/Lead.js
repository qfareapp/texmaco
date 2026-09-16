import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  company: { type: String, required: true, trim: true, maxlength: 150 },
  domain: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  otpHash: { type: String, select: false },
  otpExpiresAt: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  verified: { type: Boolean, default: false, index: true },
  verifiedAt: Date,
  lastLoginAt: Date,
}, { timestamps: true });

leadSchema.index({ email: 1 }, { unique: true });
export const Lead = mongoose.model('Lead', leadSchema);
