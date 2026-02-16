import { query } from '../../db/postgres.js';

export interface DashboardStats {
  totalDonors: number;
  totalHospitals: number;
  openRequests: number;
  fulfilledRequestsToday: number;
  donationsThisMonth: number;
  requestsByUrgency: { urgency: string; count: number }[];
  requestsByBloodGroup: { bloodGroup: string; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [donors, hospitals, openReqs, fulfilledToday, donationsMonth, byUrgency, byBlood] =
    await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) AS count FROM donors'),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM hospitals WHERE is_approved = TRUE'),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM blood_requests WHERE status = 'open'"),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM blood_requests WHERE status = 'fulfilled' AND DATE(fulfilled_at) = CURRENT_DATE`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM donations WHERE donated_at >= DATE_TRUNC('month', CURRENT_DATE)`
      ),
      query<{ urgency: string; count: string }>(
        `SELECT urgency, COUNT(*) AS count FROM blood_requests WHERE status = 'open' GROUP BY urgency`
      ),
      query<{ blood_group: string; count: string }>(
        `SELECT blood_group, COUNT(*) AS count FROM blood_requests WHERE status = 'open' GROUP BY blood_group`
      ),
    ]);

  return {
    totalDonors: parseInt(donors.rows[0]?.count ?? '0', 10),
    totalHospitals: parseInt(hospitals.rows[0]?.count ?? '0', 10),
    openRequests: parseInt(openReqs.rows[0]?.count ?? '0', 10),
    fulfilledRequestsToday: parseInt(fulfilledToday.rows[0]?.count ?? '0', 10),
    donationsThisMonth: parseInt(donationsMonth.rows[0]?.count ?? '0', 10),
    requestsByUrgency: byUrgency.rows.map((r: { urgency: string; count: string }) => ({ urgency: r.urgency, count: parseInt(r.count, 10) })),
    requestsByBloodGroup: byBlood.rows.map((r: { blood_group: string; count: string }) => ({ bloodGroup: r.blood_group, count: parseInt(r.count, 10) })),
  };
}

export async function getAuditLog(limit: number = 50, offset: number = 0) {
  const res = await query<{
    id: string;
    user_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    details: unknown;
    created_at: Date;
  }>(
    `SELECT id, user_id, action, resource_type, resource_id, details, created_at
     FROM audit_events ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
}
