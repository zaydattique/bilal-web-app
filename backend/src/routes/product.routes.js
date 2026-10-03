import express from 'express';
import slugify from 'slugify';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import ProductSlugRedirect from '../models/ProductSlugRedirect.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, requireNonNegativeNumber, resolvePublicBusiness } from '../middleware/security.js';
import { resolveMediaIds } from '../utils/mediaReferences.js';

const router = express.Router();

const PRODUCT_FIELDS = [
  'name', 'slug', 'sku', 'brand', 'shortDescription', 'description', 'cashPrice', 'discountPrice',
  'categoryId', 'media', 'customFieldValues', 'inventory', 'installment', 'specs', 'faqs', 'seo', 'aeo', 'geo',
  'status', 'scheduledAt', 'featured',
];
const STATUS = ['draft', 'published', 'scheduled', 'archived'];
const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];
const MAX = { faqs: 20, media: 20, facts: 20, keywords: 20 };

const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const publicStatusFilter = () => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', scheduledAt: { $lte: new Date() } },
  ],
});

const getBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  const business = await resolvePublicBusiness(req.query.businessId);
  return business._id;
};

const populate = (query) => query
  .populate('categoryId', 'name slug description')
  .populate('media', 'publicUrl altText width height purpose');

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

const normalizeStringArray = (value, field, maxItems, maxLength) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) throw error(`${field} is invalid`);
  return value.map((item) => cleanString(item, field, maxLength, true));
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
  assertAllowedFields(value, ['summary', 'keyFacts', 'buyingIntent']);
  return {
    summary: cleanString(value.summary || '', 'aeo.summary', 1000),
    keyFacts: normalizeStringArray(value.keyFacts || [], 'aeo.keyFacts', MAX.facts, 300),
    buyingIntent: cleanString(value.buyingIntent || '', 'aeo.buyingIntent', 300),
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

const normalizeSpecs = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('specs is invalid');
  assertAllowedFields(value, ['weight', 'dimensions']);
  const result = {};
  if (value.weight !== undefined && value.weight !== null) result.weight = requireNonNegativeNumber(value.weight, 'specs.weight');
  if (value.dimensions !== undefined && value.dimensions !== null) {
    if (typeof value.dimensions !== 'object' || Array.isArray(value.dimensions)) throw error('specs.dimensions is invalid');
    assertAllowedFields(value.dimensions, ['length', 'width', 'height']);
    result.dimensions = {};
    for (const key of ['length', 'width', 'height']) {
      if (value.dimensions[key] !== undefined && value.dimensions[key] !== null) {
        result.dimensions[key] = requireNonNegativeNumber(value.dimensions[key], `specs.dimensions.${key}`);
      }
    }
  }
  return result;
};

const normalizeInstallment = (value) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('installment is invalid');
  assertAllowedFields(value, ['advanceAmount', 'financedAmount', 'markupAmount', 'totalPayable', 'tenureMonths', 'installmentAmount', 'frequency']);
  const result = {};
  for (const key of ['advanceAmount', 'financedAmount', 'markupAmount', 'totalPayable', 'installmentAmount']) {
    result[key] = requireNonNegativeNumber(value[key] ?? 0, `installment.${key}`);
  }
  const tenure = Number(value.tenureMonths ?? 1);
  if (!Number.isInteger(tenure) || tenure < 1 || tenure > 120) throw error('installment.tenureMonths is invalid');
  result.tenureMonths = tenure;
  result.frequency = value.frequency || 'monthly';
  if (!FREQUENCIES.includes(result.frequency)) throw error('installment.frequency is invalid');
  return result;
};

const normalizeStatus = (value) => {
  const status = value || 'draft';
  if (!STATUS.includes(status)) throw error('status is invalid');
  return status;
};

const normalizeSchedule = (status, value) => {
  if (status !== 'scheduled') return null;
  if (!value) throw error('scheduledAt is required for scheduled products');
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= new Date()) throw error('scheduledAt must be a future date');
  return date;
};

const normalizeCategoryFields = (category, values) => {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > 50) throw error('customFieldValues is invalid');
  if (!category && values.length) throw error('Custom fields require a category');
  const definitions = new Map((category?.customFields || []).map((field) => [field.key, field]));
  const seen = new Set();
  const result = values.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw error('Each custom field value must be an object');
    assertAllowedFields(item, ['key', 'value']);
    const key = cleanString(item.key, 'custom field key', 80, true).toLowerCase();
    const rawValue = cleanString(item.value, `custom field ${key}`, 500, true);
    const definition = definitions.get(key);
    if (!definition || seen.has(key)) throw error('Invalid or duplicate custom field value');
    seen.add(key);
    if (definition.type === 'number' && !Number.isFinite(Number(rawValue))) throw error(`Custom field ${key} must be numeric`);
    if (definition.type === 'date' && Number.isNaN(Date.parse(rawValue))) throw error(`Custom field ${key} must be a valid date`);
    if (definition.type === 'select' && !definition.options.includes(rawValue)) throw error(`Custom field ${key} has an invalid option`);
    return { key, value: rawValue };
  });
  for (const field of category?.customFields || []) {
    if (field.required && !seen.has(field.key)) throw error(`Required custom field missing: ${field.label}`);
  }
  return result;
};

const validateCategory = async (categoryId, businessId) => {
  if (!categoryId) return null;
  const id = requireObjectId(categoryId, 'category id');
  const category = await Category.findOne({ _id: id, businessId }).select('name slug customFields status');
  if (!category) throw error('Category not found');
  return category;
};

const validatePublish = (data, category) => {
  if (!['published', 'scheduled'].includes(data.status)) return;
  const missing = [];
  if (!data.name || !data.shortDescription || !data.description) missing.push('product descriptions');
  if (data.cashPrice === undefined || data.cashPrice === null) missing.push('cash price');
  if (!data.categoryId || !category) missing.push('category');
  if (category && category.status !== 'published') missing.push('published category');
  if (!data.seo?.title || !data.seo?.description) missing.push('SEO title and description');
  if (!data.aeo?.summary) missing.push('AEO summary');
  const installment = data.installment;
  if (!installment || installment.financedAmount <= 0 || installment.totalPayable <= 0 || installment.installmentAmount <= 0) {
    missing.push('complete installment facts');
  } else {
    if (installment.totalPayable < installment.financedAmount) missing.push('installment total payable');
    const baseAmount = data.discountPrice != null ? data.discountPrice : data.cashPrice;
    const funded = installment.advanceAmount + installment.financedAmount;
    if (Math.abs(funded - baseAmount) > 0.01 && Math.abs(funded - data.cashPrice) > 0.01) missing.push('advance plus financed amount');
    const count = installment.frequency === 'monthly'
      ? installment.tenureMonths
      : installment.frequency === 'biweekly'
        ? installment.tenureMonths * 2
        : Math.round(installment.tenureMonths * 52 / 12);
    const expected = installment.installmentAmount * count;
    if (Math.abs(expected - installment.totalPayable) > Math.max(1, count)) missing.push('installment amount and tenure');
  }
  if (data.status === 'scheduled' && !data.scheduledAt) missing.push('scheduled publish date');
  if (missing.length) throw error(`Cannot publish: missing or invalid ${missing.join(', ')}`);
};

const buildSlug = (value) => {
  const slug = slugify(String(value || ''), { lower: true, strict: true }).slice(0, 220);
  if (!slug) throw error('A valid slug is required');
  return slug;
};

const buildProductData = async (body, businessId, existing = null) => {
  const categoryId = body.categoryId !== undefined ? body.categoryId : existing?.categoryId;
  const category = await validateCategory(categoryId, businessId);
  const status = normalizeStatus(body.status !== undefined ? body.status : existing?.status);
  const data = {
    name: body.name !== undefined ? cleanString(body.name, 'name', 180, true) : existing?.name,
    slug: body.slug !== undefined || body.name !== undefined ? buildSlug(body.slug || body.name) : existing?.slug,
    sku: body.sku !== undefined ? (body.sku ? cleanString(body.sku, 'sku', 80).toUpperCase() : undefined) : existing?.sku,
    brand: body.brand !== undefined ? (body.brand ? cleanString(body.brand, 'brand', 120) : null) : existing?.brand,
    shortDescription: body.shortDescription !== undefined ? cleanString(body.shortDescription, 'shortDescription', 500) : existing?.shortDescription,
    description: body.description !== undefined ? cleanString(body.description, 'description', 5000) : existing?.description,
    cashPrice: body.cashPrice !== undefined ? requireNonNegativeNumber(body.cashPrice, 'cashPrice') : existing?.cashPrice,
    discountPrice: body.discountPrice !== undefined ? (body.discountPrice === null || body.discountPrice === '' ? null : requireNonNegativeNumber(body.discountPrice, 'discountPrice')) : existing?.discountPrice,
    categoryId: category?._id || null,
    media: body.media !== undefined ? await resolveMediaIds(body.media, businessId, 'media') : existing?.media,
    customFieldValues: normalizeCategoryFields(category, body.customFieldValues !== undefined ? body.customFieldValues : (existing?.customFieldValues || [])),
    inventory: body.inventory !== undefined ? requireNonNegativeNumber(body.inventory, 'inventory') : existing?.inventory,
    installment: body.installment !== undefined ? normalizeInstallment(body.installment) : existing?.installment,
    specs: body.specs !== undefined ? normalizeSpecs(body.specs) : existing?.specs,
    faqs: body.faqs !== undefined ? normalizeFaqs(body.faqs) : existing?.faqs,
    seo: body.seo !== undefined ? normalizeSeo(body.seo) : existing?.seo,
    aeo: body.aeo !== undefined ? normalizeAeo(body.aeo) : existing?.aeo,
    geo: body.geo !== undefined ? normalizeGeo(body.geo) : existing?.geo,
    status,
    scheduledAt: body.status !== undefined || body.scheduledAt !== undefined
      ? normalizeSchedule(status, body.scheduledAt !== undefined ? body.scheduledAt : existing?.scheduledAt)
      : existing?.scheduledAt,
    featured: body.featured !== undefined ? body.featured === true : existing?.featured,
  };
  if (!data.name || !data.slug) throw error('Name and a valid slug are required');
  if (data.discountPrice !== null && data.discountPrice > data.cashPrice) throw error('discountPrice cannot exceed cashPrice');
  if (data.featured && !['published', 'scheduled'].includes(status)) throw error('Only published or scheduled products can be featured');
  validatePublish(data, category);
  return data;
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const filter = { businessId };
    if (!req.admin) {
      filter.$and = [publicStatusFilter()];
    } else if (req.query.status && req.query.status !== 'all') {
      filter.status = normalizeStatus(String(req.query.status));
    }
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.categoryId) filter.categoryId = requireObjectId(req.query.categoryId, 'category id');
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      if (search) {
        const escaped = search.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
        filter.$and = [...(filter.$and || []), { $or: [{ name: { $regex: escaped, $options: 'i' } }, { sku: { $regex: escaped, $options: 'i' } }, { brand: { $regex: escaped, $options: 'i' } }] }];
      }
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      populate(Product.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const value = String(req.params.idOrSlug).toLowerCase();
    const filter = { businessId };
    if (!req.admin) Object.assign(filter, publicStatusFilter());
    if (/^[0-9a-f]{24}$/.test(value)) filter._id = requireObjectId(value, 'product id');
    else filter.slug = value;

    let product = await populate(Product.findOne(filter));
    if (!product && !req.admin && !/^[0-9a-f]{24}$/.test(value)) {
      const redirect = await ProductSlugRedirect.findOne({ businessId, oldSlug: value }).select('productId');
      if (redirect) {
        const target = await populate(Product.findOne({ _id: redirect.productId, businessId, ...publicStatusFilter() }));
        if (target) {
          res.set('Location', `/products/${target.slug}`);
          return res.status(301).end();
        }
      }
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const data = await buildProductData(req.body, req.businessId);
    const exists = await Product.exists({ businessId: req.businessId, slug: data.slug });
    if (exists) throw error('Product slug already exists', 409);
    const reserved = await ProductSlugRedirect.exists({ businessId: req.businessId, oldSlug: data.slug });
    if (reserved) throw error('The product slug is reserved by an existing redirect', 409);
    const product = await Product.create({ businessId: req.businessId, ...data });
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'create', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json({ success: true, product: await populate(Product.findById(product._id)) });
  } catch (err) {
    if (duplicateKey(err)) return res.status(409).json({ success: false, message: 'Product slug or SKU already exists' });
    next(err);
  }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const productId = requireObjectId(req.params.id, 'product id');
    const product = await Product.findOne({ _id: productId, businessId: req.businessId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const oldSlug = product.slug;
    const data = await buildProductData(req.body, req.businessId, product);
    if (data.slug !== oldSlug) {
      const duplicate = await Product.exists({ businessId: req.businessId, slug: data.slug, _id: { $ne: productId } });
      if (duplicate) throw error('Product slug already exists', 409);
      const redirectConflict = await ProductSlugRedirect.findOne({
        businessId: req.businessId,
        oldSlug: data.slug,
        productId: { $ne: productId },
      }).select('_id');
      if (redirectConflict) throw error('The new slug is reserved by an existing redirect', 409);
    }

    Object.assign(product, data);
    try {
      await product.save();
    } catch (err) {
      if (duplicateKey(err)) return res.status(409).json({ success: false, message: 'Product slug or SKU already exists' });
      throw err;
    }

    if (data.slug !== oldSlug) {
      await ProductSlugRedirect.deleteOne({ businessId: req.businessId, oldSlug: data.slug, productId: productId });
      await ProductSlugRedirect.updateOne(
        { businessId: req.businessId, oldSlug },
        { $set: { productId: productId } },
        { upsert: true }
      );
    }

    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'update', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, product: await populate(Product.findById(product._id)) });
  } catch (err) { next(err); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: requireObjectId(req.params.id, 'product id'), businessId: req.businessId },
      { $set: { status: 'archived', featured: false, scheduledAt: null } },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'archive', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, product });
  } catch (err) { next(err); }
});

export default router;
