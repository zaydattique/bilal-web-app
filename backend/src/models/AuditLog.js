import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'logout', 'payment_entry', 'status_change'],
      required: true,
    },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

auditLogSchema.index({ businessId: 1, timestamp: -1 });
auditLogSchema.index({ businessId: 1, action: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
