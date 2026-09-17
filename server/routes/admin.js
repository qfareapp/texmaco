import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname } from 'node:path';
import { requireAdmin } from '../middleware/auth.js';
import { Lead } from '../models/Lead.js';
import { Segment } from '../models/Segment.js';
import { Slide } from '../models/Slide.js';
import { SiteSetting } from '../models/SiteSetting.js';
import { NewsArticle } from '../models/NewsArticle.js';
import { deleteImage, deleteVideo, uploadImage, uploadVideo } from '../services/cloudinary.js';

export const adminRouter = express.Router();
adminRouter.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(file.mimetype.startsWith('image/') ? null : new Error('Only image files are allowed.'), file.mimetype.startsWith('image/')),
});
const uploadVideoFile = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => cb(null, `texmaco-video-${Date.now()}-${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 400 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Use an MP4, WebM or MOV video.'), allowed.includes(file.mimetype));
  },
});

function normalizeExternalVideoUrl(value) {
  let parsed;
  try { parsed = new URL(String(value || '').trim()); }
  catch { throw Object.assign(new Error('Enter a valid YouTube or Google Drive link.'), { status: 400 }); }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  let youtubeId = '';
  if (host === 'youtu.be') youtubeId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    youtubeId = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || '';
  }
  if (youtubeId && /^[a-zA-Z0-9_-]{6,20}$/.test(youtubeId)) {
    return {
      sourceType: 'youtube',
      externalUrl: parsed.toString(),
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`,
    };
  }

  if (host === 'drive.google.com') {
    const driveId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsed.searchParams.get('id') || '';
    if (driveId && /^[a-zA-Z0-9_-]{10,}$/.test(driveId)) {
      return {
        sourceType: 'drive',
        externalUrl: parsed.toString(),
        embedUrl: `https://drive.google.com/file/d/${driveId}/preview?autoplay=1`,
      };
    }
  }
  throw Object.assign(new Error('Only YouTube and Google Drive video links are supported.'), { status: 400 });
}

adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const [slides, segments, news, totalLeads, verifiedLeads] = await Promise.all([
      Slide.countDocuments(), Segment.countDocuments(), NewsArticle.countDocuments(), Lead.countDocuments(), Lead.countDocuments({ verified: true }),
    ]);
    res.json({ slides, segments, news, totalLeads, verifiedLeads });
  } catch (error) { next(error); }
});

adminRouter.get('/segments', async (_req, res, next) => {
  try { res.json(await Segment.find().sort({ order: 1 })); } catch (error) { next(error); }
});
adminRouter.post('/segments', async (req, res, next) => {
  try {
    const count = await Segment.countDocuments();
    const slug = String(req.body.slug || req.body.label || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const segment = await Segment.create({ slug, label: req.body.label, order: count });
    res.status(201).json(segment);
  } catch (error) { next(error); }
});
adminRouter.patch('/segments/:id', async (req, res, next) => {
  try {
    const segment = await Segment.findByIdAndUpdate(req.params.id, { label: req.body.label }, { new: true, runValidators: true });
    if (!segment) return res.status(404).json({ message: 'Segment not found.' });
    res.json(segment);
  } catch (error) { next(error); }
});
adminRouter.delete('/segments/:id', async (req, res, next) => {
  try {
    const segment = await Segment.findById(req.params.id);
    if (!segment) return res.status(404).json({ message: 'Navigation tab not found.' });
    const assignedSlides = await Slide.countDocuments({ segment: segment.slug });
    if (assignedSlides) {
      return res.status(409).json({
        message: `This tab is used by ${assignedSlides} slide${assignedSlides === 1 ? '' : 's'}. Reassign those slides before deleting it.`,
      });
    }
    await segment.deleteOne();
    res.json({ message: 'Navigation tab deleted.' });
  } catch (error) { next(error); }
});

adminRouter.get('/slides', async (_req, res, next) => {
  try { res.json(await Slide.find().sort({ order: 1 })); } catch (error) { next(error); }
});

adminRouter.get('/video', async (_req, res, next) => {
  try {
    const settings = await SiteSetting.findOne({ key: 'main' }).lean();
    res.json(settings?.featuredVideo || null);
  } catch (error) { next(error); }
});
adminRouter.post('/video', uploadVideoFile.single('video'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please choose a video file.' });
    const current = await SiteSetting.findOne({ key: 'main' });
    const result = await uploadVideo(req.file.path);
    try {
      const settings = await SiteSetting.findOneAndUpdate(
        { key: 'main' },
        { $set: { featuredVideo: {
          title: String(req.body.title || 'Discover Texmaco').trim(),
          description: String(req.body.description || '').trim(),
          active: req.body.active !== 'false', url: result.secure_url,
          sourceType: 'upload', externalUrl: '', embedUrl: '',
          cloudinaryPublicId: result.public_id, duration: result.duration || 0,
        } } },
        { upsert: true, new: true, runValidators: true },
      );
      if (current?.featuredVideo?.cloudinaryPublicId) await deleteVideo(current.featuredVideo.cloudinaryPublicId);
      res.json(settings.featuredVideo);
    } catch (error) { await deleteVideo(result.public_id); throw error; }
  } catch (error) { next(error); }
  finally { if (req.file?.path) await unlink(req.file.path).catch(() => {}); }
});
adminRouter.patch('/video', async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates['featuredVideo.title'] = String(req.body.title).trim();
    if (req.body.description !== undefined) updates['featuredVideo.description'] = String(req.body.description).trim();
    if (req.body.active !== undefined) updates['featuredVideo.active'] = Boolean(req.body.active);
    let previousPublicId = '';
    if (req.body.externalUrl !== undefined) {
      const normalized = normalizeExternalVideoUrl(req.body.externalUrl);
      const current = await SiteSetting.findOne({ key: 'main' }).lean();
      previousPublicId = current?.featuredVideo?.cloudinaryPublicId || '';
      updates['featuredVideo.sourceType'] = normalized.sourceType;
      updates['featuredVideo.externalUrl'] = normalized.externalUrl;
      updates['featuredVideo.embedUrl'] = normalized.embedUrl;
      updates['featuredVideo.url'] = '';
      updates['featuredVideo.cloudinaryPublicId'] = '';
      updates['featuredVideo.duration'] = 0;
    }
    const settings = await SiteSetting.findOneAndUpdate(
      { key: 'main' }, { $set: updates }, { upsert: true, new: true, runValidators: true },
    );
    if (previousPublicId) await deleteVideo(previousPublicId);
    res.json(settings.featuredVideo);
  } catch (error) { next(error); }
});
adminRouter.delete('/video', async (_req, res, next) => {
  try {
    const settings = await SiteSetting.findOne({ key: 'main' });
    if (!settings?.featuredVideo?.url && !settings?.featuredVideo?.embedUrl) return res.status(404).json({ message: 'No video is configured.' });
    const publicId = settings.featuredVideo.cloudinaryPublicId;
    settings.featuredVideo = { title: 'Discover Texmaco', description: '', url: '', sourceType: 'upload', externalUrl: '', embedUrl: '', cloudinaryPublicId: '', duration: 0, active: false };
    await settings.save();
    await deleteVideo(publicId);
    res.json({ message: 'Featured video removed.' });
  } catch (error) { next(error); }
});
adminRouter.post('/slides', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please choose a slide image.' });
    const result = await uploadImage(req.file.buffer);
    const last = await Slide.findOne().sort({ order: -1 }).select('order');
    try {
      const slide = await Slide.create({
        segment: req.body.segment, eyebrow: req.body.eyebrow, title: req.body.title,
        copy: req.body.copy, stat: req.body.stat, statLabel: req.body.statLabel,
        active: req.body.active !== 'false', order: (last?.order ?? -1) + 1,
        image: result.secure_url, cloudinaryPublicId: result.public_id,
      });
      res.status(201).json(slide);
    } catch (error) { await deleteImage(result.public_id); throw error; }
  } catch (error) { next(error); }
});
adminRouter.patch('/slides/reorder', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.ids)) return res.status(400).json({ message: 'Slide order is required.' });
    await Slide.bulkWrite(req.body.ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order } } })));
    res.json({ message: 'Slide order updated.' });
  } catch (error) { next(error); }
});
adminRouter.patch('/slides/:id', upload.single('image'), async (req, res, next) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Slide not found.' });
    const previousPublicId = slide.cloudinaryPublicId;
    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      slide.image = result.secure_url; slide.cloudinaryPublicId = result.public_id;
    }
    for (const field of ['segment', 'eyebrow', 'title', 'copy', 'stat', 'statLabel']) {
      if (req.body[field] !== undefined) slide[field] = req.body[field];
    }
    if (req.body.active !== undefined) slide.active = req.body.active === 'true' || req.body.active === true;
    await slide.save();
    if (req.file) await deleteImage(previousPublicId);
    res.json(slide);
  } catch (error) { next(error); }
});
adminRouter.delete('/slides/:id', async (req, res, next) => {
  try {
    const slide = await Slide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Slide not found.' });
    await deleteImage(slide.cloudinaryPublicId);
    res.json({ message: 'Slide deleted.' });
  } catch (error) { next(error); }
});

adminRouter.get('/news', async (_req, res, next) => {
  try { res.json(await NewsArticle.find().sort({ publishedAt: -1, createdAt: -1 })); }
  catch (error) { next(error); }
});

adminRouter.post('/news', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please choose a news image.' });
    const result = await uploadImage(req.file.buffer, 'texmaco-brochure/news');
    try {
      const article = await NewsArticle.create({
        headline: req.body.headline,
        gist: req.body.gist,
        sourceName: req.body.sourceName,
        sourceUrl: req.body.sourceUrl,
        publishedAt: req.body.publishedAt,
        active: req.body.active !== 'false',
        image: result.secure_url,
        cloudinaryPublicId: result.public_id,
      });
      res.status(201).json(article);
    } catch (error) { await deleteImage(result.public_id); throw error; }
  } catch (error) { next(error); }
});

adminRouter.patch('/news/:id', upload.single('image'), async (req, res, next) => {
  let uploadedPublicId = '';
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'News article not found.' });
    const previousPublicId = article.cloudinaryPublicId;
    if (req.file) {
      const result = await uploadImage(req.file.buffer, 'texmaco-brochure/news');
      uploadedPublicId = result.public_id;
      article.image = result.secure_url;
      article.cloudinaryPublicId = result.public_id;
    }
    for (const field of ['headline', 'gist', 'sourceName', 'sourceUrl', 'publishedAt']) {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    }
    if (req.body.active !== undefined) article.active = req.body.active === 'true' || req.body.active === true;
    await article.save();
    if (req.file) await deleteImage(previousPublicId);
    res.json(article);
  } catch (error) {
    if (uploadedPublicId) await deleteImage(uploadedPublicId).catch(() => {});
    next(error);
  }
});

adminRouter.delete('/news/:id', async (req, res, next) => {
  try {
    const article = await NewsArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'News article not found.' });
    await deleteImage(article.cloudinaryPublicId);
    res.json({ message: 'News article deleted.' });
  } catch (error) { next(error); }
});

adminRouter.get('/leads', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
    const search = String(req.query.search || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { verified: true, ...(search ? { $or: ['name','company','email','phone','domain'].map((key) => ({ [key]: new RegExp(search, 'i') })) } : {}) };
    const [items, total] = await Promise.all([
      Lead.find(query).sort({ lastLoginAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Lead.countDocuments(query),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) { next(error); }
});
