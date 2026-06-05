import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './auth.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header.' });
    return;
  }
  try {
    req.user = verifyToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token is expired or invalid.' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}
