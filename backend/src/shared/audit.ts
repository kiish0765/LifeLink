import { query } from '../db/postgres.js';
import { ActivityLog } from '../db/mongo.js';

export async function auditPostgres(
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  await query(
    `INSERT INTO audit_events (user_id, action, resource_type, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId ?? null,
      action,
      resourceType ?? null,
      resourceId ?? null,
      details ? JSON.stringify(details) : null,
      ip ?? null,
    ]
  );
}

export async function auditMongo(
  userId: string | null,
  role: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  try {
    await ActivityLog.create({
      userId: userId ?? undefined,
      role,
      action,
      resourceType,
      resourceId,
      details,
      ip,
    });
  } catch {
    // MongoDB may be unavailable; skip activity log
  }
}

export function getClientIp(req: { ip?: string; connection?: { remoteAddress?: string } }): string | undefined {
  return req.ip ?? req.connection?.remoteAddress;
}
