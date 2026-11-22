import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/authController.js';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.js';

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch('/me/password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.delete('/me', authenticate, authController.deleteAccount);

export default router;