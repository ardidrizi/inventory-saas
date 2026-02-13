import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
