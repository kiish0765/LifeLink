/**
 * Seed script: create initial admin user.
 * Run: npx tsx src/db/seed.ts
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in env, or use defaults below.
 */
import 'dotenv/config';
import { createUser } from '../modules/auth/auth.service.js';
import { findUserByEmail } from '../modules/auth/auth.service.js';
import { pool } from './postgres.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@lifelink.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';

async function seed() {
  const existing = await findUserByEmail(ADMIN_EMAIL);
  if (existing) {
    console.log('Admin user already exists:', ADMIN_EMAIL);
    process.exit(0);
    return;
  }
  await createUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin', 'LifeLink Admin');
  console.log('Admin user created:', ADMIN_EMAIL);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
