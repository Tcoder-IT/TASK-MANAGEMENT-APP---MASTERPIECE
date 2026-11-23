import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { sendEmail, isEmailConfigured } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

async function sendResetEmail(email, resetUrl) {
  const subject = 'Password Reset Request';
  const html = `
    <p>You requested a password reset for your StudyFlow account.</p>
    <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
  const text = `You requested a password reset for your StudyFlow account. Visit ${resetUrl} to reset your password. This link expires in 1 hour.`;

  await sendEmail({ to: email, subject, html, text });
  logger.info('Password reset email processed', { email, hasEmailConfig: isEmailConfigured() });
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, jti: crypto.randomUUID() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user._id, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
}

async function saveRefreshToken(userId, refreshToken, req) {
  const tokenHash = RefreshToken.hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
}

async function revokeUserRefreshTokens(userId, exceptHash = null) {
  const query = { user: userId, revokedAt: null };
  if (exceptHash) query.tokenHash = { $ne: exceptHash };
  await RefreshToken.updateMany(query, { revokedAt: new Date() });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user._id, refreshToken, req);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      settings: user.settings,
    },
  }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user._id, refreshToken, req);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      settings: user.settings,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  const tokenHash = RefreshToken.hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash, revokedAt: null });

  if (!storedToken || storedToken.isExpired()) {
    if (storedToken) {
      storedToken.revokedAt = new Date();
      await storedToken.save();
    }
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(storedToken.user);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  storedToken.revokedAt = new Date();
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  storedToken.replacedBy = RefreshToken.hashToken(newRefreshToken);
  await storedToken.save();

  await saveRefreshToken(user._id, newRefreshToken, req);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, { accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const tokenHash = RefreshToken.hashToken(refreshToken);
    await RefreshToken.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  });

  return successResponse(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    settings: req.user.settings,
    pushSubscriptions: req.user.pushSubscriptions,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;
  const allowedTopLevel = ['name'];
  const allowedSettings = ['theme', 'defaultView', 'remindersEnabled', 'reminderOffsets'];

  const topLevelUpdates = {};
  const settingsUpdates = {};

  Object.keys(updates).forEach(key => {
    if (allowedTopLevel.includes(key)) {
      topLevelUpdates[key] = updates[key];
    } else if (allowedSettings.includes(key)) {
      settingsUpdates[key] = updates[key];
    }
  });

  if (topLevelUpdates.name) topLevelUpdates.name = topLevelUpdates.name.trim();

  const updateQuery = { ...topLevelUpdates };
  if (Object.keys(settingsUpdates).length > 0) {
    updateQuery.settings = settingsUpdates;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updateQuery, { new: true, runValidators: true });
  return successResponse(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    settings: user.settings,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await revokeUserRefreshTokens(user._id);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  });

  return successResponse(res, { message: 'Password changed successfully. Please log in again.' });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await revokeUserRefreshTokens(req.user._id);
  await User.findByIdAndDelete(req.user._id);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  });

  return successResponse(res, { message: 'Account deleted successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Always return success to prevent email enumeration
  if (!user) {
    return successResponse(res, { message: 'If the email exists, a reset link has been sent' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = tokenHash;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // In production, send email with reset link
  // For development, return the token in response (remove in production!)
  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
  await sendResetEmail(email, resetUrl);

  return successResponse(res, {
    message: 'If the email exists, a reset link has been sent',
    // Only include in non-production environments
    ...(process.env.NODE_ENV !== 'production' && { devResetToken: resetToken }),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Revoke all refresh tokens
  await revokeUserRefreshTokens(user._id);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  });

  return successResponse(res, { message: 'Password has been reset. Please log in with your new password.' });
});