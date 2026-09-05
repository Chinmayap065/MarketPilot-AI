import type { RequestHandler } from 'express';
import { DependencyHealthService } from '../services/dependency-health.service.js';

const dependencies = new DependencyHealthService();

export const getHealth: RequestHandler = (_request, response) => {
  response.json({ status: 'ok', service: 'marketpilot-api', timestamp: new Date().toISOString() });
};

export const getDetailedHealth: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await dependencies.getDetailedHealth());
  } catch (error) {
    next(error);
  }
};
