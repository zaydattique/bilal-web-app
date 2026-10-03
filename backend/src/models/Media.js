import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    storageKey: { type: String, required: true, unique: true },
    publicUrl: { type: String, required: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
    extension: { type: String, required: true, enum: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
    sizeBytes: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    altText: { type: String, default: '', maxlength: 300 },
    purpose: {
      type: String,
      required: true,
      enum: [
        'general',
        'logo',
        'logo_light',
        'logo_dark',
        'logo_icon',
        'favicon',
        'og_image',
        'product',
        'category',
        'banner',
      ],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    isActive: { type: Boolean, default: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mediaSchema.index({ businessId: 1, purpose: 1, createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
