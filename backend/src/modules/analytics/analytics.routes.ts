import { Router } from 'express';
import * as analyticsService from './analytics.service.js';
import { requireAuth, requireRoles, asyncHandler } from '../../shared/middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRoles('admin'));

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const stats = await analyticsService.getDashboardStats();
    res.json(stats);
  })
);

router.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await analyticsService.getAuditLog(limit, offset);
    res.json({ logs });
  })
);

export default router;
