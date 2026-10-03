import mongoose from 'mongoose';

const otpChallengeSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  consumedAt: Date,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpChallengeSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model('OtpChallenge', otpChallengeSchema);
