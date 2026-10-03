import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import Session from '../models/Session.js';
import { requireObjectId } from './security.js';

const COOKIE_NAMES = {
  admin: '__Host-admin_session',
  customer: '__Host-customer_session',
};

const LIMITS = {
  admin: { idleMs: 30 * 60 * 1000, absoluteMs: 8 * 60 * 60 * 1000 },
  customer: { idleMs: 30 * 60 * 1000, absoluteMs: 24 * 60 * 60 * 1000 },
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getCookie = (req, name) => {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
};

const loadSession = async (req, userType) => {
  const raw = getCookie(req, COOKIE_NAMES[userType]);
  if (!raw || raw.length < 32 || raw.length > 128) return null;

  const session = await Session.findOne({
    userType,
    tokenHash: hashToken(raw),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) return null;

  const limits = LIMITS[userType];
  const now = Date.now();
  if (now - session.lastSeenAt.getTime() > limits.idleMs) {
    session.revokedAt = new Date();
    session.endedAt = new Date();
    await session.save();
    return null;
  }

  if (session.userAgent && session.userAgent !== (req.get('user-agent') || '')) {
    session.revokedAt = new Date();
    session.endedAt = new Date();
    await session.save();
    return null;
  }

  if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    session.lastSeenAt = new Date(now);
    await session.save();
  }

  return session;
};

export const protectAdmin = async (req, res, next) => {
  try {
    const session = await loadSession(req, 'admin');
    if (!session) return res.status(401).json({ success: false, message: 'Not authorized' });

    const admin = await Admin.findOne({
      _id: session.userId,
      businessId: session.businessId,
      status: 'active',
      deletedAt: null,
    }).select('-password -twoFactorSecret');

    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found or inactive' });

    const business = await Business.findOne({ _id: session.businessId, isActive: true }).select('_id');
    if (!business) return res.status(401).json({ success: false, message: 'Business is inactive or unavailable' });

    req.admin = admin;
    req.businessId = session.businessId;
    req.session = session;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

export const protectCustomer = async (req, res, next) => {
  try {
    const session = await loadSession(req, 'customer');
    if (!session) return res.status(401).json({ success: false, message: 'Not authorized' });

    const customer = await Customer.findOne({
      _id: session.userId,
      businessId: session.businessId,
      status: 'active',
    });

    if (!customer) return res.status(401).json({ success: false, message: 'Customer not found or inactive' });

    const business = await Business.findOne({ _id: session.businessId, isActive: true }).select('_id');
    if (!business) return res.status(401).json({ success: false, message: 'Business is inactive or unavailable' });

    req.customer = customer;
    req.businessId = session.businessId;
    req.session = session;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const session = await loadSession(req, 'admin');
    if (!session) return next();

    const admin = await Admin.findOne({
      _id: session.userId,
      businessId: session.businessId,
      status: 'active',
      deletedAt: null,
    }).select('-password -twoFactorSecret');

    if (admin) {
      const business = await Business.findOne({ _id: session.businessId, isActive: true }).select('_id');
      if (business) {
        req.admin = admin;
        req.businessId = session.businessId;
        req.session = session;
      }
    }
  } catch {
    // Invalid optional sessions do not make public endpoints private.
  }
  next();
};
