import jwt from 'jsonwebtoken';

const ISSUER = 'bilal-installment-platform';

const requireSecret = (name) => {
  const secret = process.env[name];
  if (!secret || secret.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return secret;
};

export const generateAdminToken = (id) =>
  jwt.sign({ id: String(id) }, requireSecret('JWT_ADMIN_SECRET'), {
    expiresIn: '7d',
    issuer: ISSUER,
    audience: 'admin',
  });

export const generateCustomerToken = (id) =>
  jwt.sign({ id: String(id) }, requireSecret('JWT_CUSTOMER_SECRET'), {
    expiresIn: '30d',
    issuer: ISSUER,
    audience: 'customer',
  });
