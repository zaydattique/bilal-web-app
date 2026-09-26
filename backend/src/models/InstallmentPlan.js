import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  dueAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending',
  },
  paidDate: Date,
});

const installmentPlanSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    numberOfInstallments: { type: Number, required: true },
    installments: [installmentSchema],
    totalInstallments: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },
    remainingInstallments: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

installmentPlanSchema.index({ accountId: 1, businessId: 1 });

export default mongoose.model('InstallmentPlan', installmentPlanSchema);
