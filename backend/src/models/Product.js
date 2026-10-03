import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({ question: { type: String, required: true, trim: true, maxlength: 300 }, answer: { type: String, required: true, trim: true, maxlength: 2000 } }, { _id: false });
const customFieldValueSchema = new mongoose.Schema({ key: { type: String, required: true, trim: true, maxlength: 80 }, value: { type: String, required: true, trim: true, maxlength: 500 } }, { _id: false });

const productSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 220 },
  sku: { type: String, trim: true, uppercase: true, maxlength: 80, default: undefined },
  brand: { type: String, trim: true, maxlength: 120, default: null },
  shortDescription: { type: String, trim: true, maxlength: 500, default: '' },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  cashPrice: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0, default: null },
  installment: {
    advanceAmount: { type: Number, min: 0, default: 0 },
    financedAmount: { type: Number, min: 0, default: 0 },
    markupAmount: { type: Number, min: 0, default: 0 },
    totalPayable: { type: Number, min: 0, default: 0 },
    tenureMonths: { type: Number, min: 1, max: 120, default: 1 },
    installmentAmount: { type: Number, min: 0, default: 0 },
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'monthly' },
  },
  inventory: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'scheduled', 'archived'], default: 'draft', index: true },
  scheduledAt: { type: Date, default: null },
  featured: { type: Boolean, default: false },
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  customFieldValues: { type: [customFieldValueSchema], default: [] },
  specs: {
    weight: { type: Number, min: 0, default: null },
    dimensions: {
      length: { type: Number, min: 0, default: null },
      width: { type: Number, min: 0, default: null },
      height: { type: Number, min: 0, default: null },
    },
  },
  faqs: { type: [faqSchema], default: [] },
  seo: {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    keywords: { type: [String], default: [] },
  },
  aeo: {
    summary: { type: String, trim: true, maxlength: 1000, default: '' },
    keyFacts: { type: [String], default: [] },
    buyingIntent: { type: String, trim: true, maxlength: 300, default: '' },
  },
  geo: {
    intent: { type: String, trim: true, maxlength: 200, default: '' },
    localNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
}, { timestamps: true });

productSchema.index({ businessId: 1, slug: 1 }, { unique: true });
productSchema.index({ businessId: 1, status: 1, featured: -1, createdAt: -1 });
productSchema.index({ businessId: 1, categoryId: 1, status: 1 });
productSchema.index({ businessId: 1, sku: 1 }, { unique: true, sparse: true });

export default mongoose.model('Product', productSchema);
