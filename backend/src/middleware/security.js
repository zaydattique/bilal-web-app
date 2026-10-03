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

export const pickDefined = (body, fields) =>
  Object.fromEntries(fields.filter((field) => body?.[field] !== undefined).map((field) => [field, body[field]]));

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
