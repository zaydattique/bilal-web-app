import express from 'express';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import Session from '../models/Session.js';
import OtpChallenge from '../models/OtpChallenge.js';
import { protectAdmin, protectCustomer } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { requireObjectId, assertAllowedFields, requireString } from '../middleware/security.js';

const router = express.Router();

const COOKIE_NAMES = {
  admin: '__Host-admin_session',
  customer: '__Host-customer_session',
};

const SESSION_LIMITS = {
  admin: { idleMs: 30 * 60 * 1000, absoluteMs: 8 * 60 * 60 * 1000 },
  customer: { idleMs: 30 * 60 * 1000, absoluteMs: 24 * 60 * 60 * 1000 },
};

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const createSession = async ({ userType, userId, businessId, req, res }) => {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const absoluteMs = SESSION_LIMITS[userType].absoluteMs;

  const session = await Session.create({
    userType,
    userId,
    businessId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + absoluteMs),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.cookie(COOKIE_NAMES[userType], rawToken, cookieOptions(Math.floor(absoluteMs / 1000)));
  return session;
};

const clearSessionCookie = (res, userType) => {
  res.clearCookie(COOKIE_NAMES[userType], cookieOptions(0));
};

router.post('/admin/login', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['email', 'password']);
    const email = requireString(req.body.email, 'email', { max: 254 }).toLowerCase();
    const password = requireString(req.body.password, 'password', { min: 1, max: 256 });

    const admin = await Admin.findOne({ email, deletedAt: null });
    if (!admin || !(await admin.comparePassword(password)) || admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const session = await createSession({
      userType: 'admin',
      userId: admin._id,
      businessId: admin.businessId,
      req,
      res,
    });

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
      changes: { sessionId: session._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
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

router.post('/admin/logout', protectAdmin, async (req, res, next) => {
  try {
    await Session.updateOne(
      { _id: req.session._id, userType: 'admin', userId: req.admin._id, revokedAt: null },
      { $set: { revokedAt: new Date(), endedAt: new Date() } }
    );
    clearSessionCookie(res, 'admin');
    res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/logout-all', protectAdmin, async (req, res, next) => {
  try {
    await Session.updateMany(
      { userType: 'admin', userId: req.admin._id, businessId: req.businessId, revokedAt: null },
      { $set: { revokedAt: new Date(), endedAt: new Date() } }
    );
    clearSessionCookie(res, 'admin');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/sessions', protectAdmin, async (req, res, next) => {
  try {
    const sessions = await Session.find({
      userType: 'admin',
      userId: req.admin._id,
      businessId: req.businessId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('_id createdAt lastSeenAt expiresAt ipAddress userAgent').sort({ createdAt: -1 });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/sessions/:id', protectAdmin, async (req, res, next) => {
  try {
    const sessionId = requireObjectId(req.params.id, 'session id');
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userType: 'admin', userId: req.admin._id, businessId: req.businessId, revokedAt: null },
      { $set: { revokedAt: new Date(), endedAt: new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', protectAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
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

    await Session.updateMany(
      { userType: 'admin', userId: admin._id, businessId: req.businessId, _id: { $ne: req.session._id }, revokedAt: null },
      { $set: { revokedAt: new Date(), endedAt: new Date() } }
    );

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
    }).select('_id businessId');

    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    await OtpChallenge.deleteMany({ customerId: customer._id, consumedAt: null });

    const otp = crypto.randomInt(100000, 1000000).toString();
    await OtpChallenge.create({
      customerId: customer._id,
      businessId: business._id,
      otpHash: hashOtp(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.warn('Development OTP generated for customer ' + String(customer._id) + ': ' + otp);
      return res.json({ success: true, message: 'OTP generated in development', customerId: customer._id, demoOtp: otp });
    }

    return res.status(503).json({ success: false, message: 'OTP delivery provider is not configured' });
  } catch (error) {
    next(error);
  }
});

router.post('/customer/verify-otp', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['customerId', 'otp']);
    const customerId = requireObjectId(req.body.customerId, 'customerId');
    const otp = requireString(req.body.otp, 'otp', { min: 6, max: 6 });

    const challenge = await OtpChallenge.findOneAndUpdate(
      {
        customerId,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
        otpHash: hashOtp(otp),
      },
      { $set: { consumedAt: new Date() }, $inc: { attempts: 1 } },
      { new: true }
    );

    if (!challenge) {
      await OtpChallenge.updateOne(
        { customerId, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } }
      );
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      businessId: challenge.businessId,
      status: 'active',
    });

    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    await createSession({
      userType: 'customer',
      userId: customer._id,
      businessId: customer.businessId,
      req,
      res,
    });

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
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

router.post('/customer/logout', protectCustomer, async (req, res, next) => {
  try {
    await Session.updateOne(
      { _id: req.session._id, userType: 'customer', userId: req.customer._id, revokedAt: null },
      { $set: { revokedAt: new Date(), endedAt: new Date() } }
    );
    clearSessionCookie(res, 'customer');
    res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/customer/me', protectCustomer, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, customer: req.customer });
});

export default router;
