import { Router } from 'express';
import webhookController from '../controllers/webhook.controller.js';

const router = Router();

router.post(
  '/stripe',
  webhookController.handleWebhook.bind(webhookController)
);

export default router;
