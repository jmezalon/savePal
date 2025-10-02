import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import cycleRoutes from './routes/cycle.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import notificationRoutes from './routes/notification.routes.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://save-pal-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed => origin.startsWith(allowed?.split('://')[0] + '://' + allowed?.split('://')[1]?.split('/')[0] || ''))) {
      return callback(null, true);
    }

    // For development, allow all Vercel preview deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SavePal API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SavePal API v1',
    version: '0.0.1',
    endpoints: {
      auth: '/api/auth',
      groups: '/api/groups (coming soon)',
      payments: '/api/payments (coming soon)',
    },
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Group routes
app.use('/api/groups', groupRoutes);

// Cycle routes
app.use('/api/cycles', cycleRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Payout routes
app.use('/api/payouts', payoutRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️ [server]: Server is running at http://localhost:${port}`);
  console.log(`⚡️ [server]: Health check available at http://localhost:${port}/health`);
});

export default app;
