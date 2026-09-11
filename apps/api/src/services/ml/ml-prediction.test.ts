import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ModelPredictionRequest } from './ml-service';
import { predictModel } from './ml-service';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const makePredictionRequest = (): ModelPredictionRequest => ({
  artifactPath:
    'models/logistic_regression_v1.joblib',
  features: [
    100,
    1000,
    0.01,
    0.00995,
    99,
    98,
    1.0101,
    1.0204,
    0.02,
    0.05,
    55,
  ],
});

describe('predictModel', () => {
  it('rejects an empty artifact path before making a request', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(
      predictModel({
        artifactPath: '',
        features: [100],
      }),
    ).rejects.toThrow(
      'artifact path cannot be empty',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects empty features before making a request', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(
      predictModel({
        artifactPath:
          'models/logistic_regression_v1.joblib',
        features: [],
      }),
    ).rejects.toThrow(
      'prediction features cannot be empty',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends prediction request to the ML service', async () => {
    const request = makePredictionRequest();

    const predictionResponse = {
      predictedClass: 1,
      probability: 0.72,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(predictionResponse),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    globalThis.fetch = fetchMock;

    const result = await predictModel(request);

    expect(result).toEqual(
      predictionResponse,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      'http://localhost:8000/api/v1/models/predict',
    );

    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(
      JSON.parse(options.body as string),
    ).toEqual({
      artifactPath:
        'models/logistic_regression_v1.joblib',
      features: request.features,
    });
  });

  it('returns the ML service prediction error', async () => {
    const request = makePredictionRequest();

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail:
              'prediction feature count does not match artifact feature schema',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    await expect(
      predictModel(request),
    ).rejects.toThrow(
      'prediction feature count does not match artifact feature schema',
    );
  });

  it('rejects an invalid successful prediction response', async () => {
    const request = makePredictionRequest();

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            predictedClass: 1,
            probability: '0.72',
            model: {
              name: 'logistic_regression',
              version: 'v1',
            },
            horizon: 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    await expect(
      predictModel(request),
    ).rejects.toThrow(
      'ML service returned an invalid prediction response',
    );
  });

  it('rejects a probability outside the valid range', async () => {
    const request = makePredictionRequest();

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            predictedClass: 1,
            probability: 1.5,
            model: {
              name: 'logistic_regression',
              version: 'v1',
            },
            horizon: 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    await expect(
      predictModel(request),
    ).rejects.toThrow(
      'ML service returned an invalid prediction response',
    );
  });

  it('accepts a valid down prediction', async () => {
    const request = makePredictionRequest();

    const predictionResponse = {
      predictedClass: 0,
      probability: 0.31,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    };

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify(predictionResponse),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const result = await predictModel(request);

    expect(result).toEqual(
      predictionResponse,
    );
    expect(result.predictedClass).toBe(0);
    expect(result.probability).toBe(0.31);
  });
});