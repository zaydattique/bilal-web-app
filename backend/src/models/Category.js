import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    order: { type: Number, default: 0 },
    customFields: [
      {
        fieldName: String,
        fieldType: { type: String, enum: ['text', 'select', 'number', 'date'] },
        isRequired: { type: Boolean, default: false },
        options: [String],
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1, businessId: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
