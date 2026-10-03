import express from 'express';
import slugify from 'slugify';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import {
  assertAllowedFields,
  requireObjectId,
  requirePositiveNumber,
  requireNonNegativeNumber,
  resolvePublicBusiness,
} from '../middleware/security.js';

const router = express.Router();

const PRODUCT_FIELDS = [
  'name', 'description', 'fullDescription', 'price', 'discountPrice', 'categoryId',
  'images', 'customFieldValues', 'inventory', 'sku', 'weight', 'dimensions',
  'seoTitle', 'seoDescription', 'isActive', 'featured',
];

const getPublicBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  const business = await resolvePublicBusiness(req.query.businessId);
  return business._id;
};

const validateCategoryOwnership = async (categoryId, businessId) => {
  if (categoryId === undefined || categoryId === null || categoryId === '') return null;
  const id = requireObjectId(categoryId, 'category id');
  const category = await Category.exists({ _id: id, businessId });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 400;
    throw error;
  }
  return id;
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getPublicBusinessId(req);
    const filter = { businessId };
    if (req.query.active !== 'false') filter.isActive = true;
    if (req.query.categoryId) filter.categoryId = requireObjectId(req.query.categoryId, 'category id');
    if (req.query.featured === 'true') filter.featured = true;

    if (req.query.search) {
      const s = String(req.query.search).trim().slice(0, 100);
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { sku: { $regex: escaped, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).populate('categoryId', 'name slug').sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getPublicBusinessId(req);
    const filter = { businessId };
    if (/^[0-9a-fA-F]{24}$/.test(req.params.idOrSlug)) filter._id = requireObjectId(req.params.idOrSlug, 'product id');
    else filter.slug = String(req.params.idOrSlug).toLowerCase();

    const product = await Product.findOne(filter).populate('categoryId', 'name slug');
    if (!product || (!req.admin && !product.isActive)) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const { name, description, fullDescription, price, discountPrice, images, customFieldValues, inventory, sku, weight, dimensions, seoTitle, seoDescription, isActive, featured } = req.body;
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

    const normalizedPrice = requirePositiveNumber(price, 'price');
    const normalizedDiscount = discountPrice === undefined ? undefined : requireNonNegativeNumber(discountPrice, 'discountPrice');
    if (normalizedDiscount !== undefined && normalizedDiscount > normalizedPrice) {
      return res.status(400).json({ success: false, message: 'discountPrice cannot exceed price' });
    }

    const categoryId = await validateCategoryOwnership(categoryId, req.businessId);
    const slug = slugify(name, { lower: true, strict: true });
    const exists = await Product.findOne({ slug, businessId: req.businessId });
    if (exists) return res.status(409).json({ success: false, message: 'Product slug already exists' });

    const product = await Product.create({
      businessId: req.businessId,
      categoryId,
      name: name.trim(),
      slug,
      description,
      fullDescription,
      price: normalizedPrice,
      discountPrice: normalizedDiscount,
      images: images || [],
      customFieldValues: customFieldValues || [],
      inventory: inventory === undefined ? 0 : requireNonNegativeNumber(inventory, 'inventory'),
      sku,
      weight,
      dimensions,
      seoTitle,
      seoDescription,
      isActive: isActive !== false,
      featured: featured === true,
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'product',
      entityId: product._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, PRODUCT_FIELDS);
    const productId = requireObjectId(req.params.id, 'product id');
    const product = await Product.findOne({ _id: productId, businessId: req.businessId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (req.body.categoryId !== undefined) product.categoryId = await validateCategoryOwnership(req.body.categoryId, req.businessId);
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      const slug = slugify(req.body.name, { lower: true, strict: true });
      const duplicate = await Product.exists({ businessId: req.businessId, slug, _id: { $ne: productId } });
      if (duplicate) return res.status(409).json({ success: false, message: 'Product slug already exists' });
      product.name = req.body.name.trim();
      product.slug = slug;
    }

    if (req.body.price !== undefined) product.price = requirePositiveNumber(req.body.price, 'price');
    if (req.body.discountPrice !== undefined) product.discountPrice = requireNonNegativeNumber(req.body.discountPrice, 'discountPrice');
    if (product.discountPrice !== undefined && product.discountPrice > product.price) {
      return res.status(400).json({ success: false, message: 'discountPrice cannot exceed price' });
    }

    for (const field of PRODUCT_FIELDS) {
      if (['categoryId', 'name', 'price', 'discountPrice'].includes(field)) continue;
      if (req.body[field] !== undefined) product[field] = req.body[field];
    }

    await product.save();
    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'product',
      entityId: product._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, product });
  } catch (error) { next(error); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    if (Object.keys(req.body || {}).length) assertAllowedFields(req.body, []);
    const productId = requireObjectId(req.params.id, 'product id');
    const product = await Product.findOne({ _id: productId, businessId: req.businessId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isActive = false;
    await product.save();
    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'delete',
      entityType: 'product',
      entityId: product._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Product deactivated' });
  } catch (error) { next(error); }
});

export default router;
