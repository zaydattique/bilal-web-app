import express from 'express';
import slugify from 'slugify';
import Product from '../models/Product.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// List products (public catalog + admin)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.businessId) {
      filter.businessId = req.businessId;
    } else if (req.query.businessId) {
      filter.businessId = req.query.businessId;
    } else {
      return res.status(400).json({ success: false, message: 'businessId or auth required' });
    }

    if (req.query.active !== 'false') filter.isActive = true;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get by slug or id
router.get('/:idOrSlug', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.businessId) filter.businessId = req.businessId;
    else if (req.query.businessId) filter.businessId = req.query.businessId;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.idOrSlug);
    if (isObjectId) filter._id = req.params.idOrSlug;
    else filter.slug = req.params.idOrSlug.toLowerCase();

    const product = await Product.findOne(filter).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create product
router.post('/', protectAdmin, requireRole('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const {
      name,
      description,
      fullDescription,
      price,
      discountPrice,
      categoryId,
      images,
      customFieldValues,
      inventory,
      sku,
      weight,
      dimensions,
      seoTitle,
      seoDescription,
      isActive,
      featured,
    } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const slug = slugify(name, { lower: true, strict: true });
    const exists = await Product.findOne({ slug, businessId: req.businessId });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Product slug already exists' });
    }

    const product = await Product.create({
      businessId: req.businessId,
      categoryId,
      name,
      slug,
      description,
      fullDescription,
      price,
      discountPrice,
      images: images || [],
      customFieldValues: customFieldValues || [],
      inventory: inventory ?? 0,
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product
router.put('/:id', protectAdmin, requireRole('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const fields = [
      'name',
      'description',
      'fullDescription',
      'price',
      'discountPrice',
      'categoryId',
      'images',
      'customFieldValues',
      'inventory',
      'sku',
      'weight',
      'dimensions',
      'seoTitle',
      'seoDescription',
      'isActive',
      'featured',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    }
    if (req.body.name) {
      product.slug = slugify(req.body.name, { lower: true, strict: true });
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Soft delete
router.delete('/:id', protectAdmin, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
