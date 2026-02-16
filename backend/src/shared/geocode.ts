import { config } from '../config/index.js';
import { cacheGet, cacheSet } from '../db/redis.js';

export type GeoCoords = { lat: number; lon: number };

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function geocodePlaceId(placeId: string): Promise<GeoCoords | null> {
  if (!placeId) return null;

  const cacheKey = `geocode:place_id:${placeId}`;
  const cached = await cacheGet<GeoCoords>(cacheKey);
  if (cached?.lat != null && cached?.lon != null) return cached;

  const apiKey = config.googleMaps.backendKey;
  if (!apiKey) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  const loc = data.results?.[0]?.geometry?.location;
  const lat = loc?.lat;
  const lng = loc?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const coords: GeoCoords = { lat, lon: lng };
  await cacheSet(cacheKey, coords, CACHE_TTL_SECONDS);
  return coords;
}
