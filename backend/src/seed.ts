import mongoose from 'mongoose';
import User from './models/User';
import Product from './models/Product';
import Order from './models/Order';
import { env } from './config/env';

const users = [
  { name: 'Admin User', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
  { name: 'Manager User', email: 'manager@demo.com', password: 'manager123', role: 'manager' },
];

const products = [
  { name: 'Mechanical Keyboard', sku: 'KB-001', description: 'Cherry MX Blue switches', price: 129.99, quantity: 45, category: 'Electronics' },
  { name: 'Wireless Mouse', sku: 'MS-002', description: 'Ergonomic wireless mouse', price: 49.99, quantity: 120, category: 'Electronics' },
  { name: '27" Monitor', sku: 'MN-003', description: '4K IPS display', price: 399.99, quantity: 30, category: 'Electronics' },
  { name: 'USB-C Hub', sku: 'HB-004', description: '7-in-1 USB-C hub', price: 59.99, quantity: 200, category: 'Accessories' },
  { name: 'Laptop Stand', sku: 'ST-005', description: 'Aluminum adjustable stand', price: 79.99, quantity: 85, category: 'Accessories' },
  { name: 'Webcam HD', sku: 'WC-006', description: '1080p webcam with mic', price: 89.99, quantity: 60, category: 'Electronics' },
  { name: 'Desk Lamp', sku: 'DL-007', description: 'LED desk lamp with dimmer', price: 34.99, quantity: 150, category: 'Office' },
  { name: 'Notebook Pack', sku: 'NB-008', description: 'Pack of 5 lined notebooks', price: 12.99, quantity: 300, category: 'Office' },
  { name: 'Headphones', sku: 'HP-009', description: 'Noise-cancelling over-ear', price: 199.99, quantity: 8, category: 'Electronics' },
  { name: 'Cable Organizer', sku: 'CO-010', description: 'Silicone cable clips set', price: 9.99, quantity: 5, category: 'Accessories' },
  { name: 'Ergonomic Chair', sku: 'CH-011', description: 'Mesh back office chair', price: 549.99, quantity: 15, category: 'Furniture' },
  { name: 'Standing Desk', sku: 'SD-012', description: 'Electric sit-stand desk', price: 699.99, quantity: 12, category: 'Furniture' },
];

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
    console.log('Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    const admin = createdUsers[0];
    console.log(`Created ${createdUsers.length} users`);

    // Create products
    const createdProducts = await Product.create(products);
    console.log(`Created ${createdProducts.length} products`);

    // Create sample orders with dates spread over the last 30 days
    const orderData = [];
    const customers = [
      { name: 'Alice Johnson', email: 'alice@example.com' },
      { name: 'Bob Smith', email: 'bob@example.com' },
      { name: 'Carol White', email: 'carol@example.com' },
      { name: 'Dave Brown', email: 'dave@example.com' },
      { name: 'Eve Davis', email: 'eve@example.com' },
    ];
    const statuses: Array<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'> = [
      'pending', 'confirmed', 'shipped', 'delivered', 'cancelled',
    ];

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const numItems = 1 + Math.floor(Math.random() * 3);
      const usedIndices = new Set<number>();
      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        let idx: number;
        do { idx = Math.floor(Math.random() * createdProducts.length); } while (usedIndices.has(idx));
        usedIndices.add(idx);

        const p = createdProducts[idx];
        const qty = 1 + Math.floor(Math.random() * 3);
        items.push({ product: p._id, productName: p.name, quantity: qty, unitPrice: p.price });
        totalAmount += p.price * qty;
      }

      const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();

      orderData.push({
        orderNumber: `ORD-${datePart}-${rand}`,
        items,
        totalAmount,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        customer: customers[Math.floor(Math.random() * customers.length)],
        createdBy: admin._id,
        createdAt: date,
        updatedAt: date,
      });
    }

    await Order.insertMany(orderData);
    console.log(`Created ${orderData.length} orders`);

    console.log('\n=== Seed Complete ===');
    console.log('Login credentials:');
    console.log('  Admin:   admin@demo.com / admin123');
    console.log('  Manager: manager@demo.com / manager123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
