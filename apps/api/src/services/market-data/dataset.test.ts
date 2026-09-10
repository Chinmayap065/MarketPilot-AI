import { describe, expect, it } from 'vitest';
import type { MarketFeatureRow } from './features.js';
import type { PredictionTargetRow } from './target.js';
import { buildTrainingDataset } from './dataset.js';

function createFeature(
  timestamp: string,
  overrides: Partial<MarketFeatureRow> = {},
): MarketFeatureRow {
  return {
    timestamp,
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
    ...overrides,
  };
}

function createTarget(
  timestamp: string,
  target: 0 | 1,
  futureTimestamp: string,
): PredictionTargetRow {
  return {
    timestamp,
    futureTimestamp,
    currentClose: 100,
    futureClose: target === 1 ? 105 : 95,
    target,
  };
}

describe('buildTrainingDataset', () => {
  it('returns an empty array when there are no features', () => {
    expect(
      buildTrainingDataset([], [
        createTarget(
          '2026-01-01T00:00:00.000Z',
          1,
          '2026-01-02T00:00:00.000Z',
        ),
      ]),
    ).toEqual([]);
  });

  it('returns an empty array when there are no targets', () => {
    expect(
      buildTrainingDataset(
        [createFeature('2026-01-01T00:00:00.000Z')],
        [],
      ),
    ).toEqual([]);
  });

  it('joins features and targets using timestamps', () => {
    const features = [
      createFeature('2026-01-01T00:00:00.000Z'),
      createFeature('2026-01-02T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-01T00:00:00.000Z',
        1,
        '2026-01-02T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-02T00:00:00.000Z',
        0,
        '2026-01-03T00:00:00.000Z',
      ),
    ];

    const result = buildTrainingDataset(features, targets);

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(result[0].target).toBe(1);
    expect(result[0].futureTimestamp).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('does not rely on array position when joining', () => {
    const features = [
      createFeature('2026-01-02T00:00:00.000Z'),
      createFeature('2026-01-01T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-01T00:00:00.000Z',
        1,
        '2026-01-02T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-02T00:00:00.000Z',
        0,
        '2026-01-03T00:00:00.000Z',
      ),
    ];

    const result = buildTrainingDataset(features, targets);

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(result[0].target).toBe(1);
    expect(result[1].target).toBe(0);
  });

  it('excludes feature rows containing null values', () => {
    const features = [
      createFeature('2026-01-01T00:00:00.000Z', {
        rsi_14: null,
      }),
      createFeature('2026-01-02T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-01T00:00:00.000Z',
        1,
        '2026-01-02T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-02T00:00:00.000Z',
        0,
        '2026-01-03T00:00:00.000Z',
      ),
    ];

    const result = buildTrainingDataset(features, targets);

    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('keeps volume optional when it is unavailable', () => {
    const feature = createFeature(
      '2026-01-01T00:00:00.000Z',
      {
        volume: undefined,
      },
    );

    const target = createTarget(
      '2026-01-01T00:00:00.000Z',
      1,
      '2026-01-02T00:00:00.000Z',
    );

    const result = buildTrainingDataset(
      [feature],
      [target],
    );

    expect(result).toHaveLength(1);
    expect(result[0].features.volume).toBeUndefined();
  });

  it('excludes features that have no matching target', () => {
    const features = [
      createFeature('2026-01-01T00:00:00.000Z'),
      createFeature('2026-01-02T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-02T00:00:00.000Z',
        1,
        '2026-01-03T00:00:00.000Z',
      ),
    ];

    const result = buildTrainingDataset(features, targets);

    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('returns the dataset in chronological order', () => {
    const features = [
      createFeature('2026-01-03T00:00:00.000Z'),
      createFeature('2026-01-01T00:00:00.000Z'),
      createFeature('2026-01-02T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-03T00:00:00.000Z',
        1,
        '2026-01-04T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-01T00:00:00.000Z',
        0,
        '2026-01-02T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-02T00:00:00.000Z',
        1,
        '2026-01-03T00:00:00.000Z',
      ),
    ];

    const result = buildTrainingDataset(features, targets);

    expect(result.map((row) => row.timestamp)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
      '2026-01-03T00:00:00.000Z',
    ]);
  });

  it('preserves the target future timestamp', () => {
    const result = buildTrainingDataset(
      [createFeature('2026-01-01T00:00:00.000Z')],
      [
        createTarget(
          '2026-01-01T00:00:00.000Z',
          1,
          '2026-01-02T00:00:00.000Z',
        ),
      ],
    );

    expect(result[0].futureTimestamp).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('does not mutate the input arrays', () => {
    const features = [
      createFeature('2026-01-02T00:00:00.000Z'),
      createFeature('2026-01-01T00:00:00.000Z'),
    ];

    const targets = [
      createTarget(
        '2026-01-02T00:00:00.000Z',
        1,
        '2026-01-03T00:00:00.000Z',
      ),
      createTarget(
        '2026-01-01T00:00:00.000Z',
        0,
        '2026-01-02T00:00:00.000Z',
      ),
    ];

    const originalFeatureOrder = features.map(
      (feature) => feature.timestamp,
    );
    const originalTargetOrder = targets.map(
      (target) => target.timestamp,
    );

    buildTrainingDataset(features, targets);

    expect(features.map((feature) => feature.timestamp)).toEqual(
      originalFeatureOrder,
    );

    expect(targets.map((target) => target.timestamp)).toEqual(
      originalTargetOrder,
    );
  });
});