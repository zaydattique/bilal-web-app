import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userType: { type: String, enum: ['admin', 'customer'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  endedAt: Date,
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

sessionSchema.index({ userType: 1, userId: 1, revokedAt: 1, expiresAt: 1 });
sessionSchema.index({ businessId: 1, createdAt: -1 });

export default mongoose.model('Session', sessionSchema);
