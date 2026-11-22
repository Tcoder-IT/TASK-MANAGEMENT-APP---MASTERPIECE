import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as pushController from '../controllers/pushController.js';

const router = express.Router();

router.use(authenticate);

router.post('/subscribe', validate(pushController.pushSubscriptionSchema), pushController.subscribePush);
router.post('/unsubscribe', pushController.unsubscribePush);

export default router;