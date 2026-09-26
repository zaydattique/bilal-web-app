import express from 'express';
import slugify from 'slugify';
import Category from '../models/Category.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// List categories (public for catalog + admin)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.businessId) {
      filter.businessId = req.businessId;
    } else if (req.query.businessId) {
      filter.businessId = req.query.businessId;
    } else if (req.query.slug) {
      // resolve via business slug in query later if needed
      return res.status(400).json({ success: false, message: 'businessId or auth required' });
    }

    if (req.query.active !== 'false') filter.isActive = true;

    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single category
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create category
router.post('/', protectAdmin, requireRole('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const { name, description, imageUrl, order, customFields, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const slug = slugify(name, { lower: true, strict: true });
    const exists = await Category.findOne({ slug, businessId: req.businessId });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }

    const category = await Category.create({
      businessId: req.businessId,
      name,
      slug,
      description,
      imageUrl,
      order: order ?? 0,
      customFields: customFields || [],
      isActive: isActive !== false,
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'category',
      entityId: category._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update category
router.put('/:id', protectAdmin, requireRole('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, imageUrl, order, customFields, isActive } = req.body;
    if (name) {
      category.name = name;
      category.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (order !== undefined) category.order = order;
    if (customFields !== undefined) category.customFields = customFields;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'category',
      entityId: category._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete (soft via isActive)
router.delete('/:id', protectAdmin, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    category.isActive = false;
    await category.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'delete',
      entityType: 'category',
      entityId: category._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
