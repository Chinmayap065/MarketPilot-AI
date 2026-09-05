import type { RequestHandler } from 'express';
import { z } from 'zod';
import { MarketDataService } from '../services/market-data/market-data.service.js';
import { supportedTimeframes, validateDateRange } from '../services/market-data/validation.js';
import { ApiError } from '../middleware/error-handler.js';

const service = new MarketDataService();
const historySchema = z.object({ timeframe: z.enum(supportedTimeframes as [string, ...string[]]), start: z.string(), end: z.string() });

export const getQuote: RequestHandler = async (request, response, next) => { try { response.json(await service.getQuote(String(request.params.symbol))); } catch (error) { next(error); } };
export const getHistory: RequestHandler = async (request, response, next) => { try { const params = historySchema.parse(request.query); const range = validateDateRange(params.start, params.end); response.json(await service.getHistory(String(request.params.symbol), params.timeframe as never, range.start, range.end)); } catch (error) { if (error instanceof Error && ['invalid_date_range', 'date_order', 'date_range_too_large', 'future_date_range'].includes(error.message)) { next(new ApiError(400, 'INVALID_DATE_RANGE', 'The requested historical date range is invalid or too large')); return; } next(error); } };
export const getAssetDetail: RequestHandler = (request, response) => { const asset = service.findAsset(String(request.params.symbol)); response.json({ data: asset ?? null, meta: { supported: Boolean(asset), dataAvailability: asset ? 'NOT_CONFIGURED' : 'UNSUPPORTED' } }); };
export const getAssetSearch: RequestHandler = (request, response) => { const query = String(request.query.q ?? ''); const data = service.searchAssets(query); response.json({ data, count: data.length }); };
export const getStatus: RequestHandler = async (request, response, next) => { try { response.json({ data: await service.getMarketStatus(String(request.params.symbol)) }); } catch (error) { next(error); } };
