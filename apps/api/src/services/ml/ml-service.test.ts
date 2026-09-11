import type { TrainingDatasetRow } from '../market-data/dataset';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  trainModel,
  validateTrainingDataset,
} from './ml-service';

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

const makeTrainingRows = (
  count = 20,
): TrainingDatasetRow[] =>
  Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const nextDay = day + 1;

    return makeTrainingRow(
      `2026-01-${day
        .toString()
        .padStart(2, '0')}T09:15:00+00:00`,
      `2026-01-${nextDay
        .toString()
        .padStart(2, '0')}T09:15:00+00:00`,
      index % 2 === 0 ? 1 : 0,
    );
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

    const result =
      await validateTrainingDataset(rows);

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

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      'http://localhost:8000/api/v1/datasets/validate',
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

    globalThis.fetch =
      vi.fn().mockResolvedValue(
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

    await expect(
      validateTrainingDataset(rows),
    ).rejects.toThrow(
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

    globalThis.fetch =
      vi.fn().mockResolvedValue(
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

    await expect(
      validateTrainingDataset(rows),
    ).rejects.toThrow(
      'ML service returned an invalid validation response',
    );
  });
});

describe('trainModel', () => {
  it('rejects an empty training dataset before making a request', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(trainModel([])).rejects.toThrow(
      'training dataset cannot be empty',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the dataset and training options to the ML service', async () => {
    const rows = makeTrainingRows();

    const trainingResponse = {
      trained: true,
      model: {
        name: 'logistic_regression',
      },
      horizon: 2,
      split: {
        trainRows: 13,
        validationRows: 2,
        testRows: 2,
      },
      validation: {
        accuracy: 0.75,
        precision: 0.8,
        recall: 0.6666666667,
        f1: 0.7272727273,
        logLoss: 0.61,
      },
      test: {
        accuracy: 0.5,
        precision: 0.5,
        recall: 1,
        f1: 0.6666666667,
        logLoss: 0.72,
      },
      baseline: {
        validation: {
          metrics: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 1,
            f1: 0.6666666667,
            logLoss: 17.269388197455342,
          },
          predictedClass: 1,
          predictedClassProbability: 0.5,
        },
        test: {
          metrics: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 1,
            f1: 0.6666666667,
            logLoss: 17.269388197455342,
          },
          predictedClass: 1,
          predictedClassProbability: 0.5,
        },
      },
      trainedAt:
        '2026-09-11T12:00:00.000Z',
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(trainingResponse),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    globalThis.fetch = fetchMock;

    const result = await trainModel(
      rows,
      {
        horizon: 2,
        trainRatio: 0.65,
        validationRatio: 0.15,
      },
    );

    expect(result).toEqual(
      trainingResponse,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      'http://localhost:8000/api/v1/models/train',
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
      rows,
      horizon: 2,
      trainRatio: 0.65,
      validationRatio: 0.15,
      runWalkForward: false,
      walkForwardInitialTrainSize: 20,
      walkForwardTestSize: 5,
      walkForwardStepSize: 5,
    });
  });

  it('uses default training options when none are provided', async () => {
    const rows = makeTrainingRows();

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          trained: true,
          model: {
            name: 'logistic_regression',
          },
          horizon: 1,
          split: {
            trainRows: 14,
            validationRows: 2,
            testRows: 2,
          },
          validation: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 1,
            f1: 0.6666666667,
            logLoss: 0.69,
          },
          test: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 1,
            f1: 0.6666666667,
            logLoss: 0.69,
          },
          baseline: {
            validation: {
              metrics: {
                accuracy: 0.5,
                precision: 0.5,
                recall: 1,
                f1: 0.6666666667,
                logLoss: 17.269388197455342,
              },
              predictedClass: 1,
              predictedClassProbability: 0.5,
            },
            test: {
              metrics: {
                accuracy: 0.5,
                precision: 0.5,
                recall: 1,
                f1: 0.6666666667,
                logLoss: 17.269388197455342,
              },
              predictedClass: 1,
              predictedClassProbability: 0.5,
            },
          },
          trainedAt:
            '2026-09-11T12:00:00.000Z',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await trainModel(rows);

    const [, options] =
      (
        globalThis.fetch as ReturnType<
          typeof vi.fn
        >
      ).mock.calls[0];

    expect(
      JSON.parse(options.body as string),
    ).toEqual({
      rows,
      horizon: 1,
      trainRatio: 0.70,
      validationRatio: 0.15,
      runWalkForward: false,
      walkForwardInitialTrainSize: 20,
      walkForwardTestSize: 5,
      walkForwardStepSize: 5,
    });
  });

  it('sends walk-forward training options when requested', async () => {
    const rows = makeTrainingRows(30);

    const trainingResponse = {
      trained: true,
      model: {
        name: 'logistic_regression',
      },
      horizon: 1,
      split: {
        trainRows: 21,
        validationRows: 3,
        testRows: 3,
      },
      validation: {
        accuracy: 0.6,
        precision: 0.6,
        recall: 0.6,
        f1: 0.6,
        logLoss: 0.68,
      },
      test: {
        accuracy: 0.6,
        precision: 0.6,
        recall: 0.6,
        f1: 0.6,
        logLoss: 0.68,
      },
      baseline: {
        validation: {
          metrics: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 0.5,
            f1: 0.5,
            logLoss: 0.69,
          },
          predictedClass: 1,
          predictedClassProbability: 0.5,
        },
        test: {
          metrics: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 0.5,
            f1: 0.5,
            logLoss: 0.69,
          },
          predictedClass: 1,
          predictedClassProbability: 0.5,
        },
      },
      walkForward: {
        metrics: {
          accuracy: 0.6,
          precision: 0.6,
          recall: 0.6,
          f1: 0.6,
          logLoss: 0.68,
        },
        baseline: {
          metrics: {
            accuracy: 0.5,
            precision: 0.5,
            recall: 0.5,
            f1: 0.5,
            logLoss: 0.69,
          },
          predictedClass: 1,
          predictedClassProbability: 0.5,
        },
        windowCount: 1,
        windows: [
          {
            trainStart: 0,
            trainEnd: 20,
            testStart: 21,
            testEnd: 26,
          },
        ],
        predictionCount: 5,
      },
      trainedAt:
        '2026-09-11T12:00:00.000Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(trainingResponse),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const result = await trainModel(
      rows,
      {
        horizon: 1,
        runWalkForward: true,
        walkForwardInitialTrainSize: 20,
        walkForwardTestSize: 5,
        walkForwardStepSize: 5,
      },
    );

    expect(result.walkForward).toEqual(
      trainingResponse.walkForward,
    );

    const [, options] =
      (
        globalThis.fetch as ReturnType<
          typeof vi.fn
        >
      ).mock.calls[0];

    expect(
      JSON.parse(options.body as string),
    ).toEqual({
      rows,
      horizon: 1,
      trainRatio: 0.70,
      validationRatio: 0.15,
      runWalkForward: true,
      walkForwardInitialTrainSize: 20,
      walkForwardTestSize: 5,
      walkForwardStepSize: 5,
    });
  });

  it('returns the ML service training error', async () => {
    const rows = makeTrainingRows();

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail:
              'training dataset must contain both classes',
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
      trainModel(rows),
    ).rejects.toThrow(
      'training dataset must contain both classes',
    );
  });

  it('rejects an invalid successful training response', async () => {
    const rows = makeTrainingRows();

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            trained: true,
            model: {
              name: 'logistic_regression',
            },
            horizon: 1,
            split: {
              trainRows: 'fourteen',
              validationRows: 2,
              testRows: 2,
            },
            validation: {
              accuracy: 0.5,
              precision: 0.5,
              recall: 1,
              f1: 0.6666666667,
              logLoss: 0.69,
            },
            test: {
              accuracy: 0.5,
              precision: 0.5,
              recall: 1,
              f1: 0.6666666667,
              logLoss: 0.69,
            },
            baseline: {
              validation: {
                metrics: {
                  accuracy: 0.5,
                  precision: 0.5,
                  recall: 1,
                  f1: 0.6666666667,
                  logLoss: 0.69,
                },
                predictedClass: 1,
                predictedClassProbability: 0.5,
              },
              test: {
                metrics: {
                  accuracy: 0.5,
                  precision: 0.5,
                  recall: 1,
                  f1: 0.6666666667,
                  logLoss: 0.69,
                },
                predictedClass: 1,
                predictedClassProbability: 0.5,
              },
            },
            trainedAt:
              '2026-09-11T12:00:00.000Z',
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
      trainModel(rows),
    ).rejects.toThrow(
      'ML service returned an invalid training response',
    );
  });

  it('rejects an invalid walk-forward response', async () => {
    const rows = makeTrainingRows(30);

    globalThis.fetch =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            trained: true,
            model: {
              name: 'logistic_regression',
            },
            horizon: 1,
            split: {
              trainRows: 21,
              validationRows: 3,
              testRows: 3,
            },
            validation: {
              accuracy: 0.5,
              precision: 0.5,
              recall: 0.5,
              f1: 0.5,
              logLoss: 0.69,
            },
            test: {
              accuracy: 0.5,
              precision: 0.5,
              recall: 0.5,
              f1: 0.5,
              logLoss: 0.69,
            },
            baseline: {
              validation: {
                metrics: {
                  accuracy: 0.5,
                  precision: 0.5,
                  recall: 0.5,
                  f1: 0.5,
                  logLoss: 0.69,
                },
                predictedClass: 1,
                predictedClassProbability: 0.5,
              },
              test: {
                metrics: {
                  accuracy: 0.5,
                  precision: 0.5,
                  recall: 0.5,
                  f1: 0.5,
                  logLoss: 0.69,
                },
                predictedClass: 1,
                predictedClassProbability: 0.5,
              },
            },
            walkForward: {
              metrics: {
                accuracy: 0.6,
                precision: 0.6,
                recall: 0.6,
                f1: 0.6,
                logLoss: 0.68,
              },
              baseline: {
                metrics: {
                  accuracy: 0.5,
                  precision: 0.5,
                  recall: 0.5,
                  f1: 0.5,
                  logLoss: 0.69,
                },
                predictedClass: 1,
                predictedClassProbability: 0.5,
              },
              windowCount: 1,
              windows: [
                {
                  trainStart: 'zero',
                  trainEnd: 20,
                  testStart: 21,
                  testEnd: 26,
                },
              ],
              predictionCount: 5,
            },
            trainedAt:
              '2026-09-11T12:00:00.000Z',
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
      trainModel(rows),
    ).rejects.toThrow(
      'ML service returned an invalid training response',
    );
  });
});