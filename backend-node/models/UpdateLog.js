const mongoose = require('mongoose');

const updateLogSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Log content is required'],
    trim: true,
    maxlength: 5000
  },
  merkleHash: {
    type: String,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient project-scoped queries
updateLogSchema.index({ project: 1, createdAt: -1 });
updateLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('UpdateLog', updateLogSchema);
