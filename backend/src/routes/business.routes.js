import express from 'express';
import slugify from 'slugify';
import Business from '../models/Business.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// Get current business config (admin)
router.get('/', protectAdmin, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: get business by slug (for white-label frontend)
router.get('/public/:slug', async (req, res) => {
  try {
    const business = await Business.findOne({
      businessSlug: req.params.slug.toLowerCase(),
      isActive: true,
    }).select('-__v');
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update business config (owner/admin only)
router.put('/', protectAdmin, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const allowed = [
      'businessName',
      'businessType',
      'logo',
      'branding',
      'typography',
      'contact',
      'socialMedia',
      'policies',
      'settings',
      'seo',
      'isActive',
    ];

    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        changes[key] = { from: business[key], to: req.body[key] };
        if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key]) && business[key]) {
          business[key] = { ...business[key].toObject?.() ?? business[key], ...req.body[key] };
        } else {
          business[key] = req.body[key];
        }
      }
    }

    // Handle slug change carefully
    if (req.body.businessSlug) {
      const newSlug = slugify(req.body.businessSlug, { lower: true, strict: true });
      if (newSlug !== business.businessSlug) {
        const exists = await Business.findOne({ businessSlug: newSlug, _id: { $ne: business._id } });
        if (exists) {
          return res.status(400).json({ success: false, message: 'Slug already in use' });
        }
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

    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
