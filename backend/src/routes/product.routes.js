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
  'name','slug','sku','brand','shortDescription','description','cashPrice','discountPrice',
  'categoryId','media','customFieldValues','inventory','installment','specs','faqs','seo','aeo','geo',
  'status','scheduledAt','featured'
];

const MAX = { name:180, shortDescription:500, description:5000, faqs:20, media:20, facts:20, keywords:20 };

const publicFilter = () => ({
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

const cleanString = (value, field, max) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || value.length > max) {
    const error = new Error(`${field} is invalid`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
};

const normalizeFaqs = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX.faqs) throw Object.assign(new Error('faqs is invalid'), { statusCode: 400 });
  return value.map((faq) => {
    if (!faq || typeof faq.question !== 'string' || typeof faq.answer !== 'string') throw Object.assign(new Error('Each FAQ needs a question and answer'), { statusCode: 400 });
    return { question: faq.question.trim().slice(0, 300), answer: faq.answer.trim().slice(0, 2000) };
  });
};

const normalizeCategoryFields = (category, values) => {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > 50) throw Object.assign(new Error('customFieldValues is invalid'), { statusCode: 400 });
  const definitions = new Map((category?.customFields || []).map((field) => [field.key, field]));
  const seen = new Set();
  const result = values.map((item) => {
    if (!item || typeof item.key !== 'string' || typeof item.value !== 'string') throw Object.assign(new Error('Each custom field value needs key and value'), { statusCode: 400 });
    const key = item.key.trim().toLowerCase();
    const definition = definitions.get(key);
    if (!definition || seen.has(key)) throw Object.assign(new Error('Invalid or duplicate custom field value'), { statusCode: 400 });
    seen.add(key);
    if (definition.type === 'number' && Number.isNaN(Number(item.value))) throw Object.assign(new Error(`Custom field ${key} must be numeric`), { statusCode: 400 });
    if (definition.type === 'date' && Number.isNaN(Date.parse(item.value))) throw Object.assign(new Error(`Custom field ${key} must be a valid date`), { statusCode: 400 });
    if (definition.type === 'select' && !definition.options.includes(item.value)) throw Object.assign(new Error(`Custom field ${key} has an invalid option`), { statusCode: 400 });
    return { key, value: item.value.trim().slice(0, 500) };
  });
  for (const field of category?.customFields || []) {
    if (field.required && !seen.has(field.key)) throw Object.assign(new Error(`Required custom field missing: ${field.label}`), { statusCode: 400 });
  }
  return result;
};

const validateCategory = async (categoryId, businessId) => {
  if (!categoryId) return null;
  const id = requireObjectId(categoryId, 'category id');
  const category = await Category.findOne({ _id: id, businessId }).select('name slug customFields status');
  if (!category) throw Object.assign(new Error('Category not found'), { statusCode: 400 });
  return category;
};

const validatePublish = (data) => {
  const status = data.status;
  if (!['published','scheduled'].includes(status)) return;
  const errors = [];
  if (!data.name || !data.shortDescription || !data.description) errors.push('product descriptions');
  if (data.cashPrice === undefined || data.cashPrice === null) errors.push('cash price');
  if (!data.categoryId) errors.push('category');
  if (!data.seo?.title || !data.seo?.description) errors.push('SEO title and description');
  if (!data.aeo?.summary) errors.push('AEO summary');
  if (!data.installment || data.installment.totalPayable <= 0 || data.installment.installmentAmount <= 0) errors.push('complete installment facts');
  if (status === 'scheduled' && !data.scheduledAt) errors.push('scheduled publish date');
  if (errors.length) throw Object.assign(new Error(`Cannot publish: missing ${errors.join(', ')}`), { statusCode: 400 });
};

const buildSlug = (value) => slugify(value, { lower: true, strict: true }).slice(0, 220);

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const filter = { businessId };
    if (!req.admin) Object.assign(filter, publicFilter());
    else if (req.query.status) filter.status = String(req.query.status);
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.categoryId) filter.categoryId = requireObjectId(req.query.categoryId, 'category id');
    if (req.query.search) {
      const s = String(req.query.search).trim().slice(0, 100).replace(/[.*+?^$()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: s, $options: 'i' } }, { sku: { $regex: s, $options: 'i' } }, { brand: { $regex: s, $options: 'i' } }];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      populate(Product.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const value = String(req.params.idOrSlug).toLowerCase();
    const filter = { businessId };
    if (!req.admin) Object.assign(filter, publicFilter());
    if (/^[0-9a-f]{24}$/i.test(value)) filter._id = requireObjectId(value, 'product id');
    else filter.slug = value;
    let product = await populate(Product.findOne(filter));
    if (!product && !req.admin && !/^[0-9a-f]{24}$/i.test(value)) {
      const redirect = await ProductSlugRedirect.findOne({ businessId, oldSlug: value }).select('productId');
      if (redirect) {
        const target = await populate(Product.findOne({ _id: redirect.productId, businessId, ...publicFilter() }));
        if (target) return res.status(301).json({ success: true, redirect: `/products/${target.slug}`, product: target });
      }
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin','admin','manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const category = await validateCategory(req.body.categoryId, req.businessId);
    const data = {
      name: cleanString(req.body.name, 'name', MAX.name),
      slug: buildSlug(req.body.slug || req.body.name || ''),
      sku: req.body.sku ? String(req.body.sku).trim().toUpperCase().slice(0,80) : null,
      brand: req.body.brand ? cleanString(req.body.brand, 'brand', 120) : null,
      shortDescription: cleanString(req.body.shortDescription || '', 'shortDescription', MAX.shortDescription),
      description: cleanString(req.body.description || '', 'description', MAX.description),
      cashPrice: requireNonNegativeNumber(req.body.cashPrice, 'cashPrice'),
      discountPrice: req.body.discountPrice == null || req.body.discountPrice === '' ? null : requireNonNegativeNumber(req.body.discountPrice, 'discountPrice'),
      categoryId: category?._id || null,
      media: await resolveMediaIds(req.body.media || [], req.businessId, 'media'),
      customFieldValues: normalizeCategoryFields(category, req.body.customFieldValues || []),
      inventory: req.body.inventory === undefined ? 0 : requireNonNegativeNumber(req.body.inventory, 'inventory'),
      installment: req.body.installment || {},
      specs: req.body.specs || {},
      faqs: normalizeFaqs(req.body.faqs || []),
      seo: req.body.seo || {},
      aeo: req.body.aeo || {},
      geo: req.body.geo || {},
      status: req.body.status || 'draft',
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
      featured: req.body.featured === true,
    };
    if (!data.name || !data.slug) throw Object.assign(new Error('Name and a valid slug are required'), { statusCode: 400 });
    if (data.discountPrice !== null && data.discountPrice > data.cashPrice) throw Object.assign(new Error('discountPrice cannot exceed cashPrice'), { statusCode: 400 });
    if (data.installment.advanceAmount + data.installment.financedAmount !== 0 && data.installment.financedAmount < 0) throw Object.assign(new Error('Invalid installment amounts'), { statusCode: 400 });
    validatePublish(data);
    const exists = await Product.exists({ businessId: req.businessId, slug: data.slug });
    if (exists) throw Object.assign(new Error('Product slug already exists'), { statusCode: 409 });
    const product = await Product.create({ businessId: req.businessId, ...data });
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'create', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json({ success: true, product: await populate(Product.findById(product._id)) });
  } catch (error) { next(error); }
});

router.put('/:id', protectAdmin, requireRole('super_admin','admin','manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const productId = requireObjectId(req.params.id, 'product id');
    const product = await Product.findOne({ _id: productId, businessId: req.businessId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const oldSlug = product.slug;
    const category = req.body.categoryId !== undefined ? await validateCategory(req.body.categoryId, req.businessId) : (product.categoryId ? await validateCategory(product.categoryId, req.businessId) : null);
    const next = { ...req.body };
    if (next.name !== undefined) next.name = cleanString(next.name, 'name', MAX.name);
    if (next.slug !== undefined || next.name !== undefined) next.slug = buildSlug(next.slug || next.name);
    if (next.cashPrice !== undefined) next.cashPrice = requireNonNegativeNumber(next.cashPrice, 'cashPrice');
    if (next.discountPrice !== undefined && next.discountPrice !== null) next.discountPrice = requireNonNegativeNumber(next.discountPrice, 'discountPrice');
    if (next.discountPrice !== undefined && next.discountPrice !== null && next.cashPrice === undefined && next.discountPrice > product.cashPrice) throw Object.assign(new Error('discountPrice cannot exceed cashPrice'), { statusCode: 400 });
    if (next.discountPrice !== undefined && next.discountPrice !== null && next.cashPrice !== undefined && next.discountPrice > next.cashPrice) throw Object.assign(new Error('discountPrice cannot exceed cashPrice'), { statusCode: 400 });
    if (next.media !== undefined) next.media = await resolveMediaIds(next.media, req.businessId, 'media');
    if (next.categoryId !== undefined) next.categoryId = category?._id || null;
    if (next.customFieldValues !== undefined) next.customFieldValues = normalizeCategoryFields(category, next.customFieldValues);
    if (next.faqs !== undefined) next.faqs = normalizeFaqs(next.faqs);
    if (next.inventory !== undefined) next.inventory = requireNonNegativeNumber(next.inventory, 'inventory');
    if (next.scheduledAt !== undefined) next.scheduledAt = next.scheduledAt ? new Date(next.scheduledAt) : null;
    Object.assign(product, next);
    validatePublish(product.toObject());
    if (product.slug !== oldSlug) {
      const duplicate = await Product.exists({ businessId: req.businessId, slug: product.slug, _id: { $ne: productId } });
      if (duplicate) throw Object.assign(new Error('Product slug already exists'), { statusCode: 409 });
      await ProductSlugRedirect.updateOne({ businessId: req.businessId, oldSlug }, { $set: { productId: product._id } }, { upsert: true });
    }
    await product.save();
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'update', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, product: await populate(Product.findById(product._id)) });
  } catch (error) { next(error); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin','admin'), async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate({ _id: requireObjectId(req.params.id, 'product id'), businessId: req.businessId }, { $set: { status: 'archived', featured: false } }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await logAction({ businessId: req.businessId, adminId: req.admin._id, action: 'archive', entityType: 'product', entityId: product._id, ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, product });
  } catch (error) { next(error); }
});

export default router;
