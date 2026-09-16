import mongoose from 'mongoose';

const slideSchema = new mongoose.Schema({
  segment: { type: String, required: true, trim: true, lowercase: true, index: true },
  eyebrow: { type: String, trim: true, maxlength: 100, default: '' },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  copy: { type: String, trim: true, maxlength: 600, default: '' },
  stat: { type: String, trim: true, maxlength: 60, default: '' },
  statLabel: { type: String, trim: true, maxlength: 120, default: '' },
  image: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  order: { type: Number, required: true, default: 0, index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Slide = mongoose.model('Slide', slideSchema);
