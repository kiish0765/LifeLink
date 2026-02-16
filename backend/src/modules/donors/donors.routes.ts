import { Router } from 'express';
import { z } from 'zod';
import * as donorsService from './donors.service.js';
import { requireAuth, requireRoles, asyncHandler } from '../../shared/middleware.js';
import { BLOOD_GROUPS, type BloodGroup } from '../../shared/types.js';
import { auditPostgres, auditMongo, getClientIp } from '../../shared/audit.js';

const router = Router();

router.use(requireAuth);

const createDonorSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS as unknown as [BloodGroup, ...BloodGroup[]]),
  dateOfBirth: z.string(),
  gender: z.string().max(20).optional(),
  addressLine: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const updateDonorSchema = z.object({
  addressLine: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isAvailable: z.boolean().optional(),
});

// Donor: register profile (once)
router.post(
  '/',
  requireRoles('donor'),
  asyncHandler(async (req, res) => {
    if (!req.user) return;
    const existing = await donorsService.getDonorByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ message: 'Donor profile already exists' });
    }
    const body = createDonorSchema.parse(req.body);
    const donor = await donorsService.createDonor({
      userId: req.user.id,
      bloodGroup: body.bloodGroup as BloodGroup,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      addressLine: body.addressLine,
      city: body.city,
      state: body.state,
      country: body.country,
      latitude: body.latitude,
      longitude: body.longitude,
    });
    const ip = getClientIp(req);
    await auditPostgres(req.user.id, 'donor_created', 'donor', donor.id, undefined, ip);
    await auditMongo(req.user.id, req.user.role, 'donor_created', 'donor', donor.id, undefined, ip);
    res.status(201).json(donor);
  })
);

// Get my donor profile
router.get(
  '/me',
  requireRoles('donor'),
  asyncHandler(async (req, res) => {
    if (!req.user) return;
    const donor = await donorsService.getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }
    res.json(donor);
  })
);

// Update my donor profile (location, availability)
router.patch(
  '/me',
  requireRoles('donor'),
  asyncHandler(async (req, res) => {
    if (!req.user?.donorId) {
      return res.status(403).json({ message: 'Donor profile required' });
    }
    const body = updateDonorSchema.parse(req.body);
    const donor = await donorsService.updateDonor(req.user.donorId, {
      addressLine: body.addressLine,
      city: body.city,
      state: body.state,
      latitude: body.latitude,
      longitude: body.longitude,
      isAvailable: body.isAvailable,
    });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  })
);

// Admin: list donors (with filters)
router.get(
  '/',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const bloodGroup = req.query.bloodGroup as string | undefined;
    const city = req.query.city as string | undefined;
    const availableOnly = req.query.available === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const donors = await donorsService.listDonors({
      bloodGroup: bloodGroup && BLOOD_GROUPS.includes(bloodGroup as typeof BLOOD_GROUPS[number]) ? bloodGroup as typeof BLOOD_GROUPS[number] : undefined,
      city,
      availableOnly,
      limit,
      offset,
    });
    res.json({ donors, count: donors.length });
  })
);

// Get donor by id (admin or for matching)
router.get(
  '/:id',
  requireRoles('admin', 'donor'),
  asyncHandler(async (req, res) => {
    const donor = await donorsService.getDonorById(req.params.id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    if (req.user!.role === 'donor' && req.user!.donorId !== donor.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(donor);
  })
);

// Admin: verify or reject donor
router.post(
  '/:id/verify',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const schema = z.object({ status: z.enum(['verified', 'rejected']) });
    const { status } = schema.parse(req.body);
    const donor = await donorsService.verifyDonor(req.params.id, status);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    const ip = getClientIp(req);
    await auditPostgres(req.user!.id, 'donor_verified', 'donor', donor.id, { status }, ip);
    res.json(donor);
  })
);

export default router;
