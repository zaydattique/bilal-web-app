import express from 'express';
import slugify from 'slugify';
import Business from '../models/Business.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireString } from '../middleware/security.js';
import { resolveMediaIds, resolveSingleMediaId } from '../utils/mediaReferences.js';

const router = express.Router();

const BUSINESS_FIELDS = [
  'businessName', 'businessType', 'businessSlug', 'logo', 'favicon', 'heroBanners',
  'branding', 'typography', 'contact', 'socialMedia', 'policies', 'settings', 'seo', 'isActive',
];

const populateMedia = (query) =>
  query
    .populate('logo.primary', 'publicUrl altText purpose width height')
    .populate('logo.light', 'publicUrl altText purpose width height')
    .populate('logo.dark', 'publicUrl altText purpose width height')
    .populate('logo.icon', 'publicUrl altText purpose width height')
    .populate('favicon', 'publicUrl altText purpose width height')
    .populate('heroBanners', 'publicUrl altText purpose width height')
    .populate('seo.ogImage', 'publicUrl altText purpose width height');

const validateBusinessMedia = async (businessId, body) => {
  const logo = body.logo;
  if (logo !== undefined) {
    if (!logo || typeof logo !== 'object' || Array.isArray(logo)) {
      const error = new Error('logo must be an object');
      error.statusCode = 400;
      throw error;
    }
    for (const key of ['primary', 'light', 'dark', 'icon']) {
      if (logo[key] !== undefined) {
        logo[key] = await resolveSingleMediaId(logo[key], businessId, `logo.${key}`);
      }
    }
  }

  if (body.favicon !== undefined) {
    body.favicon = await resolveSingleMediaId(body.favicon, businessId, 'favicon');
  }

  if (body.heroBanners !== undefined) {
    body.heroBanners = await resolveMediaIds(body.heroBanners, businessId, 'heroBanners');
  }

  if (body.seo?.ogImage !== undefined) {
    body.seo.ogImage = await resolveSingleMediaId(body.seo.ogImage, businessId, 'seo.ogImage');
  }
};

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const business = await populateMedia(
      Business.findOne({ _id: req.businessId, isActive: true })
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (error) { next(error); }
});

router.get('/public/:slug', async (req, res, next) => {
  try {
    const slug = requireString(req.params.slug, 'business slug', { max: 120 }).toLowerCase();
    const business = await populateMedia(
      Business.findOne({ businessSlug: slug, isActive: true }).select('-__v')
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (error) { next(error); }
});

router.put('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, BUSINESS_FIELDS);
    const business = await Business.findOne({ _id: req.businessId, isActive: true });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    if (req.body.isActive !== undefined && req.admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can change business activation' });
    }
    if (req.body.businessSlug !== undefined && req.admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can change business slug' });
    }

    await validateBusinessMedia(req.businessId, req.body);

    const changes = {};
    for (const key of BUSINESS_FIELDS) {
      if (req.body[key] === undefined || key === 'businessSlug') continue;
      changes[key] = { from: business[key], to: req.body[key] };
      if (
        typeof req.body[key] === 'object' &&
        req.body[key] !== null &&
        !Array.isArray(req.body[key]) &&
        business[key]
      ) {
        business[key] = { ...business[key].toObject?.() ?? business[key], ...req.body[key] };
      } else {
        business[key] = req.body[key];
      }
    }

    if (req.body.businessSlug !== undefined) {
      const newSlug = slugify(requireString(req.body.businessSlug, 'businessSlug', { max: 120 }), {
        lower: true,
        strict: true,
      });
      if (!newSlug) return res.status(400).json({ success: false, message: 'Invalid business slug' });
      if (newSlug !== business.businessSlug) {
        const exists = await Business.findOne({ businessSlug: newSlug, _id: { $ne: business._id } });
        if (exists) return res.status(409).json({ success: false, message: 'Slug already in use' });
        changes.businessSlug = { from: business.businessSlug, to: newSlug };
        business.businessSlug = newSlug;
      }
    }

    await business.save();
    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'business',
      entityId: business._id,
      changes,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const saved = await populateMedia(Business.findById(business._id));
    res.json({ success: true, business: saved });
  } catch (error) { next(error); }
});

export default router;
