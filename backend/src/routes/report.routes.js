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
router.get('/collections', protectAdmin, async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Customer report
router.get('/customers', protectAdmin, async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Product report
router.get('/products', protectAdmin, async (req, res) => {
  try {
    const products = await Product.find({ businessId: req.businessId })
      .populate('categoryId', 'name')
      .sort({ inventory: 1 })
      .select('name sku price inventory isActive featured categoryId');

    const lowStock = products.filter((p) => p.isActive && p.inventory <= 5);

    res.json({
      success: true,
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStock,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Due list — upcoming and overdue
router.get('/due-list', protectAdmin, async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Defaults / aging report
router.get('/defaults', protectAdmin, async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
