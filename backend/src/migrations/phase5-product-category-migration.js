import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const run = async () => {
  await connectDB();

  const products = await Product.collection.find({ cashPrice: { $exists: false }, price: { $exists: true } }).toArray();
  for (const old of products) {
    const cashPrice = Number(old.price || 0);
    const discountPrice = old.discountPrice == null ? null : Number(old.discountPrice);
    await Product.collection.updateOne(
      { _id: old._id },
      {
        $set: {
          cashPrice,
          discountPrice,
          shortDescription: String(old.description || '').slice(0, 500),
          description: String(old.fullDescription || old.description || '').slice(0, 5000),
          media: Array.isArray(old.images) ? old.images : [],
          inventory: Number(old.inventory || 0),
          status: 'draft',
          featured: old.featured === true,
          installment: {
            advanceAmount: 0,
            financedAmount: cashPrice,
            markupAmount: 0,
            totalPayable: cashPrice,
            tenureMonths: 1,
            installmentAmount: cashPrice,
            frequency: 'monthly',
          },
          seo: {
            title: String(old.seoTitle || '').slice(0, 70),
            description: String(old.seoDescription || '').slice(0, 170),
            keywords: [],
          },
          aeo: { summary: '', keyFacts: [], buyingIntent: '' },
          geo: { intent: '', localNotes: '' },
        },
        $unset: {
          price: '', fullDescription: '', images: [], customFieldValues: Array.isArray(old.customFieldValues) ? old.customFieldValues.map((item) => ({ key: String(item.fieldName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,80), value: String(item.fieldValue || '').slice(0,500) })).filter((item) => item.key && item.value),
          seoTitle: '', seoDescription: '', isActive: '', weight: '', dimensions: '',
        },
      }
    );
  }

  const categories = await Category.collection.find({ customFields: { $exists: true } }).toArray();
  for (const category of categories) {
    const fields = Array.isArray(category.customFields)
      ? category.customFields.map((field) => ({
          key: String(field.fieldName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,80),
          label: String(field.fieldName || '').slice(0,120),
          type: ['text','number','date','select'].includes(field.fieldType) ? field.fieldType : 'text',
          required: field.isRequired === true,
          options: Array.isArray(field.options) ? field.options.slice(0,50) : [],
        })).filter((field) => field.key)
      : [];
    await Category.collection.updateOne(
      { _id: category._id },
      {
        $set: {
          customFields: fields,
          status: 'draft',
          order: Number(category.order || 0),
          faqs: category.faqs || [],
          seo: category.seo || { title: '', description: '', keywords: [] },
          aeo: category.aeo || { summary: '', keyFacts: [] },
          geo: category.geo || { intent: '', localNotes: '' },
        },
        $unset: { isActive: '' },
      }
    );
  }

  console.log(`Phase 5 migration converted ${products.length} products and ${categories.length} categories. Existing content is draft until required CMS/SEO/installment data is completed.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
