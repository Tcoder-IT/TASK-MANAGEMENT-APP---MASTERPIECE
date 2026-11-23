import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as sessionController from '../controllers/sessionController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(sessionController.createSessionSchema), sessionController.createSession);
router.get('/', validate(sessionController.sessionQuerySchema), sessionController.listSessions);

export default router;