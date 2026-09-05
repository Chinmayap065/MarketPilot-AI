import { Router } from 'express';
import { getMarketStatus } from '../controllers/market.controller.js';

export const marketRouter = Router();
marketRouter.get('/status', getMarketStatus);
