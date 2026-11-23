import mongoose from 'mongoose';
import crypto from 'crypto';

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  revokedAt: { type: Date, default: null },
  replacedBy: { type: String, default: null },
  userAgent: { type: String },
  ip: { type: String },
}, { timestamps: true });

refreshTokenSchema.index({ user: 1, revokedAt: 1 });
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });

refreshTokenSchema.statics.hashToken = function (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

refreshTokenSchema.methods.isRevoked = function () {
  return this.revokedAt !== null;
};

refreshTokenSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

refreshTokenSchema.methods.isValid = function () {
  return !this.isRevoked() && !this.isExpired();
};

export default mongoose.model('RefreshToken', refreshTokenSchema);