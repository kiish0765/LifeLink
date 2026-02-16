import { query, HospitalRow } from '../../db/postgres.js';

export interface CreateHospitalInput {
  userId: string;
  name: string;
  registrationNumber?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  locationPlaceId?: string;
  contactPhone?: string;
}

export async function createHospital(data: CreateHospitalInput): Promise<HospitalRow> {
  const res = await query<HospitalRow>(
    `INSERT INTO hospitals (
      user_id, name, registration_number, address_line, city, state, country,
      location_place_id, contact_phone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      data.userId,
      data.name,
      data.registrationNumber ?? null,
      data.addressLine ?? null,
      data.city ?? null,
      data.state ?? null,
      data.country ?? 'India',
      data.locationPlaceId ?? null,
      data.contactPhone ?? null,
    ]
  );
  return res.rows[0];
}

export async function getHospitalByUserId(userId: string): Promise<HospitalRow | null> {
  const res = await query<HospitalRow>('SELECT * FROM hospitals WHERE user_id = $1', [userId]);
  return res.rows[0] ?? null;
}

export async function getHospitalById(id: string): Promise<HospitalRow | null> {
  const res = await query<HospitalRow>('SELECT * FROM hospitals WHERE id = $1', [id]);
  return res.rows[0] ?? null;
}

export async function approveHospital(id: string): Promise<HospitalRow | null> {
  const res = await query<HospitalRow>(
    `UPDATE hospitals SET is_approved = TRUE, approved_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function listHospitals(filters: {
  approvedOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<HospitalRow[]> {
  const conditions = filters.approvedOnly ? ['is_approved = TRUE'] : ['1=1'];
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const res = await query<HospitalRow>(
    `SELECT * FROM hospitals WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
}
