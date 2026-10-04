import express from 'express';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Account from '../models/Account.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

const oid = (id) => new mongoose.Types.ObjectId(id);

// Daily/monthly collections trend
router.get('/collections', protectAdmin, async (req, res, next) => {
  try {
    const businessId = oid(req.businessId);
    const days = Math.min(90, parseInt(req.query.days) || 30);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const trend = await Payment.aggregate([
      {
        $match: {
          businessId,
          status: 'confirmed',
          paymentDate: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' },
          },
          total: { $sum: '$paymentAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          count: 1,
        },
      },
    ]);

    const totalCollected = trend.reduce((s, d) => s + d.total, 0);

    res.json({ success: true, days, totalCollected, trend });
  } catch (error) {
    next(error);
  }
});

// Customer report
router.get('/customers', protectAdmin, async (req, res, next) => {
  try {
    const businessId = req.businessId;

    const [byStatus, topDue, recent] = await Promise.all([
      Customer.aggregate([
        { $match: { businessId: oid(businessId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Customer.find({ businessId, totalDue: { $gt: 0 } })
        .sort({ totalDue: -1 })
        .limit(10)
        .select('firstName lastName phoneNumber totalDue totalAccounts accountNumber'),
      Customer.find({ businessId }).sort({ createdAt: -1 }).limit(10).select(
        'firstName lastName phoneNumber accountNumber registeredDate status'
      ),
    ]);

    res.json({
      success: true,
      byStatus,
      topDueCustomers: topDue,
      recentCustomers: recent,
    });
  } catch (error) {
    next(error);
  }
});

// Product report
router.get('/products', protectAdmin, async (req, res, next) => {
  try {
    const products = await Product.find({ businessId: req.businessId })
      .populate('categoryId', 'name')
      .sort({ inventory: 1 })
      .select('name sku cashPrice inventory status featured categoryId');

    const lowStock = products.filter((p) => ['published','scheduled'].includes(p.status) && p.inventory <= 5);

    res.json({
      success: true,
      totalProducts: products.length,
      publishedProducts: products.filter((p) => p.status === 'published').length,
      lowStock,
      products,
    });
  } catch (error) {
    next(error);
  }
});

// Due list — upcoming and overdue
router.get('/due-list', protectAdmin, async (req, res, next) => {
  try {
    const businessId = oid(req.businessId);
    const now = new Date();
    const filter = req.query.filter || 'all'; // overdue | upcoming | all

    const matchInstallment = {
      'installments.status': { $in: ['pending', 'partial', 'overdue'] },
    };

    if (filter === 'overdue') {
      matchInstallment['installments.dueDate'] = { $lt: now };
    } else if (filter === 'upcoming') {
      const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      matchInstallment['installments.dueDate'] = { $gte: now, $lte: next30 };
    }

    const dues = await InstallmentPlan.aggregate([
      { $match: { businessId } },
      { $unwind: '$installments' },
      { $match: matchInstallment },
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      {
        $lookup: {
          from: 'customers',
          localField: 'account.customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          dueDate: '$installments.dueDate',
          dueAmount: '$installments.dueAmount',
          paidAmount: { $ifNull: ['$installments.paidAmount', 0] },
          remaining: {
            $subtract: [
              '$installments.dueAmount',
              { $ifNull: ['$installments.paidAmount', 0] },
            ],
          },
          status: '$installments.status',
          installmentNumber: '$installments.installmentNumber',
          accountNumber: '$account.accountNumber',
          accountId: '$account._id',
          accountStatus: '$account.status',
          customerName: {
            $concat: ['$customer.firstName', ' ', '$customer.lastName'],
          },
          phone: '$customer.phoneNumber',
          customerId: '$customer._id',
          isOverdue: { $lt: ['$installments.dueDate', now] },
        },
      },
      { $match: { remaining: { $gt: 0 }, accountStatus: 'active' } },
      { $sort: { dueDate: 1 } },
      { $limit: 200 },
    ]);

    const totalDue = dues.reduce((s, d) => s + d.remaining, 0);

    res.json({ success: true, filter, totalDue, count: dues.length, dues });
  } catch (error) {
    next(error);
  }
});

// Defaults / aging report
router.get('/defaults', protectAdmin, async (req, res, next) => {
  try {
    const businessId = oid(req.businessId);
    const now = new Date();

    const aging = await InstallmentPlan.aggregate([
      { $match: { businessId } },
      { $unwind: '$installments' },
      {
        $match: {
          'installments.status': { $in: ['pending', 'partial', 'overdue'] },
          'installments.dueDate': { $lt: now },
        },
      },
      {
        $addFields: {
          remaining: {
            $subtract: [
              '$installments.dueAmount',
              { $ifNull: ['$installments.paidAmount', 0] },
            ],
          },
          daysOverdue: {
            $divide: [{ $subtract: [now, '$installments.dueDate'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      { $match: { remaining: { $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$daysOverdue',
          boundaries: [0, 30, 60, 90, 180, 9999],
          default: '180+',
          output: {
            count: { $sum: 1 },
            amount: { $sum: '$remaining' },
          },
        },
      },
    ]);

    const defaultedAccounts = await Account.find({
      businessId: req.businessId,
      status: 'defaulted',
    })
      .populate('customerId', 'firstName lastName phoneNumber')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ success: true, aging, defaultedAccounts });
  } catch (error) {
    next(error);
  }
});

const REPORT_TYPES = new Set(['customers', 'products', 'collections', 'due-list', 'defaults']);

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const sendCsv = (res, filename, headers, rows) => {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
  });
  return res.send(csv);
};

router.get('/export/:type', protectAdmin, async (req, res, next) => {
  try {
    const type = String(req.params.type || '');
    if (!REPORT_TYPES.has(type)) return res.status(404).json({ success: false, message: 'Unknown report export' });

    const businessId = oid(req.businessId);

    if (type === 'customers') {
      const rows = await Customer.find({ businessId }).sort({ createdAt: -1 })
        .select('accountNumber firstName lastName phoneNumber status totalAccounts totalDue registeredDate').lean();
      return sendCsv(res, 'customers.csv',
        ['Account #', 'First name', 'Last name', 'Phone', 'Status', 'Accounts', 'Total due', 'Registered'],
        rows.map((x) => [x.accountNumber, x.firstName, x.lastName, x.phoneNumber, x.status, x.totalAccounts, x.totalDue, x.registeredDate]));
    }

    if (type === 'products') {
      const rows = await Product.find({ businessId }).populate('categoryId', 'name')
        .sort({ name: 1 }).select('name sku cashPrice inventory status featured categoryId').lean();
      return sendCsv(res, 'products.csv',
        ['Name', 'SKU', 'Cash price', 'Inventory', 'Status', 'Featured', 'Category'],
        rows.map((x) => [x.name, x.sku, x.cashPrice, x.inventory, x.status, x.featured, x.categoryId?.name || '']));
    }

    if (type === 'collections') {
      const days = Math.min(90, Math.max(1, Number.parseInt(req.query.days, 10) || 30));
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      const rows = await Payment.find({ businessId, status: 'confirmed', paymentDate: { $gte: since } })
        .sort({ paymentDate: 1 }).select('receiptNumber paymentAmount paymentMethod paymentDate customerId accountId')
        .populate('customerId', 'firstName lastName').populate('accountId', 'accountNumber').lean();
      return sendCsv(res, 'collections.csv',
        ['Receipt', 'Amount', 'Method', 'Date', 'Customer', 'Account'],
        rows.map((x) => [x.receiptNumber, x.paymentAmount, x.paymentMethod, x.paymentDate?.toISOString(), x.customerId ? `${x.customerId.firstName} ${x.customerId.lastName}` : '', x.accountId?.accountNumber || '']));
    }

    const now = new Date();
    const filter = type === 'due-list' ? String(req.query.filter || 'all') : 'overdue';
    if (!['all', 'overdue', 'upcoming'].includes(filter)) return res.status(400).json({ success: false, message: 'Invalid due-list filter' });
    const match = { 'installments.status': { $in: ['pending', 'partial', 'overdue'] } };
    if (filter === 'overdue') match['installments.dueDate'] = { $lt: now };
    if (filter === 'upcoming') {
      const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      match['installments.dueDate'] = { $gte: now, $lte: next30 };
    }

    const dues = await InstallmentPlan.aggregate([
      { $match: { businessId } }, { $unwind: '$installments' }, { $match: match },
      { $lookup: { from: 'accounts', localField: 'accountId', foreignField: '_id', as: 'account' } }, { $unwind: '$account' },
      { $lookup: { from: 'customers', localField: 'account.customerId', foreignField: '_id', as: 'customer' } }, { $unwind: '$customer' },
      { $project: {
        dueDate: '$installments.dueDate', dueAmount: '$installments.dueAmount',
        paidAmount: { $ifNull: ['$installments.paidAmount', 0] }, status: '$installments.status',
        accountNumber: '$account.accountNumber', accountStatus: '$account.status',
        customerName: { $concat: ['$customer.firstName', ' ', '$customer.lastName'] }, phone: '$customer.phoneNumber',
      }},
      { $addFields: { remaining: { $subtract: ['$dueAmount', '$paidAmount'] } } },
      { $match: { remaining: { $gt: 0 }, accountStatus: 'active' } },
      { $sort: { dueDate: 1 } }, { $limit: 5000 },
    ]);

    if (type === 'due-list') {
      return sendCsv(res, 'due-list.csv',
        ['Customer', 'Phone', 'Account', 'Due date', 'Due amount', 'Paid', 'Remaining', 'Status'],
        dues.map((x) => [x.customerName, x.phone, x.accountNumber, x.dueDate?.toISOString(), x.dueAmount, x.paidAmount, x.remaining, x.status]));
    }

    const aging = dues.map((x) => {
      const daysOverdue = Math.max(0, Math.floor((now - new Date(x.dueDate)) / 86400000));
      const bucket = daysOverdue < 30 ? '0-30' : daysOverdue < 60 ? '30-60' : daysOverdue < 90 ? '60-90' : daysOverdue < 180 ? '90-180' : '180+';
      return { ...x, daysOverdue, bucket };
    });
    return sendCsv(res, 'defaults-aging.csv',
      ['Customer', 'Phone', 'Account', 'Due date', 'Remaining', 'Days overdue', 'Aging bucket', 'Status'],
      aging.map((x) => [x.customerName, x.phone, x.accountNumber, x.dueDate?.toISOString(), x.remaining, x.daysOverdue, x.bucket, x.status]));
  } catch (error) {
    next(error);
  }
});

export default router;
