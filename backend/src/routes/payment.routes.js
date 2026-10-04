import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Account from '../models/Account.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Customer from '../models/Customer.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, requirePositiveNumber } from '../middleware/security.js';

const router = express.Router();
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'online'];

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const getIdempotencyKey = (value) => {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(key)) fail('A valid idempotencyKey is required');
  return key;
};

export const fingerprint = (data) => crypto
  .createHash('sha256')
  .update(JSON.stringify(data))
  .digest('hex');

const populatePayment = (query) => query
  .populate('customerId', 'firstName lastName phoneNumber')
  .populate('accountId', 'accountNumber');

export const assertSameRequest = (payment, requestFingerprint) => {
  if (payment.idempotencyFingerprint !== requestFingerprint) {
    fail('This idempotencyKey was already used for a different payment request', 409);
  }
};

export const normalizePaymentDate = (value) => {
  if (value === undefined || value === null || value === '') return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail('paymentDate is invalid');
  if (date.getTime() > Date.now() + 5 * 60 * 1000) fail('paymentDate cannot be in the future');
  return date;
};

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
      populatePayment(Payment.find(filter).sort({ paymentDate: -1, _id: -1 }).skip(skip).limit(limit)),
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
  const idempotencyKey = getIdempotencyKey(req.body?.idempotencyKey);
  const accountId = requireObjectId(req.body.accountId, 'account id');
  const paymentAmount = requirePositiveNumber(req.body.paymentAmount, 'paymentAmount');
  const paymentMethod = req.body.paymentMethod || 'cash';
  if (!PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ success: false, message: 'Invalid payment method' });

  const paymentDate = normalizePaymentDate(req.body.paymentDate);
  const requestFingerprint = fingerprint({
    accountId: String(accountId),
    paymentAmount,
    paymentMethod,
    referenceNumber: req.body.referenceNumber || null,
    notes: req.body.notes || null,
    paymentDate: paymentDate.toISOString(),
  });

  try {
    assertAllowedFields(req.body, [
      'accountId', 'paymentAmount', 'paymentMethod', 'referenceNumber', 'notes', 'paymentDate', 'idempotencyKey',
    ]);

    const existing = await Payment.findOne({ businessId: req.businessId, idempotencyKey });
    if (existing) {
      assertSameRequest(existing, requestFingerprint);
      return res.status(200).json({ success: true, replayed: true, payment: await populatePayment(Payment.findById(existing._id)) });
    }

    const payment = await mongoose.connection.transaction(async (session) => {
      const existingInTransaction = await Payment.findOne({
        businessId: req.businessId,
        idempotencyKey,
      }).session(session);

      if (existingInTransaction) {
        assertSameRequest(existingInTransaction, requestFingerprint);
        return existingInTransaction;
      }

      const account = await Account.findOne({
        _id: accountId,
        businessId: req.businessId,
        status: { $nin: ['closed', 'paid'] },
      }).session(session);
      if (!account) fail('Account not found or already paid/closed', 404);

      if (paymentAmount > account.remainingAmount + 0.01) {
        fail('Payment amount cannot exceed the account balance');
      }

      const plan = await InstallmentPlan.findOne({
        accountId: account._id,
        businessId: req.businessId,
      }).session(session);
      if (!plan) fail('Installment plan not found', 400);

      const customer = await Customer.findOne({
        _id: account.customerId,
        businessId: req.businessId,
        status: { $ne: 'blacklisted' },
      }).session(session);
      if (!customer) fail('Account customer not found', 400);

      let remaining = paymentAmount;
      const allocationDetails = [];
      const sorted = [...plan.installments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      for (const inst of sorted) {
        if (remaining <= 0) break;
        const dueLeft = inst.dueAmount - (inst.paidAmount || 0);
        if (dueLeft <= 0) continue;

        const allocate = Math.min(remaining, dueLeft);
        allocationDetails.push({
          installmentId: inst._id,
          amountAllocated: allocate,
          previousStatus: inst.status,
          previousPaidDate: inst.paidDate,
        });

        inst.paidAmount = (inst.paidAmount || 0) + allocate;
        remaining -= allocate;

        if (inst.paidAmount >= inst.dueAmount - 0.01) {
          inst.paidAmount = inst.dueAmount;
          inst.status = 'paid';
          inst.paidDate = new Date();
        } else {
          inst.status = 'partial';
          inst.paidDate = undefined;
        }
      }

      if (remaining > 0.01) fail('Payment could not be fully allocated; no partial overpayment is accepted');

      const totalPaidOnPlan = plan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
      plan.totalPaid = totalPaidOnPlan + (account.downPayment || 0);
      plan.remainingAmount = Math.max(0, plan.remainingAmount - paymentAmount);
      plan.remainingInstallments = plan.installments.filter((i) => i.status !== 'paid').length;
      await plan.save({ session });

      const accountStatusBefore = account.status;
      const accountClosedDateBefore = account.closedDate;
      account.remainingAmount = Math.max(0, account.remainingAmount - paymentAmount);
      if (account.remainingAmount <= 0.01) {
        account.remainingAmount = 0;
        account.status = 'paid';
        account.closedDate = new Date();
      }
      await account.save({ session });

      customer.totalDue = Math.max(0, (customer.totalDue || 0) - paymentAmount);
      customer.lastPaymentDate = new Date();
      await customer.save({ session });

      const [created] = await Payment.create([{
        businessId: req.businessId,
        accountId: account._id,
        customerId: account.customerId,
        paymentAmount,
        paymentMethod,
        referenceNumber: req.body.referenceNumber ? String(req.body.referenceNumber).trim() : undefined,
        paymentDate,
        receivedBy: `${req.admin.firstName} ${req.admin.lastName}`.trim(),
        notes: req.body.notes ? String(req.body.notes).trim() : undefined,
        receiptNumber: `RCP-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`,
        idempotencyKey,
        idempotencyFingerprint: requestFingerprint,
        accountStatusBefore,
        accountClosedDateBefore,
        status: 'confirmed',
        allocationDetails,
      }], { session });

      return created;
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'create',
      entityType: 'payment',
      entityId: payment._id,
      changes: { amount: payment.paymentAmount, accountId: payment.accountId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, replayed: false, payment: await populatePayment(Payment.findById(payment._id)) });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
      const existing = await Payment.findOne({ businessId: req.businessId, idempotencyKey });
      if (existing) {
        assertSameRequest(existing, requestFingerprint);
        return res.status(200).json({ success: true, replayed: true, payment: await populatePayment(Payment.findById(existing._id)) });
      }
    }
    next(error);
  }
});

router.post('/:id/reverse', protectAdmin, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    if (Object.keys(req.body || {}).length) assertAllowedFields(req.body, []);
    const paymentId = requireObjectId(req.params.id, 'payment id');

    const reversed = await mongoose.connection.transaction(async (session) => {
      const payment = await Payment.findOne({
        _id: paymentId,
        businessId: req.businessId,
        status: 'confirmed',
      }).session(session);
      if (!payment) fail('Confirmed payment not found', 404);

      const laterPayment = await Payment.exists({
        businessId: req.businessId,
        accountId: payment.accountId,
        status: 'confirmed',
        createdAt: { $gt: payment.createdAt },
      });
      if (laterPayment) {
        fail('Payment cannot be reversed after a later confirmed payment has been posted');
      }

      if (!payment.allocationDetails?.length) {
        fail('This legacy payment has no reversible allocation history');
      }

      const allocationTotal = payment.allocationDetails.reduce((sum, item) => sum + item.amountAllocated, 0);
      if (Math.abs(allocationTotal - payment.paymentAmount) > 0.01) {
        fail('Payment allocation history is inconsistent');
      }

      const account = await Account.findOne({ _id: payment.accountId, businessId: req.businessId }).session(session);
      const plan = await InstallmentPlan.findOne({ accountId: payment.accountId, businessId: req.businessId }).session(session);
      const customer = await Customer.findOne({ _id: payment.customerId, businessId: req.businessId }).session(session);
      if (!account || !plan || !customer) fail('Payment relationships are incomplete', 409);

      for (const allocation of payment.allocationDetails) {
        if (!allocation.previousStatus) fail('This legacy payment does not contain enough history for a safe reversal', 409);
        const inst = plan.installments.id(allocation.installmentId);
        if (!inst) fail('Payment allocation references a missing installment', 409);
        if ((inst.paidAmount || 0) + 0.01 < allocation.amountAllocated) {
          fail('Installment balance is inconsistent; payment cannot be safely reversed', 409);
        }

        inst.paidAmount = Math.max(0, (inst.paidAmount || 0) - allocation.amountAllocated);
        inst.status = allocation.previousStatus;
        inst.paidDate = allocation.previousPaidDate;
      }

      plan.totalPaid = plan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0) + (account.downPayment || 0);
      plan.remainingAmount = Math.min(account.totalAmount - (account.downPayment || 0), plan.remainingAmount + payment.paymentAmount);
      plan.remainingInstallments = plan.installments.filter((i) => i.status !== 'paid').length;
      await plan.save({ session });

      account.remainingAmount = Math.min(account.totalAmount - (account.downPayment || 0), account.remainingAmount + payment.paymentAmount);
      account.status = payment.accountStatusBefore;
      account.closedDate = payment.accountClosedDateBefore;
      await account.save({ session });

      const previousPayment = await Payment.findOne({
        businessId: req.businessId,
        accountId: payment.accountId,
        status: 'confirmed',
        createdAt: { $lt: payment.createdAt },
      }).sort({ createdAt: -1 }).session(session);

      customer.totalDue = (customer.totalDue || 0) + payment.paymentAmount;
      customer.lastPaymentDate = previousPayment?.paymentDate || null;
      await customer.save({ session });

      payment.status = 'reversed';
      payment.reversedAt = new Date();
      payment.reversedBy = req.admin._id;
      await payment.save({ session });

      return payment;
    });

    await logAction({
      businessId: req.businessId,
      adminId: req.admin._id,
      action: 'reverse',
      entityType: 'payment',
      entityId: reversed._id,
      changes: { amount: reversed.paymentAmount },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, payment: await populatePayment(Payment.findById(reversed._id)) });
  } catch (error) { next(error); }
});

export default router;
