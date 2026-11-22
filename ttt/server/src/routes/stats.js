import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as statsController from '../controllers/statsController.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', statsController.getSummary);

export default router;