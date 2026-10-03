import express from 'express';
import slugify from 'slugify';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, resolvePublicBusiness } from '../middleware/security.js';
import { resolveSingleMediaId } from '../utils/mediaReferences.js';

const router = express.Router();

const FIELDS = ['name', 'slug', 'description', 'image', 'order', 'status', 'customFields', 'faqs', 'seo', 'aeo', 'geo'];
const STATUSES = ['draft', 'published', 'archived'];
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const getBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  const business = await resolvePublicBusiness(req.query.businessId);
  return business._id;
};

const populate = (query) => query.populate('image', 'publicUrl altText width height purpose');

const cleanString = (value, field, max, required = false) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw error(`${field} is invalid`);
  const trimmed = value.trim();
  if (required && !trimmed) throw error(`${field} is required`);
  if (trimmed.length > max) throw error(`${field} is too long`);
  return trimmed;
};

const normalizeFaqs = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) throw error('faqs is invalid');
  return value.map((faq) => {
    if (!faq || typeof faq !== 'object' || Array.isArray(faq)) throw error('Each FAQ must be an object');
    assertAllowedFields(faq, ['question', 'answer']);
    return {
      question: cleanString(faq.question, 'FAQ question', 300, true),
      answer: cleanString(faq.answer, 'FAQ answer', 2000, true),
    };
  });
};

const normalizeStringArray = (value, field, maxItems, maxLength) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) throw error(`${field} is invalid`);
  return value.map((item) => cleanString(item, field, maxLength, true));
};

const normalizeCustomFields = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 30) throw error('customFields is invalid');
  const keys = new Set();
  return value.map((field) => {
    if (!field || typeof field !== 'object' || Array.isArray(field)) throw error('Each custom field must be an object');
    assertAllowedFields(field, ['key', 'label', 'type', 'required', 'options']);
    const key = slugify(String(field.key || ''), { lower: true, strict: true }).slice(0, 80);
    const label = cleanString(field.label, 'custom field label', 120, true);
    if (!key || keys.has(key)) throw error('Custom field keys must be unique');
    keys.add(key);
    const type = field.type;
    if (!['text', 'number', 'date', 'select'].includes(type)) throw error(`Custom field ${key} has an invalid type`);
    const options = field.options === undefined ? [] : normalizeStringArray(field.options, `custom field ${key} options`, 50, 120);
    if (type === 'select' && !options.length) throw error(`Select field ${key} needs options`);
    if (type !== 'select' && options.length) throw error(`Only select field ${key} can have options`);
    return { key, label, type, required: field.required === true, options };
  });
};

const normalizeSeo = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('seo is invalid');
  assertAllowedFields(value, ['title', 'description', 'keywords']);
  return {
    title: cleanString(value.title || '', 'seo.title', 70),
    description: cleanString(value.description || '', 'seo.description', 170),
    keywords: normalizeStringArray(value.keywords || [], 'seo.keywords', 20, 80),
  };
};

const normalizeAeo = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('aeo is invalid');
  assertAllowedFields(value, ['summary', 'keyFacts']);
  return {
    summary: cleanString(value.summary || '', 'aeo.summary', 1000),
    keyFacts: normalizeStringArray(value.keyFacts || [], 'aeo.keyFacts', 20, 300),
  };
};

const normalizeGeo = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('geo is invalid');
  assertAllowedFields(value, ['intent', 'localNotes']);
  return {
    intent: cleanString(value.intent || '', 'geo.intent', 200),
    localNotes: cleanString(value.localNotes || '', 'geo.localNotes', 1000),
  };
};

const normalizeStatus = (value) => {
  const status = value || 'draft';
  if (!STATUSES.includes(status)) throw error('status is invalid');
  return status;
};

const validatePublish = (data) => {
  if (data.status !== 'published') return;
  const missing = [];
  if (!data.name || !data.description) missing.push('description');
  if (!data.seo?.title || !data.seo?.description) missing.push('SEO title and description');
  if (!data.aeo?.summary) missing.push('AEO summary');
  if (missing.length) throw error(`Cannot publish: missing ${missing.join(', ')}`);
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const filter = { businessId };
    if (!req.admin) filter.status = 'published';
    else if (req.query.status && req.query.status !== 'all') filter.status = normalizeStatus(String(req.query.status));
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      if (search) filter.name = { $regex: search.replace(/[.*+?^$()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const categories = await populate(Category.find(filter).sort({ order: 1, name: 1 }).limit(limit));
    res.json({ success: true, categories });
  } catch (err) { next(err); }
});

router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const value = String(req.params.idOrSlug).toLowerCase();
    const filter = { businessId };
    if (!req.admin) filter.status = 'published';
    if (/^[0-9a-f]{24}$/.test(value)) filter._id = requireObjectId(value, 'category id');
    else filter.slug = value;
    const category = await populate(Category.findOne(filter));
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) { next(err); }
});

const buildData = async (body, businessId, existing = null) => {
  const status = normalizeStatus(body.status !== undefined ? body.status : existing?.status);
  const name = body.name !== undefined ? cleanString(body.name, 'name', 120, true) : existing?.name;
  const slug = body.slug !== undefined || body.name !== undefined
    ? slugify(String(body.slug || body.name || ''), { lower: true, strict: true }).slice(0, 160)
    : existing?.slug;
  if (!slug) throw error('A valid slug is required');
  const data = {
    name,
    slug,
    description: body.description !== undefined ? cleanString(body.description, 'description', 2000) : existing?.description,
    image: body.image !== undefined ? await resolveSingleMediaId(body.image, businessId, 'image') : existing?.image,
    order: body.order !== undefined ? Number(body.order) : existing?.order,
    status,
    customFields: body.customFields !== undefined ? normalizeCustomFields(body.customFields) : existing?.customFields,
    faqs: body.faqs !== undefined ? normalizeFaqs(body.faqs) : existing?.faqs,
    seo: body.seo !== undefined ? normalizeSeo(body.seo) : existing?.seo,
    aeo: body.aeo !== undefined ? normalizeAeo(body.aeo) : existing?.aeo,
    geo: body.geo !== undefined ? normalizeGeo(body.geo) : existing?.geo,
  };
  if (!Number.isInteger(data.order) || data.order < 0 || data.order > 100000) throw error('order is invalid');
  validatePublish(data);
  return data;
};

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, FIELDS);
    const data = await buildData(req.body, req.businessId);
    const exists = await Category.exists({ businessId: req.businessId, slug: data.slug });
    if (exists) throw error('Category slug already exists', 409);
    const category = await Category.create({ businessId: req.businessId, ...data });
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'create', entityType: 'category', entityId: category._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json({ success: true, category: await populate(Category.findById(category._id)) });
  } catch (err) { next(err); }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, FIELDS);
    const id = requireObjectId(req.params.id, 'category id');
    const category = await Category.findOne({ _id: id, businessId: req.businessId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    const data = await buildData(req.body, req.businessId, category);
    if (data.slug !== category.slug) {
      const duplicate = await Category.exists({ businessId: req.businessId, slug: data.slug, _id: { $ne: id } });
      if (duplicate) throw error('Category slug already exists', 409);
    }
    Object.assign(category, data);
    await category.save();
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'update', entityType: 'category', entityId: id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, category: await populate(Category.findById(id)) });
  } catch (err) { next(err); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const id = requireObjectId(req.params.id, 'category id');
    const category = await Category.findOne({ _id: id, businessId: req.businessId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const inUse = await Product.exists({
      businessId: req.businessId,
      categoryId: id,
      status: { $in: ['published', 'scheduled'] },
    });
    if (inUse) throw error('Cannot archive a category used by published or scheduled products', 409);

    category.status = 'archived';
    await category.save();
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'archive', entityType: 'category', entityId: id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, category });
  } catch (err) { next(err); }
});

export default router;
