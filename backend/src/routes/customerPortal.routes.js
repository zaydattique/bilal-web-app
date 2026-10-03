import express from 'express';
import Account from '../models/Account.js';
import Payment from '../models/Payment.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import { protectCustomer } from '../middleware/auth.js';

const router = express.Router();

// My accounts
router.get('/accounts', protectCustomer, async (req, res, next) => {
  try {
    const accounts = await Account.find({
      customerId: req.customer._id,
      businessId: req.businessId,
    })
      .populate('installmentPlanId')
      .sort({ createdAt: -1 });

    res.json({ success: true, accounts });
  } catch (error) {
    next(error);
  }
});

// Single account + schedule
router.get('/accounts/:id', protectCustomer, async (req, res, next) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      customerId: req.customer._id,
      businessId: req.businessId,
    }).populate('installmentPlanId');

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, account });
  } catch (error) {
    next(error);
  }
});

// Payment history
router.get('/payments', protectCustomer, async (req, res, next) => {
  try {
    const payments = await Payment.find({
      customerId: req.customer._id,
      businessId: req.businessId,
      status: 'confirmed',
    })
      .populate('accountId', 'accountNumber')
      .sort({ paymentDate: -1 })
      .limit(50);

    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
});

// Upcoming dues across all accounts
router.get('/dues', protectCustomer, async (req, res, next) => {
  try {
    const accounts = await Account.find({
      customerId: req.customer._id,
      businessId: req.businessId,
      status: 'active',
    }).select('_id');

    const accountIds = accounts.map((a) => a._id);
    const plans = await InstallmentPlan.find({
      accountId: { $in: accountIds },
      businessId: req.businessId,
    });

    const now = new Date();
    const dues = [];
    for (const plan of plans) {
      for (const inst of plan.installments) {
        if (inst.status === 'paid') continue;
        const remaining = inst.dueAmount - (inst.paidAmount || 0);
        if (remaining <= 0) continue;
        dues.push({
          accountId: plan.accountId,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          remaining,
          status: inst.dueDate < now ? 'overdue' : inst.status,
        });
      }
    }
    dues.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({ success: true, dues });
  } catch (error) {
    next(error);
  }
});

export default router;
