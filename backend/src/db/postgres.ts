import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: Error) => {
  console.error('PostgreSQL pool error:', err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development' && duration > 100) {
    console.log('Slow query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  full_name: string;
  phone: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type DonorRow = {
  id: string;
  user_id: string;
  blood_group: string;
  date_of_birth: Date;
  gender: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location_place_id: string | null;
  last_donation_at: Date | null;
  is_available: boolean;
  verification_status: string;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type HospitalRow = {
  id: string;
  user_id: string;
  name: string;
  registration_number: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location_place_id: string | null;
  contact_phone: string | null;
  is_approved: boolean;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type BloodRequestRow = {
  id: string;
  hospital_id: string | null;
  requester_user_id: string;
  requester_role: string;
  blood_group: string;
  units_required: number;
  urgency: string;
  status: string;
  patient_info: string | null;
  notes: string | null;
  location_place_id: string;
  location_address: string | null;
  created_at: Date;
  updated_at: Date;
  fulfilled_at: Date | null;
};
