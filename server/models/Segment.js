import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  order: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export const Segment = mongoose.model('Segment', segmentSchema);
