import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: config.redis.url });
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
}

const PRESENCE_PREFIX = 'presence:';
const DONOR_AVAILABLE_PREFIX = 'donor:available:';
const CACHE_PREFIX = 'cache:';

export async function setPresence(userId: string, lat?: number, lon?: number): Promise<void> {
  const redis = await getRedis();
  const payload = JSON.stringify({
    lat: lat ?? null,
    lon: lon ?? null,
    at: Date.now(),
  });
  await redis.setEx(
    `${PRESENCE_PREFIX}${userId}`,
    config.redis.presenceTtlSeconds,
    payload
  );
}

export async function getPresence(userId: string): Promise<{ lat: number | null; lon: number | null } | null> {
  const redis = await getRedis();
  const raw = await redis.get(`${PRESENCE_PREFIX}${userId}`);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { lat: number | null; lon: number | null };
    return { lat: o.lat ?? null, lon: o.lon ?? null };
  } catch {
    return null;
  }
}

export async function setDonorAvailable(donorId: string, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  await redis.setEx(`${DONOR_AVAILABLE_PREFIX}${donorId}`, ttlSeconds, '1');
}

export async function isDonorAvailable(donorId: string): Promise<boolean> {
  const redis = await getRedis();
  const v = await redis.get(`${DONOR_AVAILABLE_PREFIX}${donorId}`);
  return v === '1';
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const raw = await redis.get(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  await redis.setEx(`${CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`${CACHE_PREFIX}${key}`);
}
