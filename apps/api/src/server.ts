import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { assetRouter } from './routes/asset.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { marketRouter } from './routes/market.routes.js';
import { marketDataRouter } from './routes/market-data.routes.js';
import { logger } from './utils/logger.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.webUrl }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use((request, _response, next) => {
  logger.info('API request', { method: request.method, path: request.path });
  next();
});

app.use('/api/health', healthRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1/market', marketRouter);
app.use('/api/v1', marketDataRouter);
app.get('/health', (_request, response) => response.redirect('/api/health'));

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(env.apiPort, () => logger.info('API server started', { port: env.apiPort }));
}
