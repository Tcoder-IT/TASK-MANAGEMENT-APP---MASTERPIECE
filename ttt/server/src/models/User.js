import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const settingsSchema = new mongoose.Schema({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  defaultView: { type: String, enum: ['list', 'board'], default: 'list' },
  remindersEnabled: { type: Boolean, default: true },
  reminderOffsets: { type: [Number], default: [1440, 60] }, // 1 day, 1 hour in minutes
}, { _id: false });

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: true },
  settings: { type: settingsSchema, default: () => ({}) },
  pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.index({ email: 1 }, { unique: true });

userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'user',
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 12);
};

export default mongoose.model('User', userSchema);