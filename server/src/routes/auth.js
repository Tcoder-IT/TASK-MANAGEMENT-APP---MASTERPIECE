import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/authController.js';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.js';

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Password reset routes (no auth required)
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch('/me/password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.delete('/me', authenticate, authController.deleteAccount);

export default router;