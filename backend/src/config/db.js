import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Customer from '../models/Customer.js';
import Account from '../models/Account.js';

const syncBusinessCounters = async () => {
  const businesses = await Business.find({}).select('_id customerCount customerSequence accountSequence accountCount').lean();

  for (const business of businesses) {
    const [customerCount, latestCustomer, latestAccount, accountCount] = await Promise.all([
      Customer.countDocuments({ businessId: business._id }),
      Customer.findOne({ businessId: business._id }).sort({ accountNumber: -1 }).select('accountNumber').lean(),
      Account.findOne({ businessId: business._id }).sort({ accountNumber: -1 }).select('accountNumber').lean(),
      Account.countDocuments({ businessId: business._id }),
    ]);

    const customerSequence = latestCustomer?.accountNumber
      ? Number.parseInt(String(latestCustomer.accountNumber).replace(/^CUS-/, ''), 10) || customerCount
      : customerCount;
    const accountSequence = latestAccount?.accountNumber
      ? Number.parseInt(String(latestAccount.accountNumber).replace(/^ACC-/, ''), 10) || 0
      : 0;

    await Business.updateOne(
      { _id: business._id },
      {
        $set: {
          customerCount,
          customerSequence,
          accountSequence,
          accountCount,
        },
      }
    );
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    await syncBusinessCounters();

    const topologyType = conn.connection.getClient().topology?.description?.type;
    if (process.env.NODE_ENV === 'production' && topologyType === 'Single') {
      throw new Error('Production MongoDB must support transactions (replica set or sharded deployment)');
    }

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

export default connectDB;
