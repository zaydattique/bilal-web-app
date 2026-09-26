import express from 'express';
import Account from '../models/Account.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Customer from '../models/Customer.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = express.Router();

const nextAccountNumber = async (businessId) => {
  const count = await Account.countDocuments({ businessId });
  return `ACC-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', protectAdmin, async (req, res) => {
  try {
    const filter = { businessId: req.businessId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = req.query.customerId;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
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

    res.json({
      success: true,
      accounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    })
      .populate('customerId')
      .populate('installmentPlanId');

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
  try {
    const { customerId, totalAmount, downPayment = 0, installments } = req.body;

    if (!customerId || totalAmount == null || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'customerId, totalAmount and installments[] are required',
      });
    }

    const customer = await Customer.findOne({ _id: customerId, businessId: req.businessId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const remainingAmount = totalAmount - downPayment;
    const installmentSum = installments.reduce((s, i) => s + Number(i.dueAmount || 0), 0);
    if (Math.abs(installmentSum - remainingAmount) > 1) {
      return res.status(400).json({
        success: false,
        message: `Installment amounts sum (${installmentSum}) must equal remaining (${remainingAmount})`,
      });
    }

    const accountNumber = await nextAccountNumber(req.businessId);

    const account = await Account.create({
      businessId: req.businessId,
      customerId,
      accountNumber,
      totalAmount,
      downPayment,
      remainingAmount,
      status: 'active',
    });

    const planInstallments = installments.map((inst, idx) => ({
      installmentNumber: idx + 1,
      dueDate: new Date(inst.dueDate),
      dueAmount: Number(inst.dueAmount),
      paidAmount: 0,
      status: 'pending',
    }));

    const plan = await InstallmentPlan.create({
      businessId: req.businessId,
      accountId: account._id,
      numberOfInstallments: planInstallments.length,
      installments: planInstallments,
      totalInstallments: planInstallments.length,
      totalPaid: downPayment,
      remainingInstallments: planInstallments.length,
      remainingAmount,
    });

    account.installmentPlanId = plan._id;
    await account.save();

    customer.totalAccounts = (customer.totalAccounts || 0) + 1;
    customer.totalDue = (customer.totalDue || 0) + remainingAmount;
    await customer.save();

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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/status', protectAdmin, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paid', 'defaulted', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const account = await Account.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
