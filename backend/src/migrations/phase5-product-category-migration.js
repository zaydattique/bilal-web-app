import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Media from '../models/Media.js';

const slugKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const migrateProducts = async () => {
  const legacy = await Product.collection.find({
    cashPrice: { $exists: false },
    price: { $exists: true },
  }).toArray();

  let migrated = 0;
  for (const old of legacy) {
    const cashPrice = Math.max(0, toNumber(old.price));
    const discountPrice = old.discountPrice == null ? null : Math.max(0, toNumber(old.discountPrice));
    const rawImages = Array.isArray(old.images) ? old.images : [];
    const imageIds = rawImages
      .map((value) => String(value))
      .filter((value) => /^[0-9a-f]{24}$/i.test(value));

    const media = imageIds.length
      ? await Media.find({ _id: { $in: imageIds }, businessId: old.businessId, isActive: true }).select('_id').lean()
      : [];

    const rawCustomValues = Array.isArray(old.customFieldValues) ? old.customFieldValues : [];
    const customFieldValues = rawCustomValues
      .map((item) => ({
        key: slugKey(item?.fieldName),
        value: String(item?.fieldValue ?? '').trim().slice(0, 500),
      }))
      .filter((item) => item.key && item.value);

    await Product.collection.updateOne(
      { _id: old._id },
      {
        $set: {
          cashPrice,
          discountPrice,
          shortDescription: String(old.description || '').trim().slice(0, 500),
          description: String(old.fullDescription || old.description || '').trim().slice(0, 5000),
          media: media.map((item) => item._id),
          customFieldValues,
          inventory: Math.max(0, toNumber(old.inventory)),
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
          specs: {
            weight: old.weight == null ? null : Math.max(0, toNumber(old.weight)),
            dimensions: {
              length: old.dimensions?.length == null ? null : Math.max(0, toNumber(old.dimensions.length)),
              width: old.dimensions?.width == null ? null : Math.max(0, toNumber(old.dimensions.width)),
              height: old.dimensions?.height == null ? null : Math.max(0, toNumber(old.dimensions.height)),
            },
          },
          faqs: Array.isArray(old.faqs) ? old.faqs : [],
          seo: {
            title: String(old.seoTitle || '').trim().slice(0, 70),
            description: String(old.seoDescription || '').trim().slice(0, 170),
            keywords: [],
          },
          aeo: { summary: '', keyFacts: [], buyingIntent: '' },
          geo: { intent: '', localNotes: '' },
          scheduledAt: null,
        },
        $unset: {
          price: '',
          fullDescription: '',
          images: '',
          seoTitle: '',
          seoDescription: '',
          isActive: '',
          weight: '',
          dimensions: '',
        },
      },
    );
    migrated += 1;
  }

  return migrated;
};

const migrateCategories = async () => {
  const legacy = await Category.collection.find({ customFields: { $exists: true } }).toArray();
  let migrated = 0;

  for (const old of legacy) {
    const rawFields = Array.isArray(old.customFields) ? old.customFields : [];
    const customFields = rawFields
      .map((field) => ({
        key: slugKey(field?.fieldName),
        label: String(field?.fieldName || '').trim().slice(0, 120),
        type: ['text', 'number', 'date', 'select'].includes(field?.fieldType) ? field.fieldType : 'text',
        required: field?.isRequired === true,
        options: Array.isArray(field?.options)
          ? field.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 50)
          : [],
      }))
      .filter((field) => field.key && field.label)
      .map((field) => field.type === 'select' && field.options.length === 0 ? { ...field, type: 'text', options: [] } : field);

    await Category.collection.updateOne(
      { _id: old._id },
      {
        $set: {
          customFields,
          status: 'draft',
          order: Math.max(0, Math.min(100000, toNumber(old.order))),
          faqs: Array.isArray(old.faqs) ? old.faqs : [],
          seo: old.seo || { title: '', description: '', keywords: [] },
          aeo: old.aeo || { summary: '', keyFacts: [] },
          geo: old.geo || { intent: '', localNotes: '' },
        },
        $unset: { isActive: '' },
      },
    );
    migrated += 1;
  }

  return migrated;
};

const run = async () => {
  await connectDB();
  const products = await migrateProducts();
  const categories = await migrateCategories();
  console.log(`Phase 5 migration converted ${products} products and ${categories} categories. Existing records remain draft until required CMS/SEO/AEO/installment data is completed.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
