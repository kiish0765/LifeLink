import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { requireAuth } from './shared/middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import donorsRoutes from './modules/donors/donors.routes.js';
import hospitalsRoutes from './modules/hospitals/hospitals.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = express.Router();
api.use('/auth', authRoutes);
api.use('/donors', donorsRoutes);
api.use('/hospitals', hospitalsRoutes);
api.use('/requests', requestsRoutes);
api.use('/analytics', analyticsRoutes);

app.use(config.apiPrefix, api);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation error', errors: (err as { errors?: unknown }).errors });
  }
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
