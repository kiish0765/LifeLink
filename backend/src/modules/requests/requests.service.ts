import { query, BloodRequestRow } from '../../db/postgres.js';
import type { BloodGroup, UrgencyLevel, RequestStatus } from '../../shared/types.js';
import * as matchingService from '../matching/matching.service.js';
import { geocodePlaceId } from '../../shared/geocode.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const URGENCIES: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: RequestStatus[] = ['open', 'matched', 'in_progress', 'fulfilled', 'cancelled'];

export interface CreateRequestInput {
  hospitalId: string | null;
  requesterUserId: string;
  requesterRole: 'hospital' | 'receiver';
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency?: UrgencyLevel;
  patientInfo?: string;
  notes?: string;
  locationPlaceId: string;
  locationAddress?: string;
}

export async function createRequest(data: CreateRequestInput): Promise<BloodRequestRow> {
  const urgency = data.urgency ?? 'high';
  const res = await query<BloodRequestRow>(
    `INSERT INTO blood_requests (
      hospital_id, requester_user_id, requester_role, blood_group, units_required, urgency, patient_info, notes,
      location_place_id, location_address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.hospitalId,
      data.requesterUserId,
      data.requesterRole,
      data.bloodGroup,
      data.unitsRequired,
      urgency,
      data.patientInfo ?? null,
      data.notes ?? null,
      data.locationPlaceId,
      data.locationAddress ?? null,
    ]
  );
  return res.rows[0];
}

export async function getRequestById(id: string): Promise<BloodRequestRow | null> {
  const res = await query<BloodRequestRow>('SELECT * FROM blood_requests WHERE id = $1', [id]);
  return res.rows[0] ?? null;
}

export async function listRequestsByHospital(hospitalId: string): Promise<BloodRequestRow[]> {
  const res = await query<BloodRequestRow>(
    'SELECT * FROM blood_requests WHERE hospital_id = $1 ORDER BY created_at DESC',
    [hospitalId]
  );
  return res.rows;
}

export async function listOpenRequests(filters?: {
  bloodGroup?: BloodGroup;
  urgency?: UrgencyLevel;
  limit?: number;
}): Promise<BloodRequestRow[]> {
  let sql = `SELECT * FROM blood_requests WHERE status = 'open'`;
  const params: unknown[] = [];
  let i = 1;
  if (filters?.bloodGroup) {
    sql += ` AND blood_group = $${i++}`;
    params.push(filters.bloodGroup);
  }
  if (filters?.urgency) {
    sql += ` AND urgency = $${i++}`;
    params.push(filters.urgency);
  }
  sql += ` ORDER BY 
    CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    created_at ASC`;
  const limit = filters?.limit ?? 50;
  sql += ` LIMIT $${i}`;
  params.push(limit);
  const res = await query<BloodRequestRow>(sql, params);
  return res.rows;
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<BloodRequestRow | null> {
  const fulfilledAt = status === 'fulfilled' ? new Date() : null;
  const res = await query<BloodRequestRow>(
    `UPDATE blood_requests SET status = $1, fulfilled_at = $2 WHERE id = $3 RETURNING *`,
    [status, fulfilledAt, id]
  );
  return res.rows[0] ?? null;
}

export async function getEligibleDonorsForRequest(requestId: string): Promise<matchingService.EligibleDonor[]> {
  const req = await getRequestById(requestId);
  if (!req) return [];
  const coords = await geocodePlaceId(req.location_place_id);
  if (!coords) return [];
  return matchingService.findEligibleDonors(
    requestId,
    req.blood_group as BloodGroup,
    coords.lat,
    coords.lon,
    100,
    50
  );
}

export async function createMatch(requestId: string, donorId: string, distanceKm?: number): Promise<void> {
  await query(
    `INSERT INTO request_matches (request_id, donor_id, distance_km) VALUES ($1, $2, $3)
     ON CONFLICT (request_id, donor_id) DO NOTHING`,
    [requestId, donorId, distanceKm ?? null]
  );
}

export async function setMatchResponse(
  requestId: string,
  donorId: string,
  status: 'accepted' | 'rejected'
): Promise<boolean> {
  const res = await query(
    `UPDATE request_matches SET status = $1, responded_at = NOW() WHERE request_id = $2 AND donor_id = $3`,
    [status, requestId, donorId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getMatchesForRequest(requestId: string) {
  const res = await query<{
    id: string;
    request_id: string;
    donor_id: string;
    status: string;
    distance_km: number | null;
    matched_at: Date;
    responded_at: Date | null;
  }>(
    `SELECT id, request_id, donor_id, status, distance_km, matched_at, responded_at
     FROM request_matches WHERE request_id = $1 ORDER BY distance_km ASC NULLS LAST`,
    [requestId]
  );
  return res.rows;
}

export async function getDonationHistory(donorId: string) {
  const res = await query<{
    id: string;
    donor_id: string;
    request_id: string | null;
    units_donated: number;
    donated_at: Date;
    notes: string | null;
  }>(
    `SELECT id, donor_id, request_id, units_donated, donated_at, notes
     FROM donations WHERE donor_id = $1 ORDER BY donated_at DESC`,
    [donorId]
  );
  return res.rows;
}

export async function recordDonation(
  donorId: string,
  requestId: string | null,
  unitsDonated: number,
  verifiedBy?: string
): Promise<void> {
  await query(
    `INSERT INTO donations (donor_id, request_id, units_donated, verified_by) VALUES ($1, $2, $3, $4)`,
    [donorId, requestId, unitsDonated, verifiedBy ?? null]
  );
  await query(
    'UPDATE donors SET last_donation_at = NOW() WHERE id = $1',
    [donorId]
  );
}
