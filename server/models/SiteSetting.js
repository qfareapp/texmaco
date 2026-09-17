import mongoose from 'mongoose';

const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  featuredVideo: {
    title: { type: String, trim: true, maxlength: 120, default: 'Discover Texmaco' },
    description: { type: String, trim: true, maxlength: 240, default: '' },
    url: { type: String, default: '' },
    sourceType: { type: String, enum: ['upload', 'youtube', 'drive'], default: 'upload' },
    externalUrl: { type: String, default: '' },
    embedUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
}, { timestamps: true });

export const SiteSetting = mongoose.model('SiteSetting', siteSettingSchema);
