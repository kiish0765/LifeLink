import { query } from '../../db/postgres.js';
import { BLOOD_GROUP_COMPATIBILITY, type BloodGroup, type UrgencyLevel } from '../../shared/types.js';
import { config } from '../../config/index.js';
import { isDonorAvailable } from '../../db/redis.js';

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface EligibleDonor {
  donorId: string;
  userId: string;
  bloodGroup: BloodGroup;
  latitude: number;
  longitude: number;
  distanceKm: number;
  lastDonationAt: Date | null;
  isAvailable: boolean;
}

const MIN_DAYS = 90;

export async function findEligibleDonors(
  requestId: string,
  requestBloodGroup: BloodGroup,
  requestLat: number,
  requestLon: number,
  maxDistanceKm: number = 100,
  limit: number = 50
): Promise<EligibleDonor[]> {
  const intervalDays = config.donationRules.minDonationIntervalDays ?? MIN_DAYS;
  const compatibleGroups = BLOOD_GROUP_COMPATIBILITY[requestBloodGroup];
  const res = await query<{
    id: string;
    user_id: string;
    blood_group: string;
    latitude: number;
    longitude: number;
    last_donation_at: Date | null;
    is_available: boolean;
    date_of_birth: string;
  }>(
    `SELECT d.id, d.user_id, d.blood_group, d.latitude, d.longitude, d.last_donation_at, d.is_available, d.date_of_birth
     FROM donors d
     JOIN users u ON u.id = d.user_id AND u.is_active = TRUE
     WHERE d.blood_group = ANY($1)
       AND d.verification_status = 'verified'
       AND d.is_available = TRUE
       AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
       AND (d.last_donation_at IS NULL OR d.last_donation_at < NOW() - ($2 || ' days')::INTERVAL)
     LIMIT $3`,
    [compatibleGroups, intervalDays, limit * 3]
  );

  const today = new Date();
  const minAge = config.donationRules.minDonorAge ?? 18;
  const maxAge = config.donationRules.maxDonorAge ?? 65;

  const withDistance: EligibleDonor[] = [];
  for (const row of res.rows) {
    const age =
      today.getFullYear() -
      new Date(row.date_of_birth).getFullYear();
    if (age < minAge || age > maxAge) continue;
    const distanceKm = haversineDistanceKm(
      requestLat,
      requestLon,
      Number(row.latitude),
      Number(row.longitude)
    );
    if (distanceKm > maxDistanceKm) continue;
    const redisAvailable = await isDonorAvailable(row.id);
    if (!redisAvailable) continue;
    withDistance.push({
      donorId: row.id,
      userId: row.user_id,
      bloodGroup: row.blood_group as BloodGroup,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      lastDonationAt: row.last_donation_at,
      isAvailable: row.is_available,
    });
  }

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance.slice(0, limit);
}

export function urgencyPriority(urgency: UrgencyLevel): number {
  switch (urgency) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 2;
  }
}
