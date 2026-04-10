import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';

const router = Router();

router.use(authenticate);
router.get('/', orderController.findAll);
router.get('/export', authorize('admin', 'manager'), orderController.exportOrdersCsv);
router.get('/:id', orderController.findById);
router.post('/', authorize('admin', 'manager'), validate(createOrderSchema), orderController.create);
router.patch('/:id/status', authorize('admin', 'manager'), validate(updateOrderStatusSchema), orderController.updateStatus);

export default router;
