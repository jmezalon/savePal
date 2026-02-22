import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../utils/prisma.js';
import paymentService from '../services/payment.service.js';
import payoutService from '../services/payout.service.js';
import notificationService from '../services/notification.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

class WebhookController {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'transfer.reversed':
          await this.handleTransferReversed(event.data.object as Stripe.Transfer);
          break;
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        default:
          break;
      }
    } catch (err: any) {
      console.error(`Error handling webhook event ${event.type}:`, err.message);
    }

    res.json({ received: true });
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const paymentId = paymentIntent.metadata.paymentId;
    if (!paymentId || paymentIntent.metadata.type !== 'rosca_contribution') return;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { cycle: { include: { group: true } } },
    });

    if (!payment || payment.status === 'COMPLETED') return;

    // Safety net: update payment if synchronous confirm missed it
    await paymentService.processPayment({
      paymentId,
      userId: payment.userId,
      transactionReference: paymentIntent.id,
    });

    console.log(`Webhook: Payment ${paymentId} marked as COMPLETED`);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const paymentId = paymentIntent.metadata.paymentId;
    if (!paymentId || paymentIntent.metadata.type !== 'rosca_contribution') return;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        cycle: { include: { group: true } },
      },
    });

    if (!payment || payment.status === 'FAILED') return;

    const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: failureMessage,
        retryCount: { increment: 1 },
      },
    });

    await notificationService.sendPaymentFailedNotification(
      payment.userId,
      payment.cycle.group.id,
      payment.cycle.group.name,
      payment.amount
    );

    // Notify the group owner about this member's failed payment
    const memberName = `${payment.user.firstName} ${payment.user.lastName}`;
    await notificationService.notifyGroupOwnerOfPaymentFailure(
      payment.cycle.group.id,
      payment.cycle.group.name,
      payment.userId,
      memberName,
      payment.amount,
      failureMessage
    );

    console.log(`Webhook: Payment ${paymentId} marked as FAILED - ${failureMessage}`);
  }

  private async handleTransferReversed(transfer: Stripe.Transfer) {
    const payoutId = transfer.metadata?.payoutId;
    if (!payoutId || transfer.metadata?.type !== 'rosca_payout') return;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { cycle: { include: { group: true } } },
    });

    if (!payout || payout.status === 'FAILED') return;

    await payoutService.failPayout(payoutId, 'Transfer was reversed by Stripe');

    console.log(`Webhook: Payout ${payoutId} marked as FAILED - transfer reversed`);
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    const user = await prisma.user.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (!user) return;

    const isOnboarded = !!(account.charges_enabled && account.payouts_enabled);

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectOnboarded: isOnboarded },
    });

    console.log(`Webhook: Connect account ${account.id} onboarded=${isOnboarded}`);
  }
}

export default new WebhookController();
