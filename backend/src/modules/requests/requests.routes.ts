import { Router } from 'express';
import { z } from 'zod';
import * as requestsService from './requests.service.js';
import { requireAuth, requireRoles, asyncHandler } from '../../shared/middleware.js';
import { BLOOD_GROUPS, type BloodGroup } from '../../shared/types.js';
import { auditPostgres, auditMongo, getClientIp } from '../../shared/audit.js';
import { broadcastNewRequest, notifyDonorsSmsEmail } from '../notifications/notifications.service.js';

const router = Router();

router.use(requireAuth);

const createRequestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS as unknown as [BloodGroup, ...BloodGroup[]]),
  unitsRequired: z.number().int().min(1).max(20),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  patientInfo: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
  locationPlaceId: z.string().max(200).optional(),
  locationAddress: z.string().max(500).optional(),
});

// Hospital: create emergency blood request (triggers broadcast + SMS/Email)
router.post(
  '/',
  requireRoles('hospital', 'receiver'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const body = createRequestSchema.parse(req.body);
    let hospitalId: string | null = null;
    let hospitalPlaceId: string | null = null;
    if (req.user.role === 'hospital') {
      if (!req.user.hospitalId) {
        return res.status(403).json({ message: 'Hospital profile required' });
      }
      hospitalId = req.user.hospitalId;
      const hospital = await import('../hospitals/hospitals.service.js').then((m) =>
        m.getHospitalById(req.user!.hospitalId!)
      );
      hospitalPlaceId = hospital?.location_place_id ?? null;
    }
    const placeId = body.locationPlaceId ?? hospitalPlaceId;
    if (!placeId) {
      return res.status(400).json({ message: 'Location (Google Maps place id) required for matching' });
    }

    const requesterRole = (req.user.role === 'hospital' || req.user.role === 'receiver')
      ? req.user.role
      : 'receiver';

    const request = await requestsService.createRequest({
      hospitalId,
      requesterUserId: req.user!.id,
      requesterRole,
      bloodGroup: body.bloodGroup as BloodGroup,
      unitsRequired: body.unitsRequired,
      urgency: body.urgency,
      patientInfo: body.patientInfo,
      notes: body.notes,
      locationPlaceId: placeId,
      locationAddress: body.locationAddress,
    });
    const ip = getClientIp(req);
    await auditPostgres(req.user.id, 'blood_request_created', 'blood_request', request.id, undefined, ip);
    await auditMongo(req.user.id, req.user.role, 'blood_request_created', 'blood_request', request.id, undefined, ip);

    const eligible = await requestsService.getEligibleDonorsForRequest(request.id);
    for (const d of eligible) {
      await requestsService.createMatch(request.id, d.donorId, d.distanceKm);
    }
    await broadcastNewRequest(request, eligible);
    await notifyDonorsSmsEmail(request, eligible);

    res.status(201).json(request);
  })
);

// Hospital: list my requests
router.get(
  '/my',
  requireRoles('hospital'),
  asyncHandler(async (req, res) => {
    if (!req.user?.hospitalId) return res.status(403).json({ message: 'Hospital profile required' });
    const requests = await requestsService.listRequestsByHospital(req.user.hospitalId);
    res.json({ requests });
  })
);

// Get request by id (hospital owner or admin)
router.get(
  '/:id',
  requireRoles('admin', 'hospital'),
  asyncHandler(async (req, res) => {
    const request = await requestsService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user!.role === 'hospital' && request.hospital_id !== req.user!.hospitalId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const matches = await requestsService.getMatchesForRequest(req.params.id);
    res.json({ request, matches });
  })
);

// Donor: list open requests (for discovery)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const bloodGroup = req.query.bloodGroup as string | undefined;
    const urgency = req.query.urgency as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const requests = await requestsService.listOpenRequests({
      bloodGroup: bloodGroup && BLOOD_GROUPS.includes(bloodGroup as typeof BLOOD_GROUPS[number]) ? bloodGroup as typeof BLOOD_GROUPS[number] : undefined,
      urgency: urgency as 'low' | 'medium' | 'high' | 'critical' | undefined,
      limit,
    });
    res.json({ requests });
  })
);

// Donor: accept or reject match
router.post(
  '/:id/respond',
  requireRoles('donor'),
  asyncHandler(async (req, res) => {
    if (!req.user?.donorId) return res.status(403).json({ message: 'Donor profile required' });
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ status: z.enum(['accepted', 'rejected']) });
    const { id: requestId } = paramsSchema.parse(req.params);
    const { status } = bodySchema.parse(req.body);
    const updated = await requestsService.setMatchResponse(requestId, req.user.donorId, status);
    if (!updated) {
      return res.status(404).json({ message: 'Match not found for this donor and request' });
    }
    const ip = getClientIp(req);
    await auditPostgres(req.user.id, 'match_responded', 'blood_request', requestId, { status }, ip);
    res.json({ message: 'Response recorded' });
  })
);

// Donor: my donation history
router.get(
  '/donations/me',
  requireRoles('donor'),
  asyncHandler(async (req, res) => {
    if (!req.user?.donorId) return res.status(403).json({ message: 'Donor profile required' });
    const donations = await requestsService.getDonationHistory(req.user.donorId);
    res.json({ donations });
  })
);

// Hospital/Admin: update request status
router.patch(
  '/:id/status',
  requireRoles('admin', 'hospital'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(['open', 'matched', 'in_progress', 'fulfilled', 'cancelled']),
    });
    const { status } = schema.parse(req.body);
    const request = await requestsService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user!.role === 'hospital' && request.hospital_id !== req.user!.hospitalId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const updated = await requestsService.updateRequestStatus(req.params.id, status);
    res.json(updated);
  })
);

// Record donation (hospital/admin after donation completed)
router.post(
  '/:id/donations',
  requireRoles('admin', 'hospital'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      donorId: z.string().uuid(),
      unitsDonated: z.number().min(0.5).max(2),
    });
    const { donorId, unitsDonated } = schema.parse(req.body);
    const request = await requestsService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    await requestsService.recordDonation(donorId, req.params.id, unitsDonated, req.user!.id);
    res.status(201).json({ message: 'Donation recorded' });
  })
);

export default router;
