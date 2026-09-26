import express from 'express';
import Admin from '../models/Admin.js';
import { generateAdminToken } from '../utils/generateToken.js';
import { protectAdmin } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is not active' });
    }

    admin.lastLogin = new Date();
    admin.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    if (admin.loginHistory.length > 20) admin.loginHistory = admin.loginHistory.slice(-20);
    await admin.save();

    await logAction({
      businessId: admin.businessId,
      adminId: admin._id,
      action: 'login',
      entityType: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = generateAdminToken(admin._id);
    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        businessId: admin.businessId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current admin
router.get('/me', protectAdmin, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Change password
router.post('/change-password', protectAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!(await admin.comparePassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
