import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

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