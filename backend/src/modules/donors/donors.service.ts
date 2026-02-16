import { query, DonorRow } from '../../db/postgres.js';
import { config } from '../../config/index.js';
import type { BloodGroup } from '../../shared/types.js';
import { setDonorAvailable } from '../../db/redis.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function isValidBloodGroup(b: string): b is BloodGroup {
  return BLOOD_GROUPS.includes(b as BloodGroup);
}

export interface CreateDonorInput {
  userId: string;
  bloodGroup: BloodGroup;
  dateOfBirth: string;
  gender?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  locationPlaceId?: string;
}

export async function createDonor(data: CreateDonorInput): Promise<DonorRow> {
  if (!isValidBloodGroup(data.bloodGroup)) {
    throw new Error('Invalid blood group');
  }
  const res = await query<DonorRow>(
    `INSERT INTO donors (
      user_id, blood_group, date_of_birth, gender, address_line, city, state, country,
      location_place_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      data.userId,
      data.bloodGroup,
      data.dateOfBirth,
      data.gender ?? null,
      data.addressLine ?? null,
      data.city ?? null,
      data.state ?? null,
      data.country ?? 'India',
      data.locationPlaceId ?? null,
    ]
  );
  return res.rows[0];
}

export async function getDonorByUserId(userId: string): Promise<DonorRow | null> {
  const res = await query<DonorRow>('SELECT * FROM donors WHERE user_id = $1', [userId]);
  return res.rows[0] ?? null;
}

export async function getDonorById(id: string): Promise<DonorRow | null> {
  const res = await query<DonorRow>('SELECT * FROM donors WHERE id = $1', [id]);
  return res.rows[0] ?? null;
}

export async function updateDonor(
  donorId: string,
  updates: Partial<{
    addressLine: string;
    city: string;
    state: string;
    locationPlaceId: string;
    isAvailable: boolean;
  }>
): Promise<DonorRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (updates.addressLine !== undefined) {
    sets.push(`address_line = $${i++}`);
    values.push(updates.addressLine);
  }
  if (updates.city !== undefined) {
    sets.push(`city = $${i++}`);
    values.push(updates.city);
  }
  if (updates.state !== undefined) {
    sets.push(`state = $${i++}`);
    values.push(updates.state);
  }
  if (updates.locationPlaceId !== undefined) {
    sets.push(`location_place_id = $${i++}`);
    values.push(updates.locationPlaceId);
  }
  if (updates.isAvailable !== undefined) {
    sets.push(`is_available = $${i++}`);
    values.push(updates.isAvailable);
  }
  if (sets.length === 0) return getDonorById(donorId);
  values.push(donorId);
  const res = await query<DonorRow>(
    `UPDATE donors SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (res.rows[0] && updates.isAvailable === true) {
    await setDonorAvailable(donorId, config.redis.presenceTtlSeconds);
  }
  return res.rows[0] ?? null;
}

export async function setLastDonation(donorId: string, donatedAt: Date): Promise<void> {
  await query(
    'UPDATE donors SET last_donation_at = $1 WHERE id = $2',
    [donatedAt, donorId]
  );
}

export async function verifyDonor(donorId: string, status: 'verified' | 'rejected'): Promise<DonorRow | null> {
  const res = await query<DonorRow>(
    `UPDATE donors
     SET verification_status = $1::varchar,
         verified_at = CASE WHEN $1::varchar = 'verified'::varchar THEN NOW() ELSE NULL END
     WHERE id = $2
     RETURNING *`,
    [status, donorId]
  );
  return res.rows[0] ?? null;
}

export async function listDonors(filters: {
  bloodGroup?: BloodGroup;
  city?: string;
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<DonorRow[]> {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;
  if (filters.bloodGroup) {
    conditions.push(`blood_group = $${i++}`);
    params.push(filters.bloodGroup);
  }
  if (filters.city) {
    conditions.push(`city ILIKE $${i++}`);
    params.push(`%${filters.city}%`);
  }
  if (filters.availableOnly) {
    conditions.push('is_available = TRUE');
  }
  params.push(filters.limit ?? 50, filters.offset ?? 0);
  const res = await query<DonorRow>(
    `SELECT * FROM donors WHERE ${conditions.join(' AND ')}
     ORDER BY updated_at DESC LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return res.rows;
}

export function isEligibleByInterval(lastDonationAt: Date | null): boolean {
  if (!lastDonationAt) return true;
  const days = (Date.now() - new Date(lastDonationAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= config.donationRules.minDonationIntervalDays;
}

export function isEligibleByAge(dateOfBirth: string): boolean {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= config.donationRules.minDonorAge && age <= config.donationRules.maxDonorAge;
}
