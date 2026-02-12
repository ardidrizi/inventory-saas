import Product from '../models/Product';

export const create = async (data: Record<string, unknown>) => {
  return Product.create(data);
};

export const findAll = async (query: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (query.category) filter.category = query.category;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
};

export const findById = async (id: string) => {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  return product;
};

export const update = async (id: string, data: Record<string, unknown>) => {
  const product = await Product.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  return product;
};

export const softDelete = async (id: string) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  return product;
};
