import express from 'express';
import { isValidObjectId } from 'mongoose';
import Account from '../models/Account.js';
import Payment from '../models/Payment.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import { protectCustomer } from '../middleware/auth.js';

const router = express.Router();

const noStore = (res) => res.set('Cache-Control', 'private, no-store');

router.get('/accounts', protectCustomer, async (req, res, next) => {
  try {
    const accounts = await Account.find({
      customerId: req.customer._id,
      businessId: req.businessId,
    })
      .select('_id accountNumber productId productNameSnapshot totalAmount downPayment remainingAmount status installmentPlanId createdDate closedDate')
      .populate('productId', 'name slug')
      .populate('installmentPlanId', 'numberOfInstallments installments totalInstallments totalPaid remainingInstallments remainingAmount')
      .sort({ createdAt: -1 })
      .lean();

    noStore(res);
    res.json({ success: true, accounts });
  } catch (error) { next(error); }
});

router.get('/accounts/:id', protectCustomer, async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      customerId: req.customer._id,
      businessId: req.businessId,
    })
      .select('_id accountNumber productId productNameSnapshot totalAmount downPayment remainingAmount status installmentPlanId createdDate closedDate')
      .populate('productId', 'name slug shortDescription media').populate({ path: 'productId', populate: { path: 'media', select: 'publicUrl altText width height purpose' } })
      .populate('installmentPlanId', 'numberOfInstallments installments totalInstallments totalPaid remainingInstallments remainingAmount')
      .lean();

    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    noStore(res);
    res.json({ success: true, account });
  } catch (error) { next(error); }
});

router.get('/payments', protectCustomer, async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const payments = await Payment.find({
      customerId: req.customer._id,
      businessId: req.businessId,
      status: 'confirmed',
    })
      .select('_id accountId paymentAmount paymentMethod referenceNumber paymentDate receiptNumber allocationDetails')
      .populate('accountId', 'accountNumber productNameSnapshot')
      .sort({ paymentDate: -1, _id: -1 })
      .limit(limit)
      .lean();

    noStore(res);
    res.json({ success: true, payments });
  } catch (error) { next(error); }
});

router.get('/dues', protectCustomer, async (req, res, next) => {
  try {
    const accounts = await Account.find({
      customerId: req.customer._id,
      businessId: req.businessId,
      status: { $in: ['active', 'defaulted'] },
    }).select('_id').lean();

    const accountIds = accounts.map((account) => account._id);
    const plans = await InstallmentPlan.find({
      accountId: { $in: accountIds },
      businessId: req.businessId,
    }).select('accountId installments').lean();

    const now = new Date();
    const dues = [];
    for (const plan of plans) {
      for (const installment of plan.installments) {
        if (installment.status === 'paid') continue;
        const remaining = Math.max(0, installment.dueAmount - (installment.paidAmount || 0));
        if (remaining <= 0) continue;
        dues.push({
          accountId: plan.accountId,
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          dueAmount: installment.dueAmount,
          paidAmount: installment.paidAmount || 0,
          remaining,
          status: installment.dueDate < now ? 'overdue' : installment.status,
        });
      }
    }
    dues.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    noStore(res);
    res.json({ success: true, dues: dues.slice(0, 100) });
  } catch (error) { next(error); }
});

export default router;
