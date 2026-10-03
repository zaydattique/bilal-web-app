import mongoose from 'mongoose';

const mediaRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Media',
  default: null,
};

const businessSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    businessSlug: { type: String, required: true, unique: true, lowercase: true },
    businessType: {
      type: String,
      enum: ['installment_sales', 'retail', 'services'],
      default: 'installment_sales',
    },
    logo: {
      primary: mediaRef,
      light: mediaRef,
      dark: mediaRef,
      icon: mediaRef,
    },
    favicon: mediaRef,
    heroBanners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
    branding: {
      primaryColor: { type: String, default: '#e74c3c' },
      secondaryColor: { type: String, default: '#3498db' },
      accentColor: { type: String, default: '#2ecc71' },
      textDark: { type: String, default: '#2c3e50' },
      textLight: { type: String, default: '#ecf0f1' },
      backgroundColor: { type: String, default: '#ffffff' },
      borderColor: { type: String, default: '#bdc3c7' },
    },
    typography: {
      fontFamily: { type: String, default: 'Inter, sans-serif' },
      headingScale: { type: Number, default: 1.2 },
      lineHeight: { type: Number, default: 1.5 },
    },
    contact: {
      phone: String,
      email: String,
      address: String,
      city: String,
      country: String,
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      whatsapp: String,
    },
    policies: {
      termsUrl: String,
      privacyUrl: String,
      returnPolicy: String,
      warrantyClaim: String,
    },
    settings: {
      currencySymbol: { type: String, default: 'PKR' },
      currencyCode: { type: String, default: 'PKR' },
      timezone: { type: String, default: 'Asia/Karachi' },
      dateFormat: { type: String, default: 'DD-MM-YYYY' },
      maxInstallments: { type: Number, default: 12 },
      minDownPayment: { type: Number, default: 10 },
      enableOnlinePayment: { type: Boolean, default: false },
      enableGuestCheckout: { type: Boolean, default: false },
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
      ogImage: mediaRef,
    },
    customerCount: { type: Number, default: 0, min: 0 },
    customerSequence: { type: Number, default: 0, min: 0 },
    accountSequence: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Business', businessSchema);
