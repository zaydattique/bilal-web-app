import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema(
  {
    installmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amountAllocated: { type: Number, required: true, min: 0 },
    previousStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'partial'],
      required: true,
    },
    previousPaidDate: Date,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    paymentAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'online'],
      default: 'cash',
    },
    referenceNumber: { type: String, trim: true, maxlength: 120 },
    paymentDate: { type: Date, default: Date.now },
    receivedBy: { type: String, trim: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 2000 },
    receiptNumber: { type: String, required: true, trim: true, maxlength: 80 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 120 },
    idempotencyFingerprint: { type: String, required: true, trim: true, maxlength: 64 },
    accountStatusBefore: {
      type: String,
      enum: ['active', 'paid', 'defaulted', 'closed'],
      required: true,
    },
    accountClosedDateBefore: Date,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'reversed'],
      default: 'confirmed',
    },
    reversedAt: Date,
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    allocationDetails: { type: [allocationSchema], default: [] },
  },
  { timestamps: true }
);

paymentSchema.index({ accountId: 1, businessId: 1 });
paymentSchema.index({ customerId: 1, businessId: 1 });
paymentSchema.index({ paymentDate: -1, businessId: 1 });
paymentSchema.index({ businessId: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);
