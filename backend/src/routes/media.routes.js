import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Media from '../models/Media.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Business from '../models/Business.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { requireObjectId, requireString } from '../middleware/security.js';
import { deleteObject, uploadObject, assertStorageConfigured } from '../utils/mediaStorage.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PURPOSES = new Set([
  'general',
  'logo',
  'logo_light',
  'logo_dark',
  'logo_icon',
  'favicon',
  'og_image',
  'product',
  'category',
  'banner',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached. Try again later.' },
  keyGenerator: (req) => String(req.admin._id),
});

const detectFormat = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (['avif', 'avis'].includes(brand)) return { mimeType: 'image/avif', extension: 'avif' };
  }
  return null;
};

const parseFile = async (file) => {
  if (!file?.buffer?.length) {
    const error = new Error('Image file is required');
    error.statusCode = 400;
    throw error;
  }

  const detected = detectFormat(file.buffer);
  if (!detected) {
    const error = new Error('Unsupported image format. Use JPEG, PNG, WebP, or AVIF.');
    error.statusCode = 400;
    throw error;
  }

  const metadata = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.width || !metadata.height) {
    const error = new Error('Image dimensions could not be read');
    error.statusCode = 400;
    throw error;
  }

  if (metadata.width < 16 || metadata.height < 16) {
    const error = new Error('Image is too small');
    error.statusCode = 400;
    throw error;
  }

  return { ...detected, width: metadata.width, height: metadata.height };
};

const normalizePurpose = (value) => {
  const purpose = requireString(value || 'general', 'purpose', { max: 30 });
  if (!ALLOWED_PURPOSES.has(purpose)) {
    const error = new Error('Invalid media purpose');
    error.statusCode = 400;
    throw error;
  }
  return purpose;
};

const getReferencedMediaIds = async (businessId, mediaId) => {
  const [business, product, category] = await Promise.all([
    Business.exists({
      _id: businessId,
      $or: [
        { 'logo.primary': mediaId },
        { 'logo.light': mediaId },
        { 'logo.dark': mediaId },
        { 'logo.icon': mediaId },
        { favicon: mediaId },
        { 'seo.ogImage': mediaId },
        { heroBanners: mediaId },
      ],
    }),
    Product.exists({ businessId, images: mediaId }),
    Category.exists({ businessId, image: mediaId }),
  ]);
  return Boolean(business || product || category);
};

const removeStoredMedia = async (media) => {
  try {
    await deleteObject(media.storageKey);
  } catch {
    // Keep the DB record if storage deletion fails so the asset can be retried.
    const error = new Error('Storage deletion failed');
    error.statusCode = 502;
    throw error;
  }
};

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const filter = { businessId: req.businessId, isActive: true };
    if (req.query.purpose) filter.purpose = normalizePurpose(req.query.purpose);

    const [media, total] = await Promise.all([
      Media.find(filter)
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Media.countDocuments(filter),
    ]);

    res.json({
      success: true,
      media,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  protectAdmin,
  requireRole('super_admin', 'admin', 'manager'),
  uploadLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 10 MB limit' : 'Invalid upload';
        return res.status(400).json({ success: false, message });
      }
      if (error) return next(error);
      next();
    });
  },
  async (req, res, next) => {
    try {
      assertStorageConfigured();
      const meta = await parseFile(req.file);
      const purpose = normalizePurpose(req.body.purpose);
      const altText = req.body.altText ? requireString(req.body.altText, 'altText', { max: 300 }) : '';

      const originalName = requireString(req.file.originalname || 'image', 'filename', { max: 255 });
      const digest = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const key = `${req.businessId}/${purpose}/${uuidv4()}-${digest.slice(0, 16)}.${meta.extension}`;
      const publicUrl = await uploadObject({
        key,
        body: req.file.buffer,
        contentType: meta.mimeType,
        sizeBytes: req.file.size,
      });

      let media;
      try {
        media = await Media.create({
          businessId: req.businessId,
          storageKey: key,
          publicUrl,
          originalName,
          mimeType: meta.mimeType,
          extension: meta.extension,
          sizeBytes: req.file.size,
          width: meta.width,
          height: meta.height,
          altText,
          purpose,
          uploadedBy: req.admin._id,
        });
      } catch (error) {
        try { await deleteObject(key); } catch {}
        throw error;
      }

      await logAction({
        businessId: req.businessId,
        adminId: req.admin._id,
        action: 'create',
        entityType: 'media',
        entityId: media._id,
        changes: { purpose, originalName, sizeBytes: req.file.size },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ success: true, media });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  protectAdmin,
  requireRole('super_admin', 'admin', 'manager'),
  uploadLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 10 MB limit' : 'Invalid upload';
        return res.status(400).json({ success: false, message });
      }
      if (error) return next(error);
      next();
    });
  },
  async (req, res, next) => {
    try {
      assertStorageConfigured();
      const mediaId = requireObjectId(req.params.id, 'media id');
      const media = await Media.findOne({ _id: mediaId, businessId: req.businessId, isActive: true });
      if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

      const changes = {};
      if (req.file) {
        const meta = await parseFile(req.file);
        const digest = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const key = `${req.businessId}/${media.purpose}/${uuidv4()}-${digest.slice(0, 16)}.${meta.extension}`;
        const publicUrl = await uploadObject({
          key,
          body: req.file.buffer,
          contentType: meta.mimeType,
          sizeBytes: req.file.size,
        });

        const oldKey = media.storageKey;
        media.storageKey = key;
        media.publicUrl = publicUrl;
        media.originalName = requireString(req.file.originalname || 'image', 'filename', { max: 255 });
        media.mimeType = meta.mimeType;
        media.extension = meta.extension;
        media.sizeBytes = req.file.size;
        media.width = meta.width;
        media.height = meta.height;
        changes.replaced = true;

        try {
          await deleteObject(oldKey);
        } catch {
          try { await deleteObject(key); } catch {}
          throw new Error('Previous media could not be removed; replacement cancelled');
        }
      }

      if (req.body.altText !== undefined) {
        media.altText = requireString(req.body.altText, 'altText', { max: 300, min: 0 });
        changes.altText = media.altText;
      }

      await media.save();
      await logAction({
        businessId: req.businessId,
        adminId: req.admin._id,
        action: 'update',
        entityType: 'media',
        entityId: media._id,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, media });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const mediaId = requireObjectId(req.params.id, 'media id');
    const media = await Media.findOne({ _id: mediaId, businessId: req.businessId, isActive: true });
    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

    if (await getReferencedMediaIds(req.businessId, mediaId)) {
      return res.status(409).json({ success: false, message: 'Media is still assigned to business, product, or category content' });
    }

    await removeStoredMedia(media);
    media.isActive = false;
    media.archivedAt = new Date();
    await media.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'delete',
      entityType: 'media',
      entityId: media._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Media deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
