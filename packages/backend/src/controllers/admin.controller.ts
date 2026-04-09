import { Request, Response } from 'express';
import adminService from '../services/admin.service.js';
import emailService from '../services/email.service.js';
import feeWaiverService from '../services/feeWaiver.service.js';
import payoutService from '../services/payout.service.js';

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
      const { blockEmail } = req.body || {};
      const result = await adminService.deleteUser(id, blockEmail === true);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'User not found' ? 404
        : error.message === 'Cannot delete a superadmin user' ? 403
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getBlockedEmails(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await adminService.getBlockedEmails(page, limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch blocked emails' });
    }
  }

  async unblockEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;
      const result = await adminService.unblockEmail(decodeURIComponent(email));
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'Email is not blocked' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async blockName(req: Request, res: Response) {
    try {
      const { firstName, lastName, reason } = req.body;
      if (!firstName || !lastName) {
        res.status(400).json({ success: false, error: 'firstName and lastName are required' });
        return;
      }
      const result = await adminService.blockName(firstName, lastName, reason);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to block name' });
    }
  }

  async getBlockedNames(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await adminService.getBlockedNames(page, limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch blocked names' });
    }
  }

  async unblockName(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.unblockName(id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'Blocked name not found' ? 404 : 500;
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

  async getGroupDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const group = await adminService.getGroupDetails(id);
      res.json({ success: true, data: group });
    } catch (error: any) {
      const status = error.message === 'Group not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async reinitiateTransfer(req: Request, res: Response) {
    try {
      const { payoutId } = req.params;
      const payout = await payoutService.reinitiateTransfer(payoutId);
      res.json({
        success: true,
        message: 'Transfer reinitiated successfully',
        data: payout,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createWaiverCode(req: Request, res: Response) {
    try {
      const { description, maxUses } = req.body;
      const code = await feeWaiverService.generateCode(description, maxUses);
      res.status(201).json({ success: true, data: code });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWaiverCodes(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await feeWaiverService.getAllCodes(page, limit);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch waiver codes' });
    }
  }

  async toggleGroupSuspension(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { suspended } = req.body;
      if (typeof suspended !== 'boolean') {
        res.status(400).json({ success: false, error: 'suspended must be a boolean' });
        return;
      }
      const result = await adminService.toggleGroupCreationSuspension(id, suspended);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message === 'User not found' ? 404
        : error.message === 'Cannot suspend a superadmin user' ? 403
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async sendAnnouncement(req: Request, res: Response) {
    try {
      const { subject, body } = req.body;
      if (!subject || !body) {
        res.status(400).json({ success: false, error: 'Subject and body are required' });
        return;
      }

      const emails = await adminService.getGroupCreatorEmails();
      if (emails.length === 0) {
        res.status(400).json({ success: false, error: 'No group creators found' });
        return;
      }

      await emailService.sendAnnouncementEmail(emails, subject, body);
      res.json({ success: true, data: { recipientCount: emails.length } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to send announcement' });
    }
  }

  async toggleWaiverCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ success: false, error: 'isActive must be a boolean' });
        return;
      }
      const code = await feeWaiverService.toggleCode(id, isActive);
      res.json({ success: true, data: code });
    } catch (error: any) {
      const status = error.message === 'Waiver code not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

export default new AdminController();
