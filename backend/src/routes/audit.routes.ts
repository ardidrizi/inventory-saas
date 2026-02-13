import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as auditController from '../controllers/audit.controller';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', auditController.findAll);

export default router;
