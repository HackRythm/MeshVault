const express = require('express');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// All workspace routes require authentication
router.use(authMiddleware);

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    }).populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ workspaces });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspaces.' });
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user.id
    });

    // Add workspace to user's workspace list
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { workspaces: workspace._id }
    });

    const populated = await workspace.populate('owner', 'name email');
    res.status(201).json({ workspace: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Error creating workspace.' });
  }
});

/**
 * GET /api/workspaces/:id
 * Get a single workspace by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .populate('projects');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    res.json({ workspace });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspace.' });
  }
});

/**
 * PUT /api/workspaces/:id
 * Update a workspace
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;

    const workspace = await Workspace.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { name, description },
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found or access denied.' });
    }

    res.json({ workspace });
  } catch (error) {
    res.status(500).json({ message: 'Error updating workspace.' });
  }
});

/**
 * DELETE /api/workspaces/:id
 * Delete a workspace (owner only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found or access denied.' });
    }

    // Remove from user's workspace list
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { workspaces: workspace._id }
    });

    res.json({ message: 'Workspace deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workspace.' });
  }
});

module.exports = router;
