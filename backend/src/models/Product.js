import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    fullDescription: String,
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    images: [String],
    customFieldValues: [
      {
        fieldName: String,
        fieldValue: String,
      },
    ],
    inventory: { type: Number, default: 0 },
    sku: String,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    seoTitle: String,
    seoDescription: String,
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ slug: 1, businessId: 1 }, { unique: true });
productSchema.index({ businessId: 1, categoryId: 1 });

export default mongoose.model('Product', productSchema);
