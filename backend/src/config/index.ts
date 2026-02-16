import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (parent of backend)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // also load backend/.env if present

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) throw new Error(`Missing env: ${key}`);
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const v = process.env[key];
  return v ? parseInt(v, 10) : defaultValue;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: getEnvNumber('PORT', 4000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d',
  },
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: getEnvNumber('POSTGRES_PORT', 5432),
    user: process.env.POSTGRES_USER ?? 'lifelink',
    password: process.env.POSTGRES_PASSWORD ?? 'lifelink_secret',
    database: process.env.POSTGRES_DB ?? 'lifelink',
  },
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/lifelink',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    presenceTtlSeconds: getEnvNumber('REDIS_PRESENCE_TTL', 300),
  },
  wsPath: process.env.WS_PATH ?? '/ws',
  smtp: {
    host: process.env.SMTP_HOST,
    port: getEnvNumber('SMTP_PORT', 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'LifeLink <noreply@lifelink.app>',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  googleMaps: {
    backendKey: process.env.GOOGLE_MAPS_BACKEND_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    max: getEnvNumber('RATE_LIMIT_MAX', 100),
  },
  donationRules: {
    minDonationIntervalDays: getEnvNumber('MIN_DONATION_INTERVAL_DAYS', 90),
    maxDonorAge: getEnvNumber('MAX_DONOR_AGE', 65),
    minDonorAge: getEnvNumber('MIN_DONOR_AGE', 18),
  },
} as const;

export type Config = typeof config;
