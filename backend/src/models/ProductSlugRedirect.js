import mongoose from 'mongoose';

const productSlugRedirectSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    oldSlug: { type: String, required: true, lowercase: true, trim: true, maxlength: 220 },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

productSlugRedirectSchema.index({ businessId: 1, oldSlug: 1 }, { unique: true });
productSlugRedirectSchema.index({ businessId: 1, productId: 1 });

export default mongoose.model('ProductSlugRedirect', productSlugRedirectSchema);
