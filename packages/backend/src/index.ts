import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SavePal API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (req: Request, res: Response) => {
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

// 404 handler
app.use((req: Request, res: Response) => {
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
