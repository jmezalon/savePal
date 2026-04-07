import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/admin.middleware.js';
import adminController from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication + superadmin role
router.use(authenticate, requireSuperAdmin);

router.get('/stats', adminController.getStats.bind(adminController));
router.get('/users', adminController.getUsers.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.patch('/users/:id/group-suspension', adminController.toggleGroupSuspension.bind(adminController));
router.get('/groups', adminController.getGroups.bind(adminController));
router.get('/groups/:id', adminController.getGroupDetails.bind(adminController));
router.delete('/groups/:id', adminController.deleteGroup.bind(adminController));
router.post('/payouts/:payoutId/reinitiate', adminController.reinitiateTransfer.bind(adminController));

// Announcements
router.post('/announce', adminController.sendAnnouncement.bind(adminController));

// Waiver code management
router.post('/waiver-codes', adminController.createWaiverCode.bind(adminController));
router.get('/waiver-codes', adminController.getWaiverCodes.bind(adminController));
router.patch('/waiver-codes/:id', adminController.toggleWaiverCode.bind(adminController));

export default router;
