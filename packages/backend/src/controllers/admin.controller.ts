import { Request, Response } from 'express';
import adminService from '../services/admin.service.js';

class AdminController {
  async getStats(_req: Request, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await adminService.getAllUsers(page, limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteUser(id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'User not found' ? 404
        : error.message === 'Cannot delete a superadmin user' ? 403
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getGroups(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await adminService.getAllGroups(page, limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch groups' });
    }
  }

  async deleteGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteGroup(id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'Group not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

export default new AdminController();
