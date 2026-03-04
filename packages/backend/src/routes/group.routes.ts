import { Router } from 'express';
import groupController from '../controllers/group.controller.js';
import cycleController from '../controllers/cycle.controller.js';
import payoutController from '../controllers/payout.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All group routes require authentication
router.use(authenticate);

// Check creation fee status for current user
router.get('/creation-fee-status', groupController.getCreationFeeStatus.bind(groupController));

// Validate a fee waiver code
router.post('/validate-waiver-code', groupController.validateWaiverCode.bind(groupController));

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

// Check group readiness (all members have payment methods)
router.get('/:id/readiness', groupController.checkReadiness.bind(groupController));

// Start a group (owner only)
router.post('/:id/start', groupController.startGroup.bind(groupController));

// Delete/cancel a group (owner only)
router.delete('/:id', groupController.deleteGroup.bind(groupController));

// Cycle routes for a specific group
router.get('/:groupId/cycles', cycleController.getCyclesForGroup);
router.get('/:groupId/cycles/current', cycleController.getCurrentCycle);

// Payout routes for a specific group
router.get('/:groupId/payouts', payoutController.getPayoutsForGroup);

export default router;
