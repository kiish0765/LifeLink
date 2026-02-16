import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, UserRow } from '../../db/postgres.js';
import { config } from '../../config/index.js';
import type { UserRole } from '../../shared/types.js';
import type { JwtPayload, AuthUser } from '../../shared/types.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.jwt.secret as jwt.Secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwt.secret as jwt.Secret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email.toLowerCase()]
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const res = await query<UserRow>('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [id]);
  return res.rows[0] ?? null;
}

export async function createUser(
  email: string,
  password: string,
  role: UserRole,
  fullName: string,
  phone?: string
): Promise<UserRow> {
  const passwordHash = await hashPassword(password);
  const res = await query<UserRow>(
    `INSERT INTO users (email, password_hash, role, full_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [email.toLowerCase(), passwordHash, role, fullName, phone ?? null]
  );
  return res.rows[0];
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const auth: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
  };
  if (user.role === 'donor') {
    const d = await query<{ id: string }>('SELECT id FROM donors WHERE user_id = $1', [user.id]);
    if (d.rows[0]) auth.donorId = d.rows[0].id;
  }
  if (user.role === 'hospital') {
    const h = await query<{ id: string }>('SELECT id FROM hospitals WHERE user_id = $1', [user.id]);
    if (h.rows[0]) auth.hospitalId = h.rows[0].id;
  }
  return auth;
}
