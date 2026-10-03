import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import Account from '../models/Account.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Customer from '../models/Customer.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, requirePositiveNumber } from '../middleware/security.js';

const router = express.Router();

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.accountId) filter.accountId = requireObjectId(req.query.accountId, 'account id');
    if (req.query.customerId) filter.customerId = requireObjectId(req.query.customerId, 'customer id');
    if (req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('customerId', 'firstName lastName phoneNumber')
        .populate('accountId', 'accountNumber')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', protectAdmin, async (req, res, next) => {
  try {
    const paymentId = requireObjectId(req.params.id, 'payment id');
    const payment = await Payment.findOne({ _id: paymentId, businessId: req.businessId })
      .populate('customerId')
      .populate('accountId');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, [
      'accountId', 'paymentAmount', 'paymentMethod', 'referenceNumber', 'notes', 'paymentDate',
    ]);

    const accountId = requireObjectId(req.body.accountId, 'account id');
    const paymentAmount = requirePositiveNumber(req.body.paymentAmount, 'paymentAmount');
    const paymentMethod = req.body.paymentMethod || 'cash';
    if (!['cash', 'bank_transfer', 'cheque', 'online'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const account = await Account.findOne({ _id: accountId, businessId: req.businessId });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (['closed', 'paid'].includes(account.status)) {
      return res.status(400).json({ success: false, message: 'Account is already closed/paid' });
    }

    const plan = await InstallmentPlan.findOne({ accountId: account._id, businessId: req.businessId });
    if (!plan) return res.status(400).json({ success: false, message: 'Installment plan not found' });

    const customer = await Customer.findOne({
      _id: account.customerId,
      businessId: req.businessId,
      status: { $ne: 'blacklisted' },
    });
    if (!customer) return res.status(400).json({ success: false, message: 'Account customer not found' });

    let remaining = paymentAmount;
    const allocationDetails = [];
    const sorted = [...plan.installments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    for (const inst of sorted) {
      if (remaining <= 0) break;
      if (inst.status === 'paid') continue;

      const dueLeft = inst.dueAmount - (inst.paidAmount || 0);
      if (dueLeft <= 0) continue;

      const allocate = Math.min(remaining, dueLeft);
      inst.paidAmount = (inst.paidAmount || 0) + allocate;
      remaining -= allocate;

      if (inst.paidAmount >= inst.dueAmount) {
        inst.status = 'paid';
        inst.paidDate = new Date();
      } else {
        inst.status = 'partial';
      }

      allocationDetails.push({ installmentId: inst._id, amountAllocated: allocate });
    }

    const totalAllocated = paymentAmount - remaining;
    if (totalAllocated <= 0) {
      return res.status(400).json({ success: false, message: 'Payment cannot be allocated to this account' });
    }

    const totalPaidOnPlan = plan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    plan.totalPaid = totalPaidOnPlan + (account.downPayment || 0);
    plan.remainingAmount = Math.max(0, plan.remainingAmount - totalAllocated);
    plan.remainingInstallments = plan.installments.filter((i) => i.status !== 'paid').length;
    await plan.save();

    account.remainingAmount = Math.max(0, account.remainingAmount - totalAllocated);
    if (account.remainingAmount <= 0) {
      account.status = 'paid';
      account.closedDate = new Date();
    }
    await account.save();

    customer.totalDue = Math.max(0, (customer.totalDue || 0) - totalAllocated);
    customer.lastPaymentDate = new Date();
    await customer.save();

    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
    const payment = await Payment.create({
      businessId: req.businessId,
      accountId: account._id,
      customerId: account.customerId,
      paymentAmount: totalAllocated,
      paymentMethod,
      referenceNumber: req.body.referenceNumber,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      receivedBy: `${req.admin.firstName} ${req.admin.lastName}`,
      notes: req.body.notes,
      receiptNumber,
      status: 'confirmed',
      allocationDetails,
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'payment',
      entityId: payment._id,
      changes: { amount: totalAllocated, accountId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const populated = await Payment.findById(payment._id)
      .populate('customerId', 'firstName lastName phoneNumber')
      .populate('accountId', 'accountNumber');

    res.status(201).json({
      success: true,
      payment: populated,
      unallocated: remaining,
    });
  } catch (error) { next(error); }
});

export default router;
