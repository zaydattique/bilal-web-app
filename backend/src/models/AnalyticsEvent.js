import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    eventId: { type: String, required: true, trim: true, maxlength: 64 },
    type: { type: String, enum: ['page_view', 'cta_click'], required: true },
    sessionHash: { type: String, required: true, trim: true, maxlength: 64 },
    path: { type: String, required: true, trim: true, maxlength: 500 },
    action: { type: String, trim: true, maxlength: 80 },
    label: { type: String, trim: true, maxlength: 160 },
    referrer: { type: String, trim: true, maxlength: 500 },
    country: { type: String, trim: true, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 120 },
    userAgentClass: { type: String, enum: ['mobile', 'tablet', 'desktop', 'bot', 'unknown'], default: 'unknown' },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ businessId: 1, eventId: 1 }, { unique: true });
analyticsEventSchema.index({ businessId: 1, occurredAt: -1 });
analyticsEventSchema.index({ businessId: 1, sessionHash: 1, occurredAt: -1 });
analyticsEventSchema.index({ businessId: 1, type: 1, occurredAt: -1 });
analyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
