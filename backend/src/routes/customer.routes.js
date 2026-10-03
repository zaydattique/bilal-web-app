import express from 'express';
import Customer from '../models/Customer.js';
import Account from '../models/Account.js';
import Payment from '../models/Payment.js';
import Business from '../models/Business.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, requireString } from '../middleware/security.js';

const router = express.Router();

const CUSTOMER_FIELDS = [
  'firstName', 'lastName', 'email', 'phoneNumber', 'cnic', 'dateOfBirth', 'gender',
  'address', 'guarantor', 'customerType', 'status',
];

const allocateCustomerNumber = async (businessId) => {
  const business = await Business.findOneAndUpdate(
    { _id: businessId, isActive: true, customerCount: { $lt: 200 } },
    { $inc: { customerCount: 1, customerSequence: 1 } },
    { new: true }
  ).select('customerSequence');

  if (!business) {
    const error = new Error('Customer limit of 200 has been reached');
    error.statusCode = 409;
    throw error;
  }

  return `CUS-${String(business.customerSequence).padStart(5, '0')}`;
};

const releaseCustomerReservation = async (businessId) => {
  await Business.updateOne(
    { _id: businessId, customerCount: { $gt: 0 } },
    { $inc: { customerCount: -1 } }
  );
};

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const s = String(req.query.search).trim().slice(0, 100);
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { phoneNumber: { $regex: escaped, $options: 'i' } },
        { cnic: { $regex: escaped, $options: 'i' } },
        { accountNumber: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({ success: true, customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protectAdmin, async (req, res, next) => {
  try {
    const id = requireObjectId(req.params.id, 'customer id');
    const customer = await Customer.findOne({ _id: id, businessId: req.businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (error) { next(error); }
});

router.get('/:id/accounts', protectAdmin, async (req, res, next) => {
  try {
    const customerId = requireObjectId(req.params.id, 'customer id');
    const customer = await Customer.exists({ _id: customerId, businessId: req.businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const accounts = await Account.find({ customerId, businessId: req.businessId })
      .populate('installmentPlanId')
      .sort({ createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (error) { next(error); }
});

router.get('/:id/payments', protectAdmin, async (req, res, next) => {
  try {
    const customerId = requireObjectId(req.params.id, 'customer id');
    const customer = await Customer.exists({ _id: customerId, businessId: req.businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const payments = await Payment.find({ customerId, businessId: req.businessId })
      .populate('accountId', 'accountNumber')
      .sort({ paymentDate: -1 });
    res.json({ success: true, payments });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  let reserved = false;
  try {
    assertAllowedFields(req.body, CUSTOMER_FIELDS);

    const firstName = requireString(req.body.firstName, 'firstName', { max: 100 });
    const lastName = requireString(req.body.lastName, 'lastName', { max: 100 });
    const phoneNumber = requireString(req.body.phoneNumber, 'phoneNumber', { max: 32 });
    const cnic = requireString(req.body.cnic, 'cnic', { max: 32 });

    if (req.body.gender !== undefined && !['M', 'F', 'O'].includes(req.body.gender)) {
      return res.status(400).json({ success: false, message: 'Invalid gender' });
    }
    if (req.body.customerType !== undefined && !['individual', 'business'].includes(req.body.customerType)) {
      return res.status(400).json({ success: false, message: 'Invalid customer type' });
    }

    const existingCnic = await Customer.exists({ businessId: req.businessId, cnic });
    if (existingCnic) return res.status(409).json({ success: false, message: 'CNIC already registered' });

    const accountNumber = await allocateCustomerNumber(req.businessId);
    reserved = true;

    const customer = await Customer.create({
      businessId: req.businessId,
      accountNumber,
      firstName,
      lastName,
      email: req.body.email,
      phoneNumber,
      cnic,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      guarantor: req.body.guarantor,
      customerType: req.body.customerType || 'individual',
      status: req.body.status || 'active',
    });

    reserved = false;
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
    if (reserved) await releaseCustomerReservation(req.businessId).catch(() => {});
    next(error);
  }
});

router.put('/:id', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, CUSTOMER_FIELDS);
    const customerId = requireObjectId(req.params.id, 'customer id');
    const customer = await Customer.findOne({ _id: customerId, businessId: req.businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (req.body.cnic !== undefined && req.body.cnic !== customer.cnic) {
      const duplicate = await Customer.exists({
        businessId: req.businessId,
        cnic: req.body.cnic,
        _id: { $ne: customerId },
      });
      if (duplicate) return res.status(409).json({ success: false, message: 'CNIC already registered' });
    }

    for (const field of CUSTOMER_FIELDS) {
      if (req.body[field] !== undefined) customer[field] = req.body[field];
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
  } catch (error) { next(error); }
});

router.delete('/:id', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const customerId = requireObjectId(req.params.id, 'customer id');
    const customer = await Customer.findOne({ _id: customerId, businessId: req.businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    customer.status = 'inactive';
    await customer.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'delete',
      entityType: 'customer',
      entityId: customer._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) { next(error); }
});

export default router;
