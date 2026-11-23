import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
  startedAt: { type: Date, required: true, default: Date.now },
  durationMin: { type: Number, required: true, min: 1 },
  completed: { type: Boolean, default: true },
}, { timestamps: true });

studySessionSchema.index({ user: 1, startedAt: -1 });
studySessionSchema.index({ user: 1, course: 1, startedAt: -1 });

export default mongoose.model('StudySession', studySessionSchema);