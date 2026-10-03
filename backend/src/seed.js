import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Business from './models/Business.js';
import Admin from './models/Admin.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Account from './models/Account.js';
import Payment from './models/Payment.js';
import InstallmentPlan from './models/InstallmentPlan.js';
import AuditLog from './models/AuditLog.js';
import Media from './models/Media.js';

const seed = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    AuditLog.deleteMany({}),
    Media.deleteMany({}),
    Payment.deleteMany({}),
    InstallmentPlan.deleteMany({}),
    Account.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Admin.deleteMany({}),
    Business.deleteMany({}),
  ]);

  console.log('Creating demo business...');
  const business = await Business.create({
    businessName: 'Bilal Electronics',
    businessSlug: 'bilal-electronics',
    businessType: 'installment_sales',
    branding: {
      primaryColor: '#c41e3a',
      secondaryColor: '#1a2332',
      accentColor: '#0d9488',
      textDark: '#0f172a',
      textLight: '#f8fafc',
      backgroundColor: '#fafbfc',
      borderColor: '#e2e8f0',
    },
    contact: {
      phone: '+92-300-1234567',
      email: 'info@bilalelectronics.pk',
      address: 'Shop area, Kot Khawaja Saeed',
      city: 'Lahore',
      country: 'Pakistan',
      whatsapp: '923001234567',
    },
    settings: {
      currencySymbol: 'PKR',
      currencyCode: 'PKR',
      timezone: 'Asia/Karachi',
      dateFormat: 'DD-MM-YYYY',
      maxInstallments: 24,
      minDownPayment: 10,
    },
    seo: {
      metaTitle: 'Bilal Electronics - Easy Monthly Installments Lahore',
      metaDescription: 'Electronics and home appliances on installments in Kot Khawaja Saeed, Lahore',
    },
  });

  console.log('Creating admin user...');
  await Admin.create({
    businessId: business._id,
    email: 'admin@bilalelectronics.pk',
    password: 'Admin@12345!Secure',
    firstName: 'Bilal',
    lastName: 'Ahmed',
    role: 'admin',
    status: 'active',
  });

  console.log('Creating categories...');
  const mobiles = await Category.create({
    businessId: business._id,
    name: 'Mobile Phones',
    slug: 'mobile-phones',
    description: 'Smartphones on easy monthly plans',
    order: 1,
    isActive: true,
  });
  const appliances = await Category.create({
    businessId: business._id,
    name: 'Home Appliances',
    slug: 'home-appliances',
    description: 'Fridges, ACs, washing machines',
    order: 2,
    isActive: true,
  });
  const tv = await Category.create({
    businessId: business._id,
    name: 'LED TVs',
    slug: 'led-tvs',
    description: 'Smart and LED televisions',
    order: 3,
    isActive: true,
  });


  console.log('Creating products (all fields)...');
  await Product.create([
    {
      businessId: business._id,
      categoryId: mobiles._id,
      name: 'Samsung Galaxy A55',
      slug: 'samsung-galaxy-a55',
      description: '128GB · Awesome Graphite · Dual SIM',
      fullDescription:
        '6.6 Super AMOLED, 8GB RAM, 128GB storage. Shop installment plan available with CNIC.',
      price: 125000,
      discountPrice: 119000,
      inventory: 15,
      sku: 'SAM-A55-128',
      weight: 0.21,
      dimensions: { length: 16, width: 8, height: 1 },
      seoTitle: 'Samsung Galaxy A55 on installments Lahore',
      seoDescription: 'Buy Samsung A55 on monthly installments in Kot Khawaja Saeed',
      customFieldValues: [
        { fieldName: 'Storage', fieldValue: '128GB' },
        { fieldName: 'Color', fieldValue: 'Graphite' },
      ],
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: mobiles._id,
      name: 'iPhone 15',
      slug: 'iphone-15',
      description: '128GB · Black · Official warranty',
      fullDescription: 'A16 Bionic, 48MP camera. Test product for full inquiry path.',
      price: 285000,
      discountPrice: 279000,
      inventory: 8,
      sku: 'APL-IP15-128',
      weight: 0.17,
      dimensions: { length: 15, width: 7, height: 1 },
      seoTitle: 'iPhone 15 installments Lahore',
      seoDescription: 'iPhone 15 on easy monthly installments',
      customFieldValues: [
        { fieldName: 'Storage', fieldValue: '128GB' },
        { fieldName: 'Color', fieldValue: 'Black' },
      ],
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: appliances._id,
      name: 'Haier 1.5 Ton Inverter AC',
      slug: 'haier-15-ton-inverter-ac',
      description: 'Energy efficient split AC · Heat & cool',
      fullDescription: 'Inverter technology, low power mode. Ideal for multi-month plan tests.',
      price: 145000,
      discountPrice: 139000,
      inventory: 10,
      sku: 'HAI-AC-15T',
      weight: 35,
      dimensions: { length: 90, width: 30, height: 25 },
      seoTitle: 'Haier AC on installments',
      seoDescription: '1.5 ton inverter AC monthly plan',
      customFieldValues: [
        { fieldName: 'Capacity', fieldValue: '1.5 Ton' },
        { fieldName: 'Type', fieldValue: 'Inverter Split' },
      ],
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: appliances._id,
      name: 'Dawlance Refrigerator 14 cu ft',
      slug: 'dawlance-fridge-14',
      description: 'Glass door · Inverter compressor',
      fullDescription: 'Family-size fridge for higher ticket installment demo.',
      price: 98000,
      discountPrice: 92000,
      inventory: 6,
      sku: 'DAW-FR-14',
      weight: 55,
      seoTitle: 'Dawlance fridge installments',
      seoDescription: '14 cu ft refrigerator on monthly installments',
      customFieldValues: [{ fieldName: 'Capacity', fieldValue: '14 cu ft' }],
      featured: false,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: tv._id,
      name: 'Sony Bravia 43 Smart LED',
      slug: 'sony-bravia-43',
      description: '4K HDR · Google TV',
      fullDescription: 'Smart LED for category filters and linked inquiry tests.',
      price: 155000,
      discountPrice: 149000,
      inventory: 12,
      sku: 'SNY-BR-43',
      weight: 12,
      seoTitle: 'Sony 43 LED installments Lahore',
      seoDescription: '43 inch Smart LED on installments',
      customFieldValues: [
        { fieldName: 'Size', fieldValue: '43 inch' },
        { fieldName: 'Resolution', fieldValue: '4K' },
      ],
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: mobiles._id,
      name: 'Sparx Neo 15 Ultra',
      slug: 'sparx-neo-15-ultra',
      description: 'Budget smartphone · 6GB/128GB',
      fullDescription: 'Entry-level phone for lower down-payment calculator paths.',
      price: 42000,
      inventory: 25,
      sku: 'SPX-N15-128',
      featured: false,
      isActive: true,
    },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('----------------------------');
  console.log('Business slug : bilal-electronics');
  console.log('Admin email   : admin@bilalelectronics.pk');
  console.log('Admin password: Admin@123');
  console.log('Products      : 6 (full fields)');
  console.log('Categories    : 3');
  console.log('----------------------------');
  console.log('Storefront loads products from API — not hardcoded in UI.');
  console.log('Add/edit more from Admin → Products after login.');
  console.log('----------------------------');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
