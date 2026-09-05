import type { RequestHandler } from 'express';
import { MarketStatusService } from '../services/market-status.service.js';

const marketStatus = new MarketStatusService();

export const getMarketStatus: RequestHandler = (_request, response) => {
  response.json(marketStatus.getStatus());
};
