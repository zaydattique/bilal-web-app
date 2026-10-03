import express from 'express';
import Admin from '../models/Admin.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, requireString } from '../middleware/security.js';

const router = express.Router();

const ADMIN_MUTABLE_FIELDS = ['firstName', 'lastName', 'role', 'phoneNumber', 'status', 'permissions', 'password'];

router.get('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const admins = await Admin.find({ businessId: req.businessId, deletedAt: null })
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (error) { next(error); }
});

router.get('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const adminId = requireObjectId(req.params.id, 'admin id');
    const admin = await Admin.findOne({ _id: adminId, businessId: req.businessId, deletedAt: null })
      .select('-password -twoFactorSecret');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, admin });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['email', 'password', 'firstName', 'lastName', 'role', 'phoneNumber', 'permissions']);
    const email = requireString(req.body.email, 'email', { max: 254 }).toLowerCase();
    const password = requireString(req.body.password, 'password', { min: 12, max: 256 });
    const firstName = requireString(req.body.firstName, 'firstName', { max: 100 });
    const lastName = requireString(req.body.lastName, 'lastName', { max: 100 });

    const newRole = req.body.role || 'manager';
    if (!['super_admin', 'admin', 'manager'].includes(newRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (newRole === 'super_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can create super_admin' });
    }

    const exists = await Admin.findOne({ businessId: req.businessId, email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered for this business' });

    const admin = await Admin.create({
      businessId: req.businessId,
      email,
      password,
      firstName,
      lastName,
      role: newRole,
      phoneNumber: req.body.phoneNumber,
      permissions: req.body.permissions || [],
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
  } catch (error) { next(error); }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ADMIN_MUTABLE_FIELDS);
    const adminId = requireObjectId(req.params.id, 'admin id');
    const admin = await Admin.findOne({ _id: adminId, businessId: req.businessId, deletedAt: null });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { firstName, lastName, role, phoneNumber, status, permissions, password } = req.body;
    if (firstName !== undefined) admin.firstName = requireString(firstName, 'firstName', { max: 100 });
    if (lastName !== undefined) admin.lastName = requireString(lastName, 'lastName', { max: 100 });
    if (phoneNumber !== undefined) admin.phoneNumber = requireString(phoneNumber, 'phoneNumber', { max: 32 });
    if (permissions !== undefined) {
      if (!Array.isArray(permissions) || permissions.length > 100 || permissions.some((p) => typeof p !== 'string' || p.length > 100)) {
        return res.status(400).json({ success: false, message: 'Invalid permissions' });
      }
      admin.permissions = permissions;
    }
    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
      admin.status = status;
    }
    if (role !== undefined) {
      if (!['super_admin', 'admin', 'manager'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
      if (role === 'super_admin' && req.admin.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only super_admin can assign super_admin' });
      }
      admin.role = role;
    }
    if (password !== undefined) admin.password = requireString(password, 'password', { min: 12, max: 256 });

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
  } catch (error) { next(error); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const adminId = requireObjectId(req.params.id, 'admin id');
    if (adminId.equals(req.admin._id)) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });

    const admin = await Admin.findOne({ _id: adminId, businessId: req.businessId, deletedAt: null });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

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
  } catch (error) { next(error); }
});

router.get('/:id/login-history', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const adminId = requireObjectId(req.params.id, 'admin id');
    const admin = await Admin.findOne({ _id: adminId, businessId: req.businessId })
      .select('loginHistory email firstName lastName');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, loginHistory: admin.loginHistory || [] });
  } catch (error) { next(error); }
});

export default router;
