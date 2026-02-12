import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';

const generateOrderNumber = (): string => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${rand}`;
};

export const create = async (
  data: {
    items: { product: string; quantity: number }[];
    customer: { name: string; email: string };
  },
  userId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of data.items) {
      const product = await Product.findOne({ _id: item.product, isDeleted: false }).session(
        session,
      );
      if (!product) {
        throw Object.assign(new Error(`Product ${item.product} not found`), { statusCode: 404 });
      }
      if (product.quantity < item.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`),
          { statusCode: 400 },
        );
      }

      product.quantity -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });

      totalAmount += product.price * item.quantity;
    }

    const [order] = await Order.create(
      [
        {
          orderNumber: generateOrderNumber(),
          items: orderItems,
          totalAmount,
          customer: data.customer,
          createdBy: userId,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const findAll = async (query: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email'),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

export const findById = async (id: string) => {
  const order = await Order.findById(id).populate('createdBy', 'name email');
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  return order;
};

export const updateStatus = async (id: string, status: string) => {
  const order = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  return order;
};
