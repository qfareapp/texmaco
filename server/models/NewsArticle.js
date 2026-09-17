import mongoose from 'mongoose';

const newsArticleSchema = new mongoose.Schema({
  headline: { type: String, required: true, trim: true, maxlength: 240 },
  gist: { type: String, required: true, trim: true, maxlength: 700 },
  sourceName: { type: String, required: true, trim: true, maxlength: 120 },
  sourceUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^https?:\/\//i.test(value),
      message: 'The source link must begin with http:// or https://.',
    },
  },
  publishedAt: { type: Date, required: true, index: true },
  image: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);
