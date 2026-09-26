import jwt from 'jsonwebtoken';

export const generateAdminToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ADMIN_SECRET, { expiresIn: '7d' });
};

export const generateCustomerToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_CUSTOMER_SECRET, { expiresIn: '30d' });
};
