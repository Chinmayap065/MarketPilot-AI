import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './server.js';

describe('API foundation', () => {
  it('returns API health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('marketpilot-api');
    expect(response.body.status).toBe('ok');
  });

  it('returns canonical assets even when quotes are not configured', async () => {
    const response = await request(app).get('/api/v1/assets/search?q=BTC');
    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThan(0);
    expect(response.body.data[0].symbol).toContain('BTC');
  });

  it('reports unavailable optional dependencies without failing the API', async () => {
    const response = await request(app).get('/api/health/detailed');
    expect(response.status).toBe(200);
    expect(response.body.services.api).toBe('up');
    expect(response.body.status).toBe('degraded');
  });

  it('returns a structured error for malformed JSON', async () => {
    const response = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(response.body.error.message).not.toContain('SyntaxError');
  });

  it('returns a structured error for an unknown route', async () => {
    const response = await request(app).get('/missing-route');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns a structured error for an invalid search query', async () => {
    const response = await request(app).get(`/api/v1/assets/search?q=${'x'.repeat(101)}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });
});
