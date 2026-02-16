import http from 'http';
import { config } from './config/index.js';
import { connectMongo } from './db/mongo.js';
import { pool } from './db/postgres.js';
import { getRedis } from './db/redis.js';
import { initWsServer } from './ws/server.js';
import app from './app.js';

async function main() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed (API cannot start):', (err as Error).message);
    process.exit(1);
  }

  try {
    await connectMongo();
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection failed (activity/notification logs disabled):', (err as Error).message);
  }

  try {
    await getRedis();
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis connection failed (presence/matching cache disabled):', (err as Error).message);
  }

  const server = http.createServer(app);
  initWsServer(server);

  server.listen(config.port, () => {
    console.log(`LifeLink API listening on port ${config.port}`);
    console.log(`WebSocket path: ${config.wsPath}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
