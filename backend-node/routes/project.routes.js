const express = require('express');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// All project routes require authentication
router.use(authMiddleware);

/**
 * GET /api/projects
 * List projects — optionally filter by workspace
 */
router.get('/', async (req, res) => {
  try {
    const filter = { owner: req.user.id };
    if (req.query.workspace) {
      filter.workspace = req.query.workspace;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const projects = await Project.find(filter)
      .populate('workspace', 'name')
      .sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects.' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, workspace, status, priority, deadline, tags, tasks, sprintCapacity } = req.body;

    // Verify workspace exists
    const ws = await Workspace.findById(workspace);
    if (!ws) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const project = await Project.create({
      title,
      description,
      workspace,
      owner: req.user.id,
      status,
      priority,
      deadline,
      tags,
      tasks,
      sprintCapacity
    });

    // Add project to workspace
    await Workspace.findByIdAndUpdate(workspace, {
      $addToSet: { projects: project._id }
    });

    const populated = await project.populate('workspace', 'name');
    res.status(201).json({ project: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Error creating project.' });
  }
});

/**
 * GET /api/projects/:id
 * Get a single project
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('workspace', 'name')
      .populate('owner', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project.' });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'status', 'priority', 'deadline', 'tags', 'tasks', 'sprintCapacity'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate('workspace', 'name');

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied.' });
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error updating project.' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied.' });
    }

    // Remove from workspace
    await Workspace.findByIdAndUpdate(project.workspace, {
      $pull: { projects: project._id }
    });

    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project.' });
  }
});

/**
 * POST /api/projects/:id/tasks
 * Add tasks to a project (for sprint optimization)
 */
router.post('/:id/tasks', async (req, res) => {
  try {
    const { tasks } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $push: { tasks: { $each: tasks } } },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied.' });
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error adding tasks.' });
  }
});

module.exports = router;
