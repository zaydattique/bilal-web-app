import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

router.get('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.adminId) filter.adminId = req.query.adminId;
    if (req.query.search) filter.$or = [
      { action: { $regex: escapeRegex(String(req.query.search).slice(0, 80)), $options: 'i' } },
      { entityType: { $regex: String(req.query.search).slice(0, 80), $options: 'i' } },
    ];

    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) return res.status(400).json({ success: false, message: 'Invalid from date' });
        filter.timestamp.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (Number.isNaN(to.getTime())) return res.status(400).json({ success: false, message: 'Invalid to date' });
        filter.timestamp.$lte = to;
      }
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
