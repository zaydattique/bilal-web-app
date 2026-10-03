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
    status: 'published',
    customFields: [{ key: 'storage', label: 'Storage', type: 'text', required: false, options: [] }, { key: 'color', label: 'Color', type: 'text', required: false, options: [] }],
  });
  const appliances = await Category.create({
    businessId: business._id,
    name: 'Home Appliances',
    slug: 'home-appliances',
    description: 'Fridges, ACs, washing machines',
    order: 2,
    status: 'published',
    customFields: [{ key: 'capacity', label: 'Capacity', type: 'text', required: false, options: [] }, { key: 'type', label: 'Type', type: 'text', required: false, options: [] }],
  });
  const tv = await Category.create({
    businessId: business._id,
    name: 'LED TVs',
    slug: 'led-tvs',
    description: 'Smart and LED televisions',
    order: 3,
    status: 'published',
  });


  console.log('Creating products (all fields)...');
  await Product.create([
    { businessId: business._id, categoryId: mobiles._id, name: 'Samsung Galaxy A55', slug: 'samsung-galaxy-a55', sku: 'SAM-A55-128', brand: 'Samsung', shortDescription: '128GB · Awesome Graphite · Dual SIM', description: '6.6 Super AMOLED, 8GB RAM, 128GB storage.', cashPrice: 125000, discountPrice: 119000, inventory: 15, customFieldValues: [{key:'storage',value:'128GB'},{key:'color',value:'Graphite'}], installment: {advanceAmount:25000,financedAmount:100000,markupAmount:20000,totalPayable:120000,tenureMonths:12,installmentAmount:10000,frequency:'monthly'}, seo:{title:'Samsung Galaxy A55 on installments Lahore',description:'Buy Samsung A55 on monthly installments in Kot Khawaja Saeed',keywords:['Samsung A55','installments Lahore']}, aeo:{summary:'Samsung Galaxy A55 available on an installment plan.',keyFacts:['128GB storage','8GB RAM'],buyingIntent:'Buy Samsung Galaxy A55 on installments.'}, status:'published', featured:true },
    { businessId: business._id, categoryId: mobiles._id, name: 'iPhone 15', slug: 'iphone-15', sku: 'APL-IP15-128', brand: 'Apple', shortDescription: '128GB · Black · Official warranty', description: 'A16 Bionic and 48MP camera.', cashPrice: 285000, discountPrice: 279000, inventory: 8, customFieldValues: [{key:'storage',value:'128GB'},{key:'color',value:'Black'}], installment: {advanceAmount:50000,financedAmount:229000,markupAmount:45000,totalPayable:274000,tenureMonths:12,installmentAmount:22833,frequency:'monthly'}, seo:{title:'iPhone 15 installments Lahore',description:'iPhone 15 on easy monthly installments',keywords:['iPhone 15','installments']}, aeo:{summary:'iPhone 15 available on an installment plan.',keyFacts:['128GB','Black'],buyingIntent:'Buy iPhone 15 on installments.'}, status:'published', featured:true },
    { businessId: business._id, categoryId: appliances._id, name: 'Haier 1.5 Ton Inverter AC', slug: 'haier-15-ton-inverter-ac', sku: 'HAI-AC-15T', brand: 'Haier', shortDescription: 'Energy efficient split AC · Heat & cool', description: 'Inverter technology with low power mode.', cashPrice: 145000, discountPrice: 139000, inventory: 10, customFieldValues: [{key:'capacity',value:'1.5 Ton'},{key:'type',value:'Inverter Split'}], installment: {advanceAmount:30000,financedAmount:109000,markupAmount:21000,totalPayable:130000,tenureMonths:12,installmentAmount:10833,frequency:'monthly'}, seo:{title:'Haier AC on installments',description:'1.5 ton inverter AC monthly plan',keywords:['Haier AC','installments']}, aeo:{summary:'Haier 1.5 ton inverter AC on installments.',keyFacts:['1.5 ton','Inverter split AC'],buyingIntent:'Buy Haier inverter AC on installments.'}, status:'published', featured:true },
    { businessId: business._id, categoryId: appliances._id, name: 'Dawlance Refrigerator 14 cu ft', slug: 'dawlance-fridge-14', sku: 'DAW-FR-14', brand: 'Dawlance', shortDescription: 'Glass door · Inverter compressor', description: 'Family-size refrigerator for installment purchase.', cashPrice: 98000, discountPrice: 92000, inventory: 6, customFieldValues: [{key:'capacity',value:'14 cu ft'}], installment: {advanceAmount:20000,financedAmount:72000,markupAmount:14000,totalPayable:86000,tenureMonths:12,installmentAmount:7167,frequency:'monthly'}, seo:{title:'Dawlance fridge installments',description:'14 cu ft refrigerator on monthly installments',keywords:['Dawlance fridge']}, aeo:{summary:'Dawlance refrigerator available on installments.',keyFacts:['14 cu ft','Inverter compressor'],buyingIntent:'Buy Dawlance refrigerator on installments.'}, status:'published' },
    { businessId: business._id, categoryId: tv._id, name: 'Sony Bravia 43 Smart LED', slug: 'sony-bravia-43', sku: 'SNY-BR-43', brand: 'Sony', shortDescription: '4K HDR · Google TV', description: '43-inch smart LED television.', cashPrice: 155000, discountPrice: 149000, inventory: 12, installment: {advanceAmount:30000,financedAmount:119000,markupAmount:23000,totalPayable:142000,tenureMonths:12,installmentAmount:11833,frequency:'monthly'}, seo:{title:'Sony 43 LED installments Lahore',description:'43 inch Smart LED on installments',keywords:['Sony Bravia']}, aeo:{summary:'Sony Bravia 43 inch smart LED on installments.',keyFacts:['43 inch','4K HDR'],buyingIntent:'Buy Sony Bravia on installments.'}, status:'published', featured:true },
    { businessId: business._id, categoryId: mobiles._id, name: 'Sparx Neo 15 Ultra', slug: 'sparx-neo-15-ultra', sku: 'SPX-N15-128', brand: 'Sparx', shortDescription: 'Budget smartphone · 6GB/128GB', description: 'Entry-level phone for lower down-payment plans.', cashPrice: 42000, inventory: 25, installment: {advanceAmount:10000,financedAmount:32000,markupAmount:6000,totalPayable:38000,tenureMonths:12,installmentAmount:3167,frequency:'monthly'}, seo:{title:'Sparx Neo 15 Ultra installments',description:'Budget Sparx smartphone on installments',keywords:['Sparx Neo']}, aeo:{summary:'Sparx Neo 15 Ultra available on installments.',keyFacts:['6GB RAM','128GB storage'],buyingIntent:'Buy Sparx Neo on installments.'}, status:'published' }
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
