import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as aiInsightsController from '../controllers/aiInsights.controller';

const router = Router();

router.use(authenticate, authorize('admin'));
router.post('/insights', aiInsightsController.createInsights);

export default router;
