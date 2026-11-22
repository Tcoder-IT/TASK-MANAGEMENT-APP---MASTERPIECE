import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  done: { type: Boolean, default: false },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 2000, default: '' },
  type: { type: String, enum: ['assignment', 'exam', 'project', 'lab', 'personal'], default: 'assignment' },
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  dueDate: { type: Date, required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  tags: { type: [String], default: [], validate: v => v.length <= 10 },
  subtasks: { type: [subtaskSchema], default: [] },
  order: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
  archived: { type: Boolean, default: false, index: true },
  reminders: { type: [Number], default: [], validate: v => v.length <= 10 },
}, { timestamps: true });

taskSchema.index({ user: 1, status: 1, order: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ user: 1, course: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

taskSchema.virtual('subtaskProgress').get(function () {
  const total = this.subtasks.length;
  const done = this.subtasks.filter(s => s.done).length;
  return { done, total };
});

taskSchema.methods.toggleDone = function () {
  this.status = this.status === 'done' ? 'todo' : 'done';
  this.completedAt = this.status === 'done' ? new Date() : null;
  return this.save();
};

export default mongoose.model('Task', taskSchema);