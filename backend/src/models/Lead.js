import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true },
    email: String,
    interestedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    leadSource: {
      type: String,
      enum: ['website', 'whatsapp', 'referral', 'walk_in', 'other'],
      default: 'website',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'rejected'],
      default: 'new',
    },
    notes: String,
    convertedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    followUpDate: Date,
  },
  { timestamps: true }
);

leadSchema.index({ businessId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Lead', leadSchema);
