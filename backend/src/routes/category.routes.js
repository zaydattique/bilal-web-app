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
const MAX = { fields: 30, faqs: 20, keywords: 20, facts: 20 };
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const getBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  return (await resolvePublicBusiness(req.query.businessId))._id;
};

const populate = (query) => query.populate('image', 'publicUrl altText width height purpose');

const cleanString = (value, field, max, required = false) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw error(`${field} is invalid`);
  const result = value.trim();
  if (required && !result) throw error(`${field} is required`);
  if (result.length > max) throw error(`${field} is too long`);
  return result;
};

const normalizeStringArray = (value, field, maxItems, maxLength) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) throw error(`${field} is invalid`);
  return value.map((item) => cleanString(item, field, maxLength, true));
};

const normalizeFaqs = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX.faqs) throw error('faqs is invalid');
  return value.map((faq) => {
    if (!faq || typeof faq !== 'object' || Array.isArray(faq)) throw error('Each FAQ must be an object');
    assertAllowedFields(faq, ['question', 'answer']);
    return {
      question: cleanString(faq.question, 'FAQ question', 300, true),
      answer: cleanString(faq.answer, 'FAQ answer', 2000, true),
    };
  });
};

const normalizeSeo = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('seo is invalid');
  assertAllowedFields(value, ['title', 'description', 'keywords']);
  return {
    title: cleanString(value.title || '', 'seo.title', 70),
    description: cleanString(value.description || '', 'seo.description', 170),
    keywords: normalizeStringArray(value.keywords || [], 'seo.keywords', MAX.keywords, 80),
  };
};

const normalizeAeo = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('aeo is invalid');
  assertAllowedFields(value, ['summary', 'keyFacts']);
  return {
    summary: cleanString(value.summary || '', 'aeo.summary', 1000),
    keyFacts: normalizeStringArray(value.keyFacts || [], 'aeo.keyFacts', MAX.facts, 300),
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

const normalizeCustomFields = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX.fields) throw error('customFields is invalid');

  const keys = new Set();
  return value.map((field) => {
    if (!field || typeof field !== 'object' || Array.isArray(field)) throw error('Each custom field must be an object');
    assertAllowedFields(field, ['key', 'label', 'type', 'required', 'options']);

    const key = slugify(String(field.key || ''), { lower: true, strict: true }).slice(0, 80);
    if (!key || keys.has(key)) throw error('Custom field keys must be unique');
    keys.add(key);

    const label = cleanString(field.label, 'custom field label', 120, true);
    const type = field.type;
    if (!['text', 'number', 'date', 'select'].includes(type)) throw error(`Custom field ${key} has an invalid type`);

    const options = field.options === undefined
      ? []
      : normalizeStringArray(field.options, `custom field ${key} options`, 50, 120);

    if (type === 'select' && options.length === 0) throw error(`Select field ${key} needs options`);
    if (type !== 'select' && options.length > 0) throw error(`Only select field ${key} can have options`);

    return { key, label, type, required: field.required === true, options };
  });
};

const validatePublish = (data) => {
  if (data.status !== 'published') return;
  const missing = [];
  if (!data.name || !data.description) missing.push('description');
  if (!data.seo?.title || !data.seo?.description) missing.push('SEO title and description');
  if (!data.aeo?.summary) missing.push('AEO summary');
  if (missing.length) throw error(`Cannot publish: missing ${missing.join(', ')}`);
};

const validateProductsAgainstFields = async (businessId, categoryId, fields) => {
  const products = await Product.find({
    businessId,
    categoryId,
    status: { $in: ['published', 'scheduled'] },
  }).select('_id name customFieldValues').lean();

  const definitions = new Map(fields.map((field) => [field.key, field]));
  for (const product of products) {
    const values = product.customFieldValues || [];
    const keys = new Set(values.map((value) => value.key));

    for (const value of values) {
      const definition = definitions.get(value.key);
      if (!definition) {
        throw error(`Cannot change category fields: published product "${product.name}" uses removed field "${value.key}"`, 409);
      }
      if (definition.type === 'number' && !Number.isFinite(Number(value.value))) {
        throw error(`Cannot change category fields: published product "${product.name}" has invalid numeric value for "${value.key}"`, 409);
      }
      if (definition.type === 'date' && Number.isNaN(Date.parse(value.value))) {
        throw error(`Cannot change category fields: published product "${product.name}" has invalid date for "${value.key}"`, 409);
      }
      if (definition.type === 'select' && !definition.options.includes(value.value)) {
        throw error(`Cannot change category fields: published product "${product.name}" has an invalid option for "${value.key}"`, 409);
      }
    }

    for (const field of fields) {
      if (field.required && !keys.has(field.key)) {
        throw error(`Cannot change category fields: published product "${product.name}" is missing required field "${field.label}"`, 409);
      }
    }
  }
};

const buildData = async (body, businessId, existing = null) => {
  const status = body.status !== undefined ? body.status : (existing?.status || 'draft');
  if (!STATUSES.includes(status)) throw error('status is invalid');

  const name = body.name !== undefined
    ? cleanString(body.name, 'name', 120, true)
    : existing?.name;

  const slug = body.slug !== undefined || body.name !== undefined
    ? slugify(String(body.slug || body.name || ''), { lower: true, strict: true }).slice(0, 160)
    : existing?.slug;

  if (!slug) throw error('A valid slug is required');

  const customFields = body.customFields !== undefined
    ? normalizeCustomFields(body.customFields)
    : (existing?.customFields || []);

  const data = {
    name,
    slug,
    description: body.description !== undefined ? cleanString(body.description, 'description', 2000) : existing?.description,
    image: body.image !== undefined ? await resolveSingleMediaId(body.image, businessId, 'image') : existing?.image,
    order: body.order !== undefined ? Number(body.order) : existing?.order,
    status,
    customFields,
    faqs: body.faqs !== undefined ? normalizeFaqs(body.faqs) : existing?.faqs,
    seo: body.seo !== undefined ? normalizeSeo(body.seo) : existing?.seo,
    aeo: body.aeo !== undefined ? normalizeAeo(body.aeo) : existing?.aeo,
    geo: body.geo !== undefined ? normalizeGeo(body.geo) : existing?.geo,
  };

  if (!Number.isInteger(data.order) || data.order < 0 || data.order > 100000) throw error('order is invalid');
  validatePublish(data);
  return data;
};

const duplicateKey = (err) => err?.code === 11000;

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const filter = { businessId };

    if (!req.admin) {
      filter.status = 'published';
    } else if (req.query.status && req.query.status !== 'all') {
      if (!STATUSES.includes(String(req.query.status))) throw error('status is invalid');
      filter.status = String(req.query.status);
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      if (search) {
        const escaped = search.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
        filter.name = { $regex: escaped, $options: 'i' };
      }
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      populate(Category.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(limit)),
      Category.countDocuments(filter),
    ]);

    res.json({ success: true, categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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

    let category = await populate(Category.findOne(filter));
    if (!category && !req.admin && !/^[0-9a-f]{24}$/.test(value)) {
      category = await populate(Category.findOne({
        businessId,
        historicalSlugs: value,
        status: 'published',
      }));
      if (category) {
        res.set('Location', `/categories/${category.slug}`);
        return res.status(301).end();
      }
    }
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    res.json({ success: true, category });
  } catch (err) { next(err); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, FIELDS);
    const data = await buildData(req.body, req.businessId);

    const category = await Category.create({ businessId: req.businessId, ...data });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'category',
      entityId: category._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, category: await populate(Category.findById(category._id)) });
  } catch (err) {
    if (duplicateKey(err)) return res.status(409).json({ success: false, message: 'Category slug already exists' });
    next(err);
  }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, FIELDS);
    const id = requireObjectId(req.params.id, 'category id');
    const category = await Category.findOne({ _id: id, businessId: req.businessId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const data = await buildData(req.body, req.businessId, category);
    const reservedSlug = await Category.exists({
      businessId: req.businessId,
      historicalSlugs: data.slug,
      _id: { $ne: id },
    });
    if (reservedSlug) throw error('Category slug is reserved by a previous category URL', 409);
    if (data.slug !== category.slug) {
      const duplicate = await Category.exists({
        businessId: req.businessId,
        $or: [
          { slug: data.slug },
          { historicalSlugs: data.slug },
        ],
        _id: { $ne: id },
      });
      if (duplicate) throw error('Category slug is already in use or reserved by a previous category URL', 409);
    }

    if (req.body.customFields !== undefined) {
      const fieldsChanged = JSON.stringify(data.customFields) !== JSON.stringify(category.customFields || []);
      if (fieldsChanged) await validateProductsAgainstFields(req.businessId, id, data.customFields);
    }

    if (data.slug !== category.slug) {
      const historicalSlugs = new Set(category.historicalSlugs || []);
      historicalSlugs.add(category.slug);
      historicalSlugs.delete(data.slug);
      category.historicalSlugs = [...historicalSlugs];
    }

    Object.assign(category, data);
    await category.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'category',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, category: await populate(Category.findById(id)) });
  } catch (err) {
    if (duplicateKey(err)) return res.status(409).json({ success: false, message: 'Category slug already exists' });
    next(err);
  }
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

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'archive',
      entityType: 'category',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, category });
  } catch (err) { next(err); }
});

export default router;
