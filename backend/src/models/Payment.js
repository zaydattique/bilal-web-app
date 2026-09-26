import mongoose from 'mongoose';

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
    referenceNumber: String,
    paymentDate: { type: Date, default: Date.now },
    receivedBy: String,
    notes: String,
    receiptNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'reversed'],
      default: 'confirmed',
    },
    allocationDetails: [
      {
        installmentId: mongoose.Schema.Types.ObjectId,
        amountAllocated: Number,
      },
    ],
  },
  { timestamps: true }
);

paymentSchema.index({ accountId: 1, businessId: 1 });
paymentSchema.index({ customerId: 1, businessId: 1 });
paymentSchema.index({ paymentDate: -1, businessId: 1 });

export default mongoose.model('Payment', paymentSchema);
