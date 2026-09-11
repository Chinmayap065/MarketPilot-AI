import type { TrainingDatasetRow } from '../market-data/dataset';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateTrainingDataset } from './ml-service';

const originalFetch = globalThis.fetch;

const makeTrainingRow = (
  timestamp: string,
  futureTimestamp: string,
  target: 0 | 1,
): TrainingDatasetRow => ({
  timestamp,
  futureTimestamp,
  features: {
    close: 100,
    volume: 1000,
    return_1: 0.01,
    log_return_1: 0.00995,
    sma_10: 99,
    sma_20: 98,
    price_to_sma_10: 1.0101,
    price_to_sma_20: 1.0204,
    volatility_10: 0.02,
    volume_change_1: 0.05,
    rsi_14: 55,
  },
  target,
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('validateTrainingDataset', () => {
  it('rejects an empty training dataset before making a request', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(validateTrainingDataset([])).rejects.toThrow(
      'training dataset cannot be empty',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the training dataset to the ML service and validates the response', async () => {
    const rows = [
      makeTrainingRow(
        '2026-01-01T09:15:00+00:00',
        '2026-01-01T09:30:00+00:00',
        1,
      ),
      makeTrainingRow(
        '2026-01-01T09:30:00+00:00',
        '2026-01-01T09:45:00+00:00',
        0,
      ),
    ];

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          rowCount: 2,
          featureCount: 11,
          featureNames: [
            'close',
            'volume',
            'return_1',
            'log_return_1',
            'sma_10',
            'sma_20',
            'price_to_sma_10',
            'price_to_sma_20',
            'volatility_10',
            'volume_change_1',
            'rsi_14',
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    globalThis.fetch = fetchMock;

    const result = await validateTrainingDataset(rows);

    expect(result).toEqual({
      valid: true,
      rowCount: 2,
      featureCount: 11,
      featureNames: [
        'close',
        'volume',
        'return_1',
        'log_return_1',
        'sma_10',
        'sma_20',
        'price_to_sma_10',
        'price_to_sma_20',
        'volatility_10',
        'volume_change_1',
        'rsi_14',
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe(
      'http://localhost:8000/api/v1/datasets/validate',
    );

    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(JSON.parse(options.body as string)).toEqual({
      rows,
    });
  });

  it('returns the ML service validation error for a rejected dataset', async () => {
    const rows = [
      makeTrainingRow(
        '2026-01-01T09:15:00+00:00',
        '2026-01-01T09:30:00+00:00',
        1,
      ),
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail:
            'dataset timestamps must be strictly chronological with no duplicates',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(validateTrainingDataset(rows)).rejects.toThrow(
      'dataset timestamps must be strictly chronological with no duplicates',
    );
  });

  it('rejects an invalid successful response from the ML service', async () => {
    const rows = [
      makeTrainingRow(
        '2026-01-01T09:15:00+00:00',
        '2026-01-01T09:30:00+00:00',
        1,
      ),
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          rowCount: 'one',
          featureCount: 11,
          featureNames: [],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(validateTrainingDataset(rows)).rejects.toThrow(
      'ML service returned an invalid validation response',
    );
  });
});