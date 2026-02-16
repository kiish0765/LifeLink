import { Router } from 'express';
import { z } from 'zod';
import * as hospitalsService from './hospitals.service.js';
import { requireAuth, requireRoles, asyncHandler } from '../../shared/middleware.js';
import { auditPostgres, auditMongo, getClientIp } from '../../shared/audit.js';

const router = Router();

router.use(requireAuth);

const createHospitalSchema = z.object({
  name: z.string().min(1).max(255),
  registrationNumber: z.string().max(100).optional(),
  addressLine: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  locationPlaceId: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
});

// Hospital: register profile
router.post(
  '/',
  requireRoles('hospital'),
  asyncHandler(async (req, res) => {
    if (!req.user) return;
    const existing = await hospitalsService.getHospitalByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ message: 'Hospital profile already exists' });
    }
    const body = createHospitalSchema.parse(req.body);
    const hospital = await hospitalsService.createHospital({
      userId: req.user.id,
      ...body,
    });
    const ip = getClientIp(req);
    await auditPostgres(req.user.id, 'hospital_created', 'hospital', hospital.id, undefined, ip);
    await auditMongo(req.user.id, req.user.role, 'hospital_created', 'hospital', hospital.id, undefined, ip);
    res.status(201).json(hospital);
  })
);

router.get(
  '/me',
  requireRoles('hospital'),
  asyncHandler(async (req, res) => {
    if (!req.user) return;
    const hospital = await hospitalsService.getHospitalByUserId(req.user.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });
    res.json(hospital);
  })
);

// Admin: list hospitals
router.get(
  '/',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const approvedOnly = req.query.approved === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitals = await hospitalsService.listHospitals({ approvedOnly, limit, offset });
    res.json({ hospitals, count: hospitals.length });
  })
);

// Admin: approve hospital
router.post(
  '/:id/approve',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const hospital = await hospitalsService.approveHospital(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    const ip = getClientIp(req);
    await auditPostgres(req.user!.id, 'hospital_approved', 'hospital', hospital.id, undefined, ip);
    res.json(hospital);
  })
);

export default router;
