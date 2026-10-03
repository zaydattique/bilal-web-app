import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    accountNumber: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phoneNumber: { type: String, required: true },
    cnic: { type: String, required: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['M', 'F', 'O'] },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    guarantor: {
      name: String,
      relationship: String,
      phoneNumber: String,
      cnic: String,
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
      },
    },
    customerType: { type: String, enum: ['individual', 'business'], default: 'individual' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blacklisted'],
      default: 'active',
    },
    totalAccounts: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    lastPaymentDate: Date,
    registeredDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

customerSchema.index({ accountNumber: 1, businessId: 1 }, { unique: true });
customerSchema.index({ businessId: 1, cnic: 1 }, { unique: true });
customerSchema.index({ businessId: 1, phoneNumber: 1 });

export default mongoose.model('Customer', customerSchema);
