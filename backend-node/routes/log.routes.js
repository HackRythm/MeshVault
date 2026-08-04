const express = require('express');
const UpdateLog = require('../models/UpdateLog');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// All log routes require authentication
router.use(authMiddleware);

/**
 * GET /api/logs
 * Get all logs for the authenticated user (recent first)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await UpdateLog.find({ user: req.user.id })
      .populate('project', 'title')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs.' });
  }
});

/**
 * POST /api/logs
 * Create a new update log
 */
router.post('/', async (req, res) => {
  try {
    const { project, content } = req.body;

    const log = await UpdateLog.create({
      project,
      user: req.user.id,
      content
    });

    const populated = await log.populate([
      { path: 'project', select: 'title' },
      { path: 'user', select: 'name' }
    ]);

    res.status(201).json({ log: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Error creating log.' });
  }
});

/**
 * GET /api/logs/project/:projectId
 * Get all logs for a specific project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const logs = await UpdateLog.find({ project: req.params.projectId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project logs.' });
  }
});

/**
 * PUT /api/logs/:id/verify
 * Mark a log as Merkle-verified
 */
router.put('/:id/verify', async (req, res) => {
  try {
    const { merkleHash, verified } = req.body;

    const log = await UpdateLog.findByIdAndUpdate(
      req.params.id,
      { merkleHash, verified },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ message: 'Log not found.' });
    }

    res.json({ log });
  } catch (error) {
    res.status(500).json({ message: 'Error updating log verification.' });
  }
});

module.exports = router;
