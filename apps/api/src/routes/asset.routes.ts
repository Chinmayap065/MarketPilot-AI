import { Router } from 'express';
import { searchAssets } from '../controllers/asset.controller.js';

export const assetRouter = Router();
assetRouter.get('/search', searchAssets);
