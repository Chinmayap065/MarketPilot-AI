import { Router } from 'express';
import { getDetailedHealth, getHealth } from '../controllers/health.controller.js';

export const healthRouter = Router();
healthRouter.get('/', getHealth);
healthRouter.get('/detailed', getDetailedHealth);
