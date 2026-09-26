import express from 'express';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import { generateAdminToken, generateCustomerToken } from '../utils/generateToken.js';
import { protectAdmin, protectCustomer } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// In-memory OTP store for demo (replace with Redis/SMS in production)
const otpStore = new Map();

// ─── Admin ───────────────────────────────────────────────

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

router.get('/me', protectAdmin, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

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

// ─── Customer portal (phone + CNIC → OTP) ────────────────

/**
 * Request OTP — body: { phoneNumber, cnic, businessSlug }
 * Demo OTP is always logged and returned in non-production.
 */
router.post('/customer/login', async (req, res) => {
  try {
    const { phoneNumber, cnic, businessSlug } = req.body;
    if (!phoneNumber || !cnic) {
      return res.status(400).json({ success: false, message: 'phoneNumber and cnic required' });
    }

    let businessId;
    if (businessSlug) {
      const biz = await Business.findOne({ businessSlug: businessSlug.toLowerCase(), isActive: true });
      if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });
      businessId = biz._id;
    }

    const filter = { phoneNumber, cnic, status: 'active' };
    if (businessId) filter.businessId = businessId;

    const customer = await Customer.findOne(filter);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const key = `${customer._id}`;
    otpStore.set(key, { otp, expires: Date.now() + 10 * 60 * 1000 });

    // Production: send SMS. Demo: return OTP in response when not production.
    const payload = {
      success: true,
      message: 'OTP sent',
      customerId: customer._id,
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.demoOtp = otp;
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/customer/verify-otp', async (req, res) => {
  try {
    const { customerId, otp } = req.body;
    if (!customerId || !otp) {
      return res.status(400).json({ success: false, message: 'customerId and otp required' });
    }

    const entry = otpStore.get(String(customerId));
    if (!entry || entry.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }
    if (entry.otp !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    otpStore.delete(String(customerId));

    const customer = await Customer.findById(customerId);
    if (!customer || customer.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const token = generateCustomerToken(customer._id);
    res.json({
      success: true,
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phoneNumber: customer.phoneNumber,
        accountNumber: customer.accountNumber,
        businessId: customer.businessId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/customer/me', protectCustomer, async (req, res) => {
  res.json({ success: true, customer: req.customer });
});

export default router;
