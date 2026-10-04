import mongoose from 'mongoose';
import Business from '../models/Business.js';

export const isObjectId = (value) => mongoose.isValidObjectId(value);

export const requireObjectId = (value, fieldName = 'id') => {
  if (!isObjectId(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(value);
};

export const assertAllowedFields = (body, allowedFields) => {
  const unknown = Object.keys(body || {}).filter((key) => !allowedFields.includes(key));
  if (unknown.length) {
    const error = new Error(`Unsupported fields: ${unknown.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

export const requireString = (value, fieldName, { min = 1, max = 255 } = {}) => {
  if (typeof value !== 'string') {
    const error = new Error(`${fieldName} must be a string`);
    error.statusCode = 400;
    throw error;
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    const error = new Error(`${fieldName} length is invalid`);
    error.statusCode = 400;
    throw error;
  }
  return trimmed;
};

export const requirePositiveNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    const error = new Error(`${fieldName} must be a positive number`);
    error.statusCode = 400;
    throw error;
  }
  return number;
};

const COOKIE_SESSION_NAMES = ['__Host-admin_session', '__Host-customer_session', 'admin_session', 'customer_session'];

const hasSessionCookie = (req) => {
  const header = req.headers.cookie || '';
  return COOKIE_SESSION_NAMES.some((name) =>
    header.split(';').some((part) => part.trim().startsWith(name + '='))
  );
};

const allowedOriginSet = () =>
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const requireSameOriginForCookieMutations = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !hasSessionCookie(req)) return next();

  const allowedOrigins = allowedOriginSet();
  const origin = req.get('origin');
  const referer = req.get('referer');

  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = null;
    }
  }

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({ success: false, message: 'Cross-site request blocked' });
  }

  next();
};

export const requireNonNegativeNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${fieldName} must be a non-negative number`);
    error.statusCode = 400;
    throw error;
  }
  return number;
};

export const resolvePublicBusiness = async (businessId) => {
  requireObjectId(businessId, 'businessId');
  const business = await Business.findOne({ _id: businessId, isActive: true }).select('_id businessSlug');
  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = 404;
    throw error;
  }
  return business;
};
