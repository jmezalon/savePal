import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth.js';

/**
 * Middleware to authenticate requests using JWT
 * Attaches userId to request object if valid
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Authorization header required.',
      });
    }

    const decoded = verifyToken(token);

    // Attach user info to request
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both authenticated and non-authenticated users
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.email;
    }

    next();
  } catch (error) {
    // Token provided but invalid - just continue without userId
    next();
  }
}
