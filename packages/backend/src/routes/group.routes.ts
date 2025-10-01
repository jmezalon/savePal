import { Router } from 'express';
import groupController from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All group routes require authentication
router.use(authenticate);

// Create a new group
router.post('/', groupController.createGroup.bind(groupController));

// Join a group with invite code
router.post('/join', groupController.joinGroup.bind(groupController));

// Get all groups for current user
router.get('/', groupController.getUserGroups.bind(groupController));

// Get group details by ID
router.get('/:id', groupController.getGroupById.bind(groupController));

// Update group details (owner only)
router.put('/:id', groupController.updateGroup.bind(groupController));

// Start a group (owner only)
router.post('/:id/start', groupController.startGroup.bind(groupController));

// Delete/cancel a group (owner only)
router.delete('/:id', groupController.deleteGroup.bind(groupController));

export default router;
