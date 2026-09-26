import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';

export const protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || admin.status !== 'active' || admin.deletedAt) {
      return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
    }

    req.admin = admin;
    req.businessId = admin.businessId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const protectCustomer = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_CUSTOMER_SECRET);
    const customer = await Customer.findById(decoded.id);
    if (!customer || customer.status === 'blacklisted' || customer.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Customer not found or inactive' });
    }

    req.customer = customer;
    req.businessId = customer.businessId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization?.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      const admin = await Admin.findById(decoded.id).select('-password');
      if (admin) {
        req.admin = admin;
        req.businessId = admin.businessId;
      }
    }
  } catch (_) {}
  next();
};
