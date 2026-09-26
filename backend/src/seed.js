import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Business from './models/Business.js';
import Admin from './models/Admin.js';
import Category from './models/Category.js';
import Product from './models/Product.js';

const seed = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    Business.deleteMany({}),
    Admin.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);

  console.log('Creating demo business...');
  const business = await Business.create({
    businessName: 'Bilal Electronics',
    businessSlug: 'bilal-electronics',
    businessType: 'installment_sales',
    branding: {
      primaryColor: '#e74c3c',
      secondaryColor: '#3498db',
      accentColor: '#2ecc71',
      textDark: '#2c3e50',
      textLight: '#ecf0f1',
      backgroundColor: '#ffffff',
      borderColor: '#bdc3c7',
    },
    contact: {
      phone: '+92-300-1234567',
      email: 'info@bilalelectronics.pk',
      address: 'Shop 12, Main Market',
      city: 'Lahore',
      country: 'Pakistan',
    },
    settings: {
      currencySymbol: 'PKR',
      currencyCode: 'PKR',
      timezone: 'Asia/Karachi',
      dateFormat: 'DD-MM-YYYY',
      maxInstallments: 12,
      minDownPayment: 10,
    },
    seo: {
      metaTitle: 'Bilal Electronics - Buy on Installments',
      metaDescription: 'Premium electronics on easy installments in Lahore',
    },
  });

  console.log('Creating admin user...');
  await Admin.create({
    businessId: business._id,
    email: 'admin@bilalelectronics.pk',
    password: 'Admin@123',
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
    description: 'Smartphones and feature phones',
    order: 1,
  });
  const appliances = await Category.create({
    businessId: business._id,
    name: 'Home Appliances',
    slug: 'home-appliances',
    description: 'Refrigerators, ACs, washing machines',
    order: 2,
  });

  console.log('Creating products...');
  await Product.create([
    {
      businessId: business._id,
      categoryId: mobiles._id,
      name: 'Samsung Galaxy A55',
      slug: 'samsung-galaxy-a55',
      description: '128GB, Awesome Graphite',
      price: 125000,
      discountPrice: 119000,
      inventory: 15,
      sku: 'SAM-A55-128',
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: mobiles._id,
      name: 'iPhone 15',
      slug: 'iphone-15',
      description: '128GB, Black',
      price: 285000,
      inventory: 8,
      sku: 'APL-IP15-128',
      featured: true,
      isActive: true,
    },
    {
      businessId: business._id,
      categoryId: appliances._id,
      name: 'Haier 1.5 Ton Inverter AC',
      slug: 'haier-15-ton-inverter-ac',
      description: 'Energy efficient split AC',
      price: 145000,
      discountPrice: 139000,
      inventory: 10,
      sku: 'HAI-AC-15T',
      featured: false,
      isActive: true,
    },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('----------------------------');
  console.log('Business slug : bilal-electronics');
  console.log('Admin email   : admin@bilalelectronics.pk');
  console.log('Admin password: Admin@123');
  console.log('----------------------------');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
