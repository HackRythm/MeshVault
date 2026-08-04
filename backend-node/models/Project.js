const mongoose = require('mongoose');

const taskSubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  weight: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  value: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  assigned: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    minlength: 2,
    maxlength: 150
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'review', 'completed', 'archived'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  deadline: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  tasks: [taskSubSchema],
  sprintCapacity: {
    type: Number,
    default: 40,
    min: 1
  }
}, {
  timestamps: true
});

// Index for efficient queries
projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ deadline: 1 });

module.exports = mongoose.model('Project', projectSchema);
