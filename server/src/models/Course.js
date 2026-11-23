import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  code: { type: String, trim: true, maxlength: 20, default: '' },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });

courseSchema.index({ user: 1, name: 1 }, { unique: true });

courseSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'course',
});

courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

export default mongoose.model('Course', courseSchema);