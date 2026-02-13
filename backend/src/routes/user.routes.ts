import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { updateRoleSchema, updateStatusSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', userController.findAll);
router.patch('/:id/role', validate(updateRoleSchema), userController.updateRole);
router.patch('/:id/status', validate(updateStatusSchema), userController.updateStatus);

export default router;
