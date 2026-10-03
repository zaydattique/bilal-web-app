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
  'branding', 'typography', 'contact', 'socialMedia', 'policies', 'content', 'settings', 'seo', 'isActive',
];

const BRANDING_FIELDS = ['primaryColor', 'secondaryColor', 'accentColor', 'textDark', 'textLight', 'backgroundColor', 'borderColor'];
const TYPOGRAPHY_FIELDS = ['fontFamily', 'headingScale', 'lineHeight'];
const CONTACT_FIELDS = ['phone', 'email', 'address', 'city', 'country'];
const SOCIAL_FIELDS = ['facebook', 'instagram', 'twitter', 'whatsapp'];
const POLICY_FIELDS = ['termsUrl', 'privacyUrl', 'returnPolicy', 'warrantyClaim'];
const CONTENT_FIELDS = ['tagline', 'description', 'serviceArea', 'hours', 'footerText', 'requirements', 'trustPoints', 'howItWorks', 'heroSlides'];
const SETTINGS_FIELDS = [
  'currencySymbol', 'currencyCode', 'timezone', 'dateFormat', 'maxInstallments',
  'minDownPayment', 'enableOnlinePayment', 'enableGuestCheckout', 'showCustomerPortalLink',
];
const SEO_FIELDS = ['metaTitle', 'metaDescription', 'metaKeywords', 'ogImage'];
const ALLOWED_FONT_FAMILIES = ['Inter, sans-serif', 'DM Sans, sans-serif', 'system-ui, sans-serif', 'Arial, sans-serif', 'Georgia, serif'];

const populateMedia = (query) =>
  query
    .populate('logo.primary', 'publicUrl altText purpose width height')
    .populate('logo.light', 'publicUrl altText purpose width height')
    .populate('logo.dark', 'publicUrl altText purpose width height')
    .populate('logo.icon', 'publicUrl altText purpose width height')
    .populate('favicon', 'publicUrl altText purpose width height')
    .populate('heroBanners', 'publicUrl altText purpose width height')
    .populate('seo.ogImage', 'publicUrl altText purpose width height');

const assertPlainObject = (value, field) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error(`${field} must be an object`);
    error.statusCode = 400;
    throw error;
  }
};

const assertString = (value, field, max, { required = false } = {}) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') {
    const error = new Error(`${field} must be a string`);
    error.statusCode = 400;
    throw error;
  }
  const trimmed = value.trim();
  if (required && !trimmed) {
    const error = new Error(`${field} is required`);
    error.statusCode = 400;
    throw error;
  }
  if (trimmed.length > max) {
    const error = new Error(`${field} is too long`);
    error.statusCode = 400;
    throw error;
  }
  return trimmed;
};

const assertSafeUrl = (value, field, { allowRelative = false } = {}) => {
  if (value === undefined || value === '') return;
  const trimmed = assertString(value, field, 500);
  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    const error = new Error(`${field} must be an HTTP(S) URL`);
    error.statusCode = 400;
    throw error;
  }
  return trimmed;
};

const assertBoolean = (value, field) => {
  if (value !== undefined && typeof value !== 'boolean') {
    const error = new Error(`${field} must be boolean`);
    error.statusCode = 400;
    throw error;
  }
};

const assertNumber = (value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    const error = new Error(`${field} is invalid`);
    error.statusCode = 400;
    throw error;
  }
  return number;
};

const assertStringArray = (value, field, { maxItems, maxLength }) => {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > maxItems) {
    const error = new Error(`${field} must contain at most ${maxItems} items`);
    error.statusCode = 400;
    throw error;
  }
  value.forEach((item, index) => assertString(item, `${field}[${index}]`, maxLength, { required: true }));
};

const validateNested = (body) => {
  for (const [field, allowed] of [
    ['branding', BRANDING_FIELDS],
    ['typography', TYPOGRAPHY_FIELDS],
    ['contact', CONTACT_FIELDS],
    ['socialMedia', SOCIAL_FIELDS],
    ['policies', POLICY_FIELDS],
    ['content', CONTENT_FIELDS],
    ['settings', SETTINGS_FIELDS],
    ['seo', SEO_FIELDS],
  ]) {
    if (body[field] !== undefined) {
      assertPlainObject(body[field], field);
      assertAllowedFields(body[field], allowed);
    }
  }

  if (body.branding) {
    for (const key of BRANDING_FIELDS) assertString(body.branding[key], `branding.${key}`, 100);
  }

  if (body.typography) {
    if (body.typography.fontFamily !== undefined && !ALLOWED_FONT_FAMILIES.includes(body.typography.fontFamily)) {
      const error = new Error('Unsupported font family');
      error.statusCode = 400;
      throw error;
    }
    assertNumber(body.typography.headingScale, 'typography.headingScale', { min: 0.8, max: 2 });
    assertNumber(body.typography.lineHeight, 'typography.lineHeight', { min: 1, max: 2.5 });
  }

  if (body.contact) {
    for (const key of CONTACT_FIELDS) assertString(body.contact[key], `contact.${key}`, 500);
  }

  if (body.socialMedia) {
    for (const key of ['facebook', 'instagram', 'twitter']) {
      assertSafeUrl(body.socialMedia[key], `socialMedia.${key}`);
    }
    if (body.socialMedia.whatsapp !== undefined) {
      const whatsapp = assertString(body.socialMedia.whatsapp, 'socialMedia.whatsapp', 40);
      if (!/^\\+?[0-9 ()-]{7,30}$/.test(whatsapp)) {
        assertSafeUrl(whatsapp, 'socialMedia.whatsapp');
      }
    }
  }

  if (body.policies) {
    assertSafeUrl(body.policies.termsUrl, 'policies.termsUrl');
    assertSafeUrl(body.policies.privacyUrl, 'policies.privacyUrl');
    assertString(body.policies.returnPolicy, 'policies.returnPolicy', 10000);
    assertString(body.policies.warrantyClaim, 'policies.warrantyClaim', 10000);
  }

  if (body.content) {
    for (const key of ['tagline', 'description', 'serviceArea', 'hours', 'footerText']) {
      assertString(body.content[key], `content.${key}`, key === 'description' ? 2000 : key === 'footerText' ? 1000 : 500);
    }
    assertStringArray(body.content.requirements, 'content.requirements', { maxItems: 12, maxLength: 300 });
    assertStringArray(body.content.trustPoints, 'content.trustPoints', { maxItems: 12, maxLength: 300 });

    for (const key of ['howItWorks', 'heroSlides']) {
      if (body.content[key] === undefined) continue;
      if (!Array.isArray(body.content[key]) || body.content[key].length > 8) {
        const error = new Error(`content.${key} must contain at most 8 items`);
        error.statusCode = 400;
        throw error;
      }
      body.content[key].forEach((item, index) => {
        assertPlainObject(item, `content.${key}[${index}]`);
        const fields = key === 'howItWorks'
          ? ['step', 'title', 'description']
          : ['title', 'subtitle', 'cta', 'href'];
        assertAllowedFields(item, fields);
        fields.forEach((field) => field === 'href'
          ? assertSafeUrl(item[field], `content.${key}[${index}].href`, { allowRelative: true })
          : assertString(item[field], `content.${key}[${index}].${field}`, field === 'description' || field === 'subtitle' ? 300 : 120, { required: true }));
      });
    }
  }

  if (body.settings) {
    assertString(body.settings.currencySymbol, 'settings.currencySymbol', 12);
    assertString(body.settings.currencyCode, 'settings.currencyCode', 3);
    assertString(body.settings.timezone, 'settings.timezone', 80);
    assertString(body.settings.dateFormat, 'settings.dateFormat', 40);
    assertNumber(body.settings.maxInstallments, 'settings.maxInstallments', { min: 1, max: 60 });
    assertNumber(body.settings.minDownPayment, 'settings.minDownPayment', { min: 0, max: 100 });
    for (const key of ['enableOnlinePayment', 'enableGuestCheckout', 'showCustomerPortalLink']) {
      assertBoolean(body.settings[key], `settings.${key}`);
    }
  }

  if (body.seo) {
    assertString(body.seo.metaTitle, 'seo.metaTitle', 160);
    assertString(body.seo.metaDescription, 'seo.metaDescription', 320);
    assertStringArray(body.seo.metaKeywords, 'seo.metaKeywords', { maxItems: 20, maxLength: 80 });
  }

  if (body.businessName !== undefined) assertString(body.businessName, 'businessName', 160, { required: true });
  if (body.businessType !== undefined && !['installment_sales', 'retail', 'services'].includes(body.businessType)) {
    const error = new Error('Invalid businessType');
    error.statusCode = 400;
    throw error;
  }
  if (body.isActive !== undefined) assertBoolean(body.isActive, 'isActive');
};

const validateBusinessMedia = async (businessId, body) => {
  if (body.logo !== undefined) {
    assertPlainObject(body.logo, 'logo');
    assertAllowedFields(body.logo, ['primary', 'light', 'dark', 'icon']);
    for (const key of ['primary', 'light', 'dark', 'icon']) {
      if (body.logo[key] !== undefined) {
        body.logo[key] = await resolveSingleMediaId(body.logo[key], businessId, `logo.${key}`);
      }
    }
  }

  if (body.favicon !== undefined) body.favicon = await resolveSingleMediaId(body.favicon, businessId, 'favicon');
  if (body.heroBanners !== undefined) body.heroBanners = await resolveMediaIds(body.heroBanners, businessId, 'heroBanners');
  if (body.seo?.ogImage !== undefined) body.seo.ogImage = await resolveSingleMediaId(body.seo.ogImage, businessId, 'seo.ogImage');
};

const toPublicBusiness = (business) => ({
  _id: business._id,
  businessName: business.businessName,
  businessSlug: business.businessSlug,
  businessType: business.businessType,
  logo: business.logo,
  favicon: business.favicon,
  heroBanners: business.heroBanners,
  branding: business.branding,
  typography: business.typography,
  contact: business.contact,
  socialMedia: business.socialMedia,
  policies: business.policies,
  content: business.content,
  settings: {
    currencySymbol: business.settings?.currencySymbol,
    currencyCode: business.settings?.currencyCode,
    timezone: business.settings?.timezone,
    dateFormat: business.settings?.dateFormat,
    maxInstallments: business.settings?.maxInstallments,
    minDownPayment: business.settings?.minDownPayment,
    showCustomerPortalLink: business.settings?.showCustomerPortalLink,
  },
  seo: {
    metaTitle: business.seo?.metaTitle,
    metaDescription: business.seo?.metaDescription,
    metaKeywords: business.seo?.metaKeywords,
    ogImage: business.seo?.ogImage,
  },
});

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const business = await populateMedia(Business.findOne({ _id: req.businessId, isActive: true }));
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
    res.json({ success: true, business: toPublicBusiness(business) });
  } catch (error) { next(error); }
});

router.put('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, BUSINESS_FIELDS);
    validateNested(req.body);

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
      changes[key] = { updated: true };
      if (
        typeof req.body[key] === 'object' &&
        req.body[key] !== null &&
        !Array.isArray(req.body[key]) &&
        business[key]
      ) {
        business[key] = { ...(business[key].toObject?.() ?? business[key]), ...req.body[key] };
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
        changes.businessSlug = { updated: true };
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
