import { Request, Response } from 'express';
import invoiceService, { CreateInvoiceInput } from '../services/invoice.service.js';

/**
 * Admin-only one-off Stripe invoicing. Mounted under /api/admin/invoices
 * and gated by authenticate + requireSuperAdmin in admin.routes.ts.
 */
class InvoiceController {
  async create(req: Request, res: Response) {
    try {
      const {
        customerEmail,
        customerName,
        description,
        amount,            // dollars (number or numeric string), e.g. 250 or "249.99"
        taxPercent,        // optional, percent (e.g. 8.875)
        memo,              // optional
        daysUntilDue,      // optional, defaults to 30
      } = req.body ?? {};

      // Validate required fields
      const email = typeof customerEmail === 'string' ? customerEmail.trim() : '';
      const name = typeof customerName === 'string' ? customerName.trim() : '';
      const desc = typeof description === 'string' ? description.trim() : '';

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        res.status(400).json({ success: false, error: 'A valid customer email is required' });
        return;
      }
      if (!name) {
        res.status(400).json({ success: false, error: 'Customer name is required' });
        return;
      }
      if (!desc) {
        res.status(400).json({ success: false, error: 'Description is required' });
        return;
      }

      // Parse amount (accept string or number) into integer cents
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (typeof amountNum !== 'number' || !Number.isFinite(amountNum) || amountNum <= 0) {
        res.status(400).json({ success: false, error: 'Amount must be a positive number' });
        return;
      }
      const amountCents = Math.round(amountNum * 100);

      // Parse optional tax percent
      let taxPct: number | undefined;
      if (taxPercent !== undefined && taxPercent !== null && taxPercent !== '') {
        const t = typeof taxPercent === 'string' ? parseFloat(taxPercent) : taxPercent;
        if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 100) {
          res.status(400).json({ success: false, error: 'Tax percent must be between 0 and 100' });
          return;
        }
        taxPct = t;
      }

      // Parse optional days until due
      let days: number | undefined;
      if (daysUntilDue !== undefined && daysUntilDue !== null && daysUntilDue !== '') {
        const d = typeof daysUntilDue === 'string' ? parseInt(daysUntilDue, 10) : daysUntilDue;
        if (!Number.isInteger(d) || d < 0 || d > 365) {
          res.status(400).json({ success: false, error: 'Days until due must be 0–365' });
          return;
        }
        days = d;
      }

      const payload: CreateInvoiceInput = {
        customerEmail: email,
        customerName: name,
        description: desc,
        amountCents,
        taxPercent: taxPct,
        memo: typeof memo === 'string' ? memo : undefined,
        daysUntilDue: days,
      };

      const invoice = await invoiceService.createAndSendInvoice(payload);
      res.status(201).json({
        success: true,
        data: {
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
          total: (invoice.total ?? 0) / 100,
        },
      });
    } catch (error: any) {
      // Surface Stripe error messages so the admin sees why something failed
      const message = error?.raw?.message || error?.message || 'Failed to create invoice';
      res.status(500).json({ success: false, error: message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const invoices = await invoiceService.listInvoices(limit);
      res.json({ success: true, data: { invoices } });
    } catch (error: any) {
      const message = error?.raw?.message || error?.message || 'Failed to list invoices';
      res.status(500).json({ success: false, error: message });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoice(id);
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : 500;
      const message = error?.raw?.message || error?.message || 'Failed to fetch invoice';
      res.status(status).json({ success: false, error: message });
    }
  }

  async void(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.voidInvoice(id);
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      const message = error?.raw?.message || error?.message || 'Failed to void invoice';
      res.status(400).json({ success: false, error: message });
    }
  }
}

export default new InvoiceController();
