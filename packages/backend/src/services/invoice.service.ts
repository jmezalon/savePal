/**
 * Admin Invoice Service — one-off Stripe invoicing for arbitrary customers.
 *
 * No DB persistence: invoices live entirely in Stripe. Customers created by
 * this flow are tagged with metadata.source = 'admin_invoice' so they stay
 * isolated from the SavePals user-linked customers managed by stripe.service.ts.
 */

import Stripe from 'stripe';

const INVOICE_METADATA_SOURCE = 'savepals_admin_invoice';
const CUSTOMER_METADATA_SOURCE = 'admin_invoice';

export interface CreateInvoiceInput {
  customerEmail: string;
  customerName: string;
  description: string;
  amountCents: number;       // pre-tax subtotal in cents (must be > 0)
  taxPercent?: number;       // e.g. 8.875 — optional; computed and added as a line item
  memo?: string;             // shown on the hosted invoice page
  daysUntilDue?: number;     // defaults to 30
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: Stripe.Invoice.Status | null;
  customerEmail: string | null;
  customerName: string | null;
  description: string | null;
  subtotal: number;          // dollars
  tax: number;               // dollars
  total: number;             // dollars
  amountPaid: number;        // dollars
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  created: number;           // unix seconds
  dueDate: number | null;    // unix seconds
}

class InvoiceService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  /**
   * Find an existing admin-invoice customer by email, or create one.
   * Scoped by metadata.source so we never collide with the customer record
   * tied to a SavePals user (which has saved payment methods, etc.).
   */
  private async findOrCreateCustomer(email: string, name: string): Promise<Stripe.Customer> {
    const existing = await this.stripe.customers.list({ email, limit: 100 });
    const adminCustomer = existing.data.find(
      (c) => c.metadata?.source === CUSTOMER_METADATA_SOURCE
    );
    if (adminCustomer) {
      // Keep the name fresh in case the admin typed a different one this time
      if (name && adminCustomer.name !== name) {
        return await this.stripe.customers.update(adminCustomer.id, { name });
      }
      return adminCustomer;
    }
    return await this.stripe.customers.create({
      email,
      name,
      metadata: { source: CUSTOMER_METADATA_SOURCE },
    });
  }

  /**
   * Create a draft invoice, attach the main line + (optional) tax line,
   * finalize it, then email it to the customer with a hosted payment page.
   */
  async createAndSendInvoice(input: CreateInvoiceInput): Promise<Stripe.Invoice> {
    const {
      customerEmail,
      customerName,
      description,
      amountCents,
      taxPercent,
      memo,
      daysUntilDue,
    } = input;

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('amountCents must be a positive integer');
    }
    if (taxPercent !== undefined && (taxPercent < 0 || taxPercent > 100)) {
      throw new Error('taxPercent must be between 0 and 100');
    }
    if (!description.trim()) {
      throw new Error('description is required');
    }

    const customer = await this.findOrCreateCustomer(customerEmail, customerName);

    const invoice = await this.stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue ?? 30,
      description: memo?.trim() || undefined,
      auto_advance: false,
      metadata: { source: INVOICE_METADATA_SOURCE },
    });

    if (!invoice.id) {
      throw new Error('Stripe did not return an invoice ID');
    }

    // Main line item
    await this.stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: amountCents,
      currency: 'usd',
      description: description.trim(),
    });

    // Sales tax as its own line item — keeps the math obvious on the hosted
    // invoice page and avoids creating Stripe TaxRate objects per invoice.
    if (taxPercent && taxPercent > 0) {
      const taxCents = Math.round(amountCents * (taxPercent / 100));
      if (taxCents > 0) {
        await this.stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: taxCents,
          currency: 'usd',
          description: `Sales tax (${taxPercent}%)`,
        });
      }
    }

    const finalized = await this.stripe.invoices.finalizeInvoice(invoice.id);
    if (!finalized.id) {
      throw new Error('Stripe did not return an invoice ID after finalize');
    }
    return await this.stripe.invoices.sendInvoice(finalized.id);
  }

  /**
   * List admin-created invoices, newest first. Uses Stripe Search so we can
   * filter by our metadata tag (invoices.list doesn't support metadata filters).
   */
  async listInvoices(limit = 50): Promise<InvoiceSummary[]> {
    const result = await this.stripe.invoices.search({
      query: `metadata['source']:'${INVOICE_METADATA_SOURCE}'`,
      limit: Math.min(Math.max(limit, 1), 100),
    });
    return result.data.map(toSummary);
  }

  async getInvoice(id: string): Promise<InvoiceSummary> {
    const invoice = await this.stripe.invoices.retrieve(id);
    return toSummary(invoice);
  }

  /**
   * Void a finalized but unpaid invoice. Paid invoices cannot be voided —
   * they must be refunded via the charge.
   */
  async voidInvoice(id: string): Promise<InvoiceSummary> {
    const invoice = await this.stripe.invoices.voidInvoice(id);
    return toSummary(invoice);
  }
}

function toSummary(inv: Stripe.Invoice): InvoiceSummary {
  const customer = typeof inv.customer === 'object' && inv.customer ? inv.customer : null;
  // Prefer the snapshotted name/email on the invoice (filled at finalize time),
  // falling back to the expanded customer object when present.
  const customerEmail =
    inv.customer_email ?? (customer && !('deleted' in customer) ? customer.email : null) ?? null;
  const customerName =
    inv.customer_name ?? (customer && !('deleted' in customer) ? customer.name : null) ?? null;

  // Sales tax is added as its own line item (description "Sales tax (X%)") rather
  // than via Stripe TaxRate, so we surface it by summing those lines.
  const taxCents = (inv.lines?.data ?? []).reduce((sum, line) => {
    const desc = line.description ?? '';
    return desc.toLowerCase().startsWith('sales tax') ? sum + (line.amount ?? 0) : sum;
  }, 0);

  return {
    id: inv.id ?? '',
    number: inv.number ?? null,
    status: inv.status ?? null,
    customerEmail,
    customerName,
    description: inv.description ?? null,
    subtotal: (inv.subtotal ?? 0) / 100,
    tax: taxCents / 100,
    total: (inv.total ?? 0) / 100,
    amountPaid: (inv.amount_paid ?? 0) / 100,
    currency: inv.currency ?? 'usd',
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
    created: inv.created,
    dueDate: inv.due_date ?? null,
  };
}

export default new InvoiceService();
