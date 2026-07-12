import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';

const router = Router();
const ctrl = new AnalyticsController();

router.post('/analytics/track', ctrl.track.bind(ctrl));
router.get('/analytics/funnel', ctrl.funnel.bind(ctrl));

export default router;
