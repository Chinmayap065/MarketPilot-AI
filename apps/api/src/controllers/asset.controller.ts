import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AssetService } from '../services/asset.service.js';

const assetService = new AssetService();
const querySchema = z.object({ q: z.string().trim().max(100).default('') });

export const searchAssets: RequestHandler = (request, response, next) => {
  try {
    const { q } = querySchema.parse(request.query);
    response.json(assetService.search(q));
  } catch (error) {
    next(error);
  }
};
