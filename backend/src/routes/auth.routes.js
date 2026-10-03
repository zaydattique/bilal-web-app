import express from 'express';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import { generateAdminToken, generateCustomerToken } from '../utils/generateToken.js';
import { protectAdmin, protectCustomer } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { requireObjectId, assertAllowedFields, requireString } from '../middleware/security.js';

const router = express.Router();
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

router.post('/admin/login', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['email', 'password']);
    const email = requireString(req.body.email, 'email', { max: 254 }).toLowerCase();
    const password = requireString(req.body.password, 'password', { min: 1, max: 256 });

    const admin = await Admin.findOne({ email, deletedAt: null });
    if (!admin || !(await admin.comparePassword(password)) || admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
    next(error);
  }
});

router.get('/me', protectAdmin, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

router.post('/change-password', protectAdmin, async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['oldPassword', 'newPassword']);
    const oldPassword = requireString(req.body.oldPassword, 'oldPassword', { min: 1, max: 256 });
    const newPassword = requireString(req.body.newPassword, 'newPassword', { min: 12, max: 256 });

    const admin = await Admin.findById(req.admin._id);
    if (!admin || !(await admin.comparePassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});

router.post('/customer/login', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['phoneNumber', 'cnic', 'businessSlug']);
    const phoneNumber = requireString(req.body.phoneNumber, 'phoneNumber', { max: 32 });
    const cnic = requireString(req.body.cnic, 'cnic', { max: 32 });
    const businessSlug = requireString(req.body.businessSlug, 'businessSlug', { max: 120 }).toLowerCase();

    const business = await Business.findOne({ businessSlug, isActive: true }).select('_id');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const customer = await Customer.findOne({
      businessId: business._id,
      phoneNumber,
      cnic,
      status: 'active',
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    otpStore.set(String(customer._id), {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    // Phase 2 replaces this process-local delivery store with persistent/shared OTP infrastructure.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Development OTP generated for customer ${customer._id}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'OTP sent',
      customerId: customer._id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/customer/verify-otp', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['customerId', 'otp']);
    const customerId = requireObjectId(req.body.customerId, 'customerId');
    const otp = requireString(req.body.otp, 'otp', { min: 6, max: 6 });

    const entry = otpStore.get(String(customerId));
    if (!entry || entry.expiresAt <= Date.now()) {
      otpStore.delete(String(customerId));
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpStore.delete(String(customerId));
      return res.status(429).json({ success: false, message: 'Too many OTP attempts' });
    }

    if (entry.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    otpStore.delete(String(customerId));

    const customer = await Customer.findOne({
      _id: customerId,
      status: 'active',
    });
    if (!customer) {
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
    next(error);
  }
});

router.get('/customer/me', protectCustomer, async (req, res) => {
  res.json({ success: true, customer: req.customer });
});

export default router;
