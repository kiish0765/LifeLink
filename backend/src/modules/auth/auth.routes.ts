import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../shared/middleware.js';
import { requireAuth } from '../../shared/middleware.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['donor', 'receiver', 'hospital']),
  fullName: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await authService.findUserByEmail(body.email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await authService.createUser(
      body.email,
      body.password,
      body.role,
      body.fullName,
      body.phone
    );
    const accessToken = authService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'donor' | 'receiver' | 'hospital',
    });
    const refreshToken = authService.signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'donor' | 'receiver' | 'hospital',
    });
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      },
      accessToken,
      refreshToken,
      expiresIn: '7d',
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await authService.findUserByEmail(body.email);
    if (!user || !(await authService.verifyPassword(body.password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const accessToken = authService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'admin' | 'donor' | 'receiver' | 'hospital',
    });
    const refreshToken = authService.signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'admin' | 'donor' | 'receiver' | 'hospital',
    });
    const authUser = await authService.getAuthUser(user.id);
    res.json({
      user: authUser,
      accessToken,
      refreshToken,
      expiresIn: '7d',
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken ?? req.body.refresh_token;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    const payload = authService.verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    const authUser = await authService.getAuthUser(payload.sub);
    if (!authUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    const newAccess = authService.signAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    res.json({
      accessToken: newAccess,
      user: authUser,
      expiresIn: '7d',
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = await authService.getAuthUser(req.user!.id);
    if (!authUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: authUser });
  })
);

export default router;
