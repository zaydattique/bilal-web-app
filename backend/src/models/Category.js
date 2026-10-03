import mongoose from 'mongoose';

const customFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['text', 'number', 'date', 'select'], required: true },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
}, { _id: false });

const faqSchema = new mongoose.Schema({ question: { type: String, required: true, trim: true, maxlength: 300 }, answer: { type: String, required: true, trim: true, maxlength: 2000 } }, { _id: false });

const categorySchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  image: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  order: { type: Number, min: 0, max: 100000, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  customFields: { type: [customFieldSchema], default: [] },
  faqs: { type: [faqSchema], default: [] },
  seo: {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    keywords: { type: [String], default: [] },
  },
  aeo: {
    summary: { type: String, trim: true, maxlength: 1000, default: '' },
    keyFacts: { type: [String], default: [] },
  },
  geo: {
    intent: { type: String, trim: true, maxlength: 200, default: '' },
    localNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
}, { timestamps: true });

categorySchema.index({ businessId: 1, slug: 1 }, { unique: true });
categorySchema.index({ businessId: 1, status: 1, order: 1, name: 1 });

export default mongoose.model('Category', categorySchema);
