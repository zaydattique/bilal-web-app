import express from 'express';
import Account from '../models/Account.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import {
  assertAllowedFields,
  requireObjectId,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from '../middleware/security.js';

const router = express.Router();

const allocateAccountNumber = async (businessId) => {
  const business = await Business.findOneAndUpdate(
    { _id: businessId, isActive: true },
    { $inc: { accountSequence: 1 } },
    { new: true }
  ).select('accountSequence');

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = 404;
    throw error;
  }

  return `ACC-${String(business.accountSequence).padStart(5, '0')}`;
};

router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = requireObjectId(req.query.customerId, 'customer id');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      Account.find(filter)
        .populate('customerId', 'firstName lastName phoneNumber accountNumber')
        .populate('installmentPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Account.countDocuments(filter),
    ]);

    res.json({ success: true, accounts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', protectAdmin, async (req, res, next) => {
  try {
    const accountId = requireObjectId(req.params.id, 'account id');
    const account = await Account.findOne({ _id: accountId, businessId: req.businessId })
      .populate('customerId')
      .populate('installmentPlanId');

    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, account });
  } catch (error) { next(error); }
});

router.get('/:id/plan', protectAdmin, async (req, res, next) => {
  try {
    const accountId = requireObjectId(req.params.id, 'account id');
    const account = await Account.findOne({ _id: accountId, businessId: req.businessId });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const plan = await InstallmentPlan.findOne({ accountId, businessId: req.businessId });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const now = new Date();
    let dirty = false;
    for (const inst of plan.installments) {
      if (
        (inst.status === 'pending' || inst.status === 'partial') &&
        inst.dueDate < now &&
        (inst.paidAmount || 0) < inst.dueAmount
      ) {
        inst.status = 'overdue';
        dirty = true;
      }
    }
    if (dirty) await plan.save();

    res.json({ success: true, plan, account });
  } catch (error) { next(error); }
});

router.get('/:id/plan/due-list', protectAdmin, async (req, res, next) => {
  try {
    const accountId = requireObjectId(req.params.id, 'account id');
    const plan = await InstallmentPlan.findOne({ accountId, businessId: req.businessId });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const now = new Date();
    const dues = plan.installments
      .filter((i) => i.status !== 'paid')
      .map((i) => ({
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        dueAmount: i.dueAmount,
        paidAmount: i.paidAmount || 0,
        remaining: Math.max(0, i.dueAmount - (i.paidAmount || 0)),
        status: i.dueDate < now ? 'overdue' : i.status,
      }))
      .filter((i) => i.remaining > 0)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({ success: true, dues });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['customerId', 'totalAmount', 'downPayment', 'installments']);

    const customerId = requireObjectId(req.body.customerId, 'customer id');
    const totalAmount = requirePositiveNumber(req.body.totalAmount, 'totalAmount');
    const downPayment = requireNonNegativeNumber(req.body.downPayment ?? 0, 'downPayment');
    const installments = req.body.installments;

    if (!Array.isArray(installments) || installments.length < 1 || installments.length > 60) {
      return res.status(400).json({ success: false, message: 'installments must contain between 1 and 60 items' });
    }
    if (downPayment >= totalAmount) {
      return res.status(400).json({ success: false, message: 'downPayment must be less than totalAmount' });
    }

    const customer = await Customer.findOne({ _id: customerId, businessId: req.businessId, status: 'active' });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const normalizedInstallments = installments.map((inst, index) => {
      if (!inst || typeof inst !== 'object') {
        const error = new Error(`Invalid installment at index ${index}`);
        error.statusCode = 400;
        throw error;
      }
      const dueAmount = requirePositiveNumber(inst.dueAmount, `installment[${index}].dueAmount`);
      const dueDate = new Date(inst.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        const error = new Error(`Invalid installment[${index}].dueDate`);
        error.statusCode = 400;
        throw error;
      }
      return { installmentNumber: index + 1, dueDate, dueAmount, paidAmount: 0, status: 'pending' };
    });

    const remainingAmount = totalAmount - downPayment;
    const installmentSum = normalizedInstallments.reduce((sum, item) => sum + item.dueAmount, 0);
    if (Math.abs(installmentSum - remainingAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Installment amounts must equal the amount remaining after down payment',
      });
    }

    const accountNumber = await allocateAccountNumber(req.businessId);
    const account = await Account.create({
      businessId: req.businessId,
      customerId,
      accountNumber,
      totalAmount,
      downPayment,
      remainingAmount,
      status: 'active',
    });

    const plan = await InstallmentPlan.create({
      businessId: req.businessId,
      accountId: account._id,
      numberOfInstallments: normalizedInstallments.length,
      installments: normalizedInstallments,
      totalInstallments: normalizedInstallments.length,
      totalPaid: downPayment,
      remainingInstallments: normalizedInstallments.length,
      remainingAmount,
    });

    account.installmentPlanId = plan._id;
    await account.save();

    await Customer.updateOne(
      { _id: customer._id, businessId: req.businessId },
      { $inc: { totalAccounts: 1, totalDue: remainingAmount } }
    );

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'account',
      entityId: account._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const populated = await Account.findById(account._id)
      .populate('customerId')
      .populate('installmentPlanId');

    res.status(201).json({ success: true, account: populated });
  } catch (error) { next(error); }
});

router.patch('/:id/status', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    assertAllowedFields(req.body, ['status']);
    const accountId = requireObjectId(req.params.id, 'account id');
    const { status } = req.body;
    if (!['active', 'paid', 'defaulted', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const account = await Account.findOne({ _id: accountId, businessId: req.businessId });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    account.status = status;
    if (status === 'closed' || status === 'paid') account.closedDate = new Date();
    await account.save();

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'update',
      entityType: 'account',
      entityId: account._id,
      changes: { status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, account });
  } catch (error) { next(error); }
});

router.post('/:id/close', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res, next) => {
  try {
    if (Object.keys(req.body || {}).length) {
      assertAllowedFields(req.body, []);
    }
    const accountId = requireObjectId(req.params.id, 'account id');
    const account = await Account.findOne({ _id: accountId, businessId: req.businessId });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    if (account.remainingAmount > 0 && account.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot close account with remaining balance' });
    }

    account.status = 'closed';
    account.closedDate = new Date();
    await account.save();
    res.json({ success: true, account });
  } catch (error) { next(error); }
});

export default router;
