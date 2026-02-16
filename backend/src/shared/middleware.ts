import { Request, Response, NextFunction } from 'express';
import { verifyToken, getAuthUser } from '../modules/auth/auth.service.js';
import type { AuthUser } from './types.js';
import type { UserRole } from './types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
    }
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    const authUser = await getAuthUser(payload.sub);
    if (!authUser) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    req.user = authUser;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyToken(token);
    if (payload.type === 'access') {
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }
  } catch {
    // ignore
  }
  next();
}
