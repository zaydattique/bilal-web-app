import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    accountNumber: { type: String, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    downPayment: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['active', 'paid', 'defaulted', 'closed'],
      default: 'active',
    },
    installmentPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallmentPlan' },
    createdDate: { type: Date, default: Date.now },
    closedDate: Date,
  },
  { timestamps: true }
);

accountSchema.index({ accountNumber: 1, businessId: 1 }, { unique: true });
accountSchema.index({ businessId: 1, customerId: 1 });

export default mongoose.model('Account', accountSchema);
