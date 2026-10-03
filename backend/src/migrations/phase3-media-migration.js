import 'dotenv/config';
import connectDB from '../config/db.js';
import Business from '../models/Business.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const migrate = async () => {
  if (process.env.PHASE3_MEDIA_MIGRATION_CONFIRM !== 'true') {
    throw new Error('Set PHASE3_MEDIA_MIGRATION_CONFIRM=true after backing up MongoDB to run this migration');
  }

  await connectDB();

  const productResult = await Product.collection.updateMany(
    { images: { $elemMatch: { $type: 'string' } } },
    { $set: { images: [] } }
  );

  const categoryResult = await Category.collection.updateMany(
    { imageUrl: { $type: 'string' } },
    { $set: { image: null }, $unset: { imageUrl: '' } }
  );

  const businessResult = await Business.collection.updateMany(
    {
      $or: [
        { 'logo.url': { $type: 'string' } },
        { 'logo.variants.light': { $type: 'string' } },
        { 'logo.variants.dark': { $type: 'string' } },
        { 'logo.variants.icon': { $type: 'string' } },
        { 'seo.ogImage': { $type: 'string' } },
      ],
    },
    {
      $set: {
        logo: { primary: null, light: null, dark: null, icon: null },
        favicon: null,
        heroBanners: [],
        'seo.ogImage': null,
      },
    }
  );

  console.log(JSON.stringify({
    productsReset: productResult.modifiedCount,
    categoriesReset: categoryResult.modifiedCount,
    businessesReset: businessResult.modifiedCount,
  }, null, 2));

  process.exit(0);
};

migrate().catch((error) => {
  console.error('Phase 3 media migration failed:', error.message);
  process.exit(1);
});
