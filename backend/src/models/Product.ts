import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ category: 1 });

export default mongoose.model<IProduct>('Product', productSchema);
