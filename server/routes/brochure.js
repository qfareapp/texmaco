import express from 'express';
import { Segment } from '../models/Segment.js';
import { Slide } from '../models/Slide.js';
import { SiteSetting } from '../models/SiteSetting.js';
import { NewsArticle } from '../models/NewsArticle.js';

export const brochureRouter = express.Router();

brochureRouter.get('/', async (_req, res, next) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    const [segments, slides, settings] = await Promise.all([
      Segment.find().sort({ order: 1, _id: 1 }).lean(),
      Slide.find({ active: true }).sort({ order: 1, _id: 1 }).lean(),
      SiteSetting.findOne({ key: 'main' }).lean(),
    ]);
    res.json({
      segments: segments.map(({ _id, slug, label, order }) => ({ id: slug, _id, label, order })),
      slides: slides.map((slide, index) => ({ ...slide, id: slide._id, number: index + 1 })),
      featuredVideo: settings?.featuredVideo?.active && (settings.featuredVideo.url || settings.featuredVideo.embedUrl) ? settings.featuredVideo : null,
    });
  } catch (error) { next(error); }
});

brochureRouter.get('/news', async (_req, res, next) => {
  try {
    const articles = await NewsArticle.find({ active: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();
    res.json(articles);
  } catch (error) { next(error); }
});
