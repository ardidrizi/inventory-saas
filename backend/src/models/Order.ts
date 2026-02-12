import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  customer: { name: string; email: string };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v: IOrderItem[]) => v.length > 0, 'Order must have at least one item'],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);
