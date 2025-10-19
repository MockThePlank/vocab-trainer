/**
 * Authentication middleware for protected routes
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';

/**
 * Middleware to validate admin API key
 * Checks the X-API-Key header against the ADMIN_API_KEY environment variable
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @returns Responds with 401 if API key is invalid, otherwise calls next()
 * 
 * @example
 * router.delete('/vocab/:id', requireApiKey, async (req, res) => {
 *   // Protected route logic
 * });
 */
export const requireApiKey = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const apiKey = req.header('X-API-Key');
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unautorisiert - Ungültiger API-Key' });
    return;
  }

  next();
};
