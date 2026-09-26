import express from 'express';
import Admin from '../models/Admin.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// List admins for this business
router.get('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const admins = await Admin.find({
      businessId: req.businessId,
      deletedAt: null,
    })
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get one
router.get('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      deletedAt: null,
    }).select('-password -twoFactorSecret');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create admin
router.post('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber, permissions } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'email, password, firstName, lastName required',
      });
    }

    // Only super_admin can create super_admin
    const newRole = role || 'manager';
    if (newRole === 'super_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can create super_admin' });
    }
    if (!['super_admin', 'admin', 'manager'].includes(newRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const admin = await Admin.create({
      businessId: req.businessId,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: newRole,
      phoneNumber,
      permissions: permissions || [],
      status: 'active',
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const safe = admin.toObject();
    delete safe.password;
    delete safe.twoFactorSecret;
    res.status(201).json({ success: true, admin: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update admin
router.put('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      deletedAt: null,
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const { firstName, lastName, role, phoneNumber, status, permissions, password } = req.body;

    if (firstName !== undefined) admin.firstName = firstName;
    if (lastName !== undefined) admin.lastName = lastName;
    if (phoneNumber !== undefined) admin.phoneNumber = phoneNumber;
    if (permissions !== undefined) admin.permissions = permissions;
    if (status !== undefined && ['active', 'inactive', 'suspended'].includes(status)) {
      admin.status = status;
    }
    if (role !== undefined) {
      if (role === 'super_admin' && req.admin.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only super_admin can assign super_admin' });
      }
      if (['super_admin', 'admin', 'manager'].includes(role)) admin.role = role;
    }
    if (password) admin.password = password;

    await admin.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const safe = admin.toObject();
    delete safe.password;
    delete safe.twoFactorSecret;
    res.json({ success: true, admin: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Soft delete
router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    if (req.params.id === String(req.admin._id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    const admin = await Admin.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      deletedAt: null,
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    admin.deletedAt = new Date();
    admin.status = 'inactive';
    await admin.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'delete',
      entityType: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Admin deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login history
router.get('/:id/login-history', protectAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    }).select('loginHistory email firstName lastName');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, loginHistory: admin.loginHistory || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
