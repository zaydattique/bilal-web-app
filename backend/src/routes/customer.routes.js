import express from 'express';
import Customer from '../models/Customer.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

// Generate next account number for a business
const nextAccountNumber = async (businessId) => {
  const count = await Customer.countDocuments({ businessId });
  return `CUS-${String(count + 1).padStart(5, '0')}`;
};

// List customers
router.get('/', protectAdmin, async (req, res) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const s = req.query.search;
      filter.$or = [
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { phoneNumber: { $regex: s, $options: 'i' } },
        { cnic: { $regex: s, $options: 'i' } },
        { accountNumber: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single customer
router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create customer
router.post('/', protectAdmin, requireRole('owner', 'admin', 'manager', 'sales'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      cnic,
      dateOfBirth,
      gender,
      address,
      guarantor,
      customerType,
      status,
    } = req.body;

    if (!firstName || !lastName || !phoneNumber || !cnic) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, phoneNumber and cnic are required',
      });
    }

    const existingCnic = await Customer.findOne({ businessId: req.businessId, cnic });
    if (existingCnic) {
      return res.status(400).json({ success: false, message: 'CNIC already registered' });
    }

    const accountNumber = await nextAccountNumber(req.businessId);

    const customer = await Customer.create({
      businessId: req.businessId,
      accountNumber,
      firstName,
      lastName,
      email,
      phoneNumber,
      cnic,
      dateOfBirth,
      gender,
      address,
      guarantor,
      customerType: customerType || 'individual',
      status: status || 'active',
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'customer',
      entityId: customer._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update customer
router.put('/:id', protectAdmin, requireRole('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const fields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'cnic',
      'dateOfBirth',
      'gender',
      'address',
      'guarantor',
      'customerType',
      'status',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) customer[f] = req.body[f];
    }

    await customer.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'customer',
      entityId: customer._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
