import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import { requireObjectId } from './security.js';

const ADMIN_ISSUER = 'bilal-installment-platform';
const CUSTOMER_ISSUER = 'bilal-installment-platform';

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const verifyToken = (token, secret, audience, issuer) =>
  jwt.verify(token, secret, { audience, issuer });

export const protectAdmin = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    const decoded = verifyToken(token, process.env.JWT_ADMIN_SECRET, 'admin', ADMIN_ISSUER);
    const adminId = requireObjectId(decoded.id, 'admin token id');

    const admin = await Admin.findOne({
      _id: adminId,
      status: 'active',
      deletedAt: null,
    }).select('-password -twoFactorSecret');

    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found or inactive' });

    const business = await Business.findOne({ _id: admin.businessId, isActive: true }).select('_id');
    if (!business) return res.status(401).json({ success: false, message: 'Business is inactive or unavailable' });

    req.admin = admin;
    req.businessId = admin.businessId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const protectCustomer = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    const decoded = verifyToken(token, process.env.JWT_CUSTOMER_SECRET, 'customer', CUSTOMER_ISSUER);
    const customerId = requireObjectId(decoded.id, 'customer token id');

    const customer = await Customer.findOne({
      _id: customerId,
      status: 'active',
    });

    if (!customer) return res.status(401).json({ success: false, message: 'Customer not found or inactive' });

    const business = await Business.findOne({ _id: customer.businessId, isActive: true }).select('_id');
    if (!business) return res.status(401).json({ success: false, message: 'Business is inactive or unavailable' });

    req.customer = customer;
    req.businessId = customer.businessId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
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
    const token = getBearerToken(req);
    if (!token) return next();

    const decoded = verifyToken(token, process.env.JWT_ADMIN_SECRET, 'admin', ADMIN_ISSUER);
    const adminId = requireObjectId(decoded.id, 'admin token id');
    const admin = await Admin.findOne({
      _id: adminId,
      status: 'active',
      deletedAt: null,
    }).select('-password -twoFactorSecret');

    if (admin) {
      const business = await Business.findOne({ _id: admin.businessId, isActive: true }).select('_id');
      if (business) {
        req.admin = admin;
        req.businessId = admin.businessId;
      }
    }
  } catch {
    // Public endpoints remain public when no valid optional admin token is supplied.
  }
  next();
};
