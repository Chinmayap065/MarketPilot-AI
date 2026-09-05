import { Router } from 'express';
import { getAssetDetail, getAssetSearch, getHistory, getQuote, getStatus } from '../controllers/market-data.controller.js';

export const marketDataRouter = Router();
marketDataRouter.get('/assets/search', getAssetSearch);
marketDataRouter.get('/assets/:symbol', getAssetDetail);
marketDataRouter.get('/market/:symbol/quote', getQuote);
marketDataRouter.get('/market/:symbol/history', getHistory);
marketDataRouter.get('/market/:symbol/status', getStatus);
