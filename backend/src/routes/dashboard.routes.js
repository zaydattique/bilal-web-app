import express from 'express';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protectAdmin, async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalCustomers,
      activeAccounts,
      totalProducts,
      paymentsThisMonth,
      paymentsToday,
      overdueCount,
    ] = await Promise.all([
      Customer.countDocuments({ businessId, status: 'active' }),
      Account.countDocuments({ businessId, status: 'active' }),
      Product.countDocuments({ businessId, status: 'published' }),
      Payment.aggregate([
        {
          $match: {
            businessId,
            status: 'confirmed',
            paymentDate: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$paymentAmount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            businessId,
            status: 'confirmed',
            paymentDate: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: '$paymentAmount' }, count: { $sum: 1 } } },
      ]),
      InstallmentPlan.aggregate([
        { $match: { businessId } },
        { $unwind: '$installments' },
        {
          $match: {
            'installments.status': { $in: ['pending', 'partial', 'overdue'] },
            'installments.dueDate': { $lt: now },
          },
        },
        { $count: 'count' },
      ]),
    ]);

    const outstanding = await Account.aggregate([
      { $match: { businessId, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } },
    ]);

    const recentPayments = await Payment.find({ businessId, status: 'confirmed' })
      .populate('customerId', 'firstName lastName')
      .populate('accountId', 'accountNumber')
      .sort({ paymentDate: -1 })
      .limit(10);

    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = await InstallmentPlan.aggregate([
      { $match: { businessId } },
      { $unwind: '$installments' },
      {
        $match: {
          'installments.status': { $in: ['pending', 'partial'] },
          'installments.dueDate': { $gte: now, $lte: nextWeek },
        },
      },
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
          dueAmount: {
            $subtract: ['$installments.dueAmount', { $ifNull: ['$installments.paidAmount', 0] }],
          },
          accountNumber: '$account.accountNumber',
          customerName: {
            $concat: ['$customer.firstName', ' ', '$customer.lastName'],
          },
          phone: '$customer.phoneNumber',
        },
      },
      { $sort: { dueDate: 1 } },
      { $limit: 15 },
    ]);

    res.json({
      success: true,
      summary: {
        totalCustomers,
        activeAccounts,
        totalProducts,
        outstandingReceivable: outstanding[0]?.total || 0,
        collectionsThisMonth: paymentsThisMonth[0]?.total || 0,
        collectionsThisMonthCount: paymentsThisMonth[0]?.count || 0,
        collectionsToday: paymentsToday[0]?.total || 0,
        collectionsTodayCount: paymentsToday[0]?.count || 0,
        overdueInstallments: overdueCount[0]?.count || 0,
      },
      recentPayments,
      upcomingDues: upcoming,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
