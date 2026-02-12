import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

const router = Router();

router.use(authenticate);
router.get('/', productController.findAll);
router.get('/:id', productController.findById);
router.post('/', authorize('admin'), validate(createProductSchema), productController.create);
router.put('/:id', authorize('admin'), validate(updateProductSchema), productController.update);
router.delete('/:id', authorize('admin'), productController.remove);

export default router;
