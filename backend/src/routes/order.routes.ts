import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';

const router = Router();

router.use(authenticate);
router.get('/', orderController.findAll);
router.get('/:id', orderController.findById);
router.post('/', validate(createOrderSchema), orderController.create);
router.patch('/:id/status', authorize('admin'), validate(updateOrderStatusSchema), orderController.updateStatus);

export default router;
