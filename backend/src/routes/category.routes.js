import express from 'express';
import slugify from 'slugify';
import Category from '../models/Category.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, resolvePublicBusiness } from '../middleware/security.js';
import { resolveSingleMediaId } from '../utils/mediaReferences.js';

const router = express.Router();

const CATEGORY_FIELDS = ['name', 'description', 'image', 'order', 'customFields', 'isActive'];

const getPublicBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  const business = await resolvePublicBusiness(req.query.businessId);
  return business._id;
};

const populateCategoryMedia = (query) =>
  query.populate('image', 'publicUrl altText width height purpose');

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getPublicBusinessId(req);
    const filter = { businessId };
    if (req.query.active !== 'false') filter.isActive = true;
    const categories = await populateCategoryMedia(
      Category.find(filter).sort({ order: 1, name: 1 })
    );
    res.json({ success: true, categories });
  } catch (error) { next(error); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const categoryId = requireObjectId(req.params.id, 'category id');
    const businessId = await getPublicBusinessId(req);
    const category = await populateCategoryMedia(
      Category.findOne({ _id: categoryId, businessId })
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, CATEGORY_FIELDS);
    const { name, description, image, order, customFields, isActive } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const slug = slugify(name, { lower: true, strict: true });
    if (!slug) return res.status(400).json({ success: false, message: 'Name cannot produce a valid slug' });

    const exists = await Category.findOne({ slug, businessId: req.businessId });
    if (exists) return res.status(409).json({ success: false, message: 'Category slug already exists' });

    const category = await Category.create({
      businessId: req.businessId,
      name: name.trim(),
      slug,
      description,
      image: await resolveSingleMediaId(image, req.businessId, 'image'),
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

    const saved = await populateCategoryMedia(Category.findById(category._id));
    res.status(201).json({ success: true, category: saved });
  } catch (error) { next(error); }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, CATEGORY_FIELDS);
    const categoryId = requireObjectId(req.params.id, 'category id');
    const category = await Category.findOne({ _id: categoryId, businessId: req.businessId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name, description, image, order, customFields, isActive } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      const slug = slugify(name, { lower: true, strict: true });
      if (!slug) return res.status(400).json({ success: false, message: 'Name cannot produce a valid slug' });
      const duplicate = await Category.exists({
        businessId: req.businessId,
        slug,
        _id: { $ne: categoryId },
      });
      if (duplicate) return res.status(409).json({ success: false, message: 'Category slug already exists' });
      category.name = name.trim();
      category.slug = slug;
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = await resolveSingleMediaId(image, req.businessId, 'image');
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

    const saved = await populateCategoryMedia(Category.findById(category._id));
    res.json({ success: true, category: saved });
  } catch (error) { next(error); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    if (Object.keys(req.body || {}).length) assertAllowedFields(req.body, []);
    const categoryId = requireObjectId(req.params.id, 'category id');
    const category = await Category.findOne({ _id: categoryId, businessId: req.businessId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

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
  } catch (error) { next(error); }
});

export default router;
