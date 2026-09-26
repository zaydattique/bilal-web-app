import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import Account from '../models/Account.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Customer from '../models/Customer.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

router.get('/', protectAdmin, async (req, res) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.accountId) filter.accountId = req.query.accountId;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
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

    res.json({
      success: true,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    })
      .populate('customerId')
      .populate('accountId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
  try {
    const {
      accountId,
      paymentAmount,
      paymentMethod = 'cash',
      referenceNumber,
      notes,
      receivedBy,
      paymentDate,
    } = req.body;

    if (!accountId || !paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'accountId and positive paymentAmount are required',
      });
    }

    const account = await Account.findOne({ _id: accountId, businessId: req.businessId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (account.status === 'closed' || account.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Account is already closed/paid' });
    }

    const plan = await InstallmentPlan.findOne({ accountId: account._id, businessId: req.businessId });
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Installment plan not found' });
    }

    let remaining = Number(paymentAmount);
    const allocationDetails = [];
    const sorted = [...plan.installments].sort(
      (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    );

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
      } else if (inst.paidAmount > 0) {
        inst.status = 'partial';
      }

      allocationDetails.push({
        installmentId: inst._id,
        amountAllocated: allocate,
      });
    }

    const totalPaidOnPlan = plan.installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
    plan.totalPaid = totalPaidOnPlan + (account.downPayment || 0);
    plan.remainingAmount = Math.max(0, plan.remainingAmount - Number(paymentAmount) + remaining);
    plan.remainingInstallments = plan.installments.filter((i) => i.status !== 'paid').length;
    await plan.save();

    account.remainingAmount = Math.max(0, account.remainingAmount - Number(paymentAmount) + remaining);
    if (account.remainingAmount <= 0) {
      account.status = 'paid';
      account.closedDate = new Date();
    }
    await account.save();

    const customer = await Customer.findById(account.customerId);
    if (customer) {
      customer.totalDue = Math.max(0, (customer.totalDue || 0) - Number(paymentAmount) + remaining);
      customer.lastPaymentDate = new Date();
      await customer.save();
    }

    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const payment = await Payment.create({
      businessId: req.businessId,
      accountId: account._id,
      customerId: account.customerId,
      paymentAmount: Number(paymentAmount),
      paymentMethod,
      referenceNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      receivedBy: receivedBy || `${req.admin.firstName} ${req.admin.lastName}`,
      notes,
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
      changes: { amount: paymentAmount, accountId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const populated = await Payment.findById(payment._id)
      .populate('customerId', 'firstName lastName phoneNumber')
      .populate('accountId', 'accountNumber');

    res.status(201).json({ success: true, payment: populated, unallocated: remaining });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
