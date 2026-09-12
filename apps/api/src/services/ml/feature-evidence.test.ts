import { describe, expect, it } from 'vitest';

import {
  buildFeatureEvidence,
  type FeatureEvidence,
} from './feature-evidence';
import type { MarketFeatureRow } from '../market-data/features';

function createFeatures(
  overrides: Partial<MarketFeatureRow> = {},
): MarketFeatureRow {
  return {
    timestamp: '2026-09-12T10:00:00.000Z',
    close: 105,
    volume: 1000,
    return_1: 0.01,
    log_return_1: 0.00995,
    sma_10: 100,
    sma_20: 98,
    price_to_sma_10: 1.05,
    price_to_sma_20: 1.0714,
    volatility_10: 0.01,
    volume_change_1: 0.10,
    rsi_14: 65,
    ...overrides,
  };
}

function findEvidence(
  evidence: FeatureEvidence[],
  feature: string,
): FeatureEvidence {
  const result = evidence.find(
    (item) => item.feature === feature,
  );

  if (!result) {
    throw new Error(`Evidence not found for ${feature}`);
  }

  return result;
}

describe('buildFeatureEvidence', () => {
  it('identifies positive trend and momentum evidence', () => {
    const evidence = buildFeatureEvidence(
      createFeatures(),
    );

    expect(findEvidence(evidence, 'sma_10')).toEqual({
      feature: 'sma_10',
      direction: 'POSITIVE',
      message:
        'Price is above the 10-period moving average.',
      value: 100,
    });

    expect(findEvidence(evidence, 'sma_20')).toEqual({
      feature: 'sma_20',
      direction: 'POSITIVE',
      message:
        'Price is above the 20-period moving average.',
      value: 98,
    });

    expect(findEvidence(evidence, 'return_1')).toEqual({
      feature: 'return_1',
      direction: 'POSITIVE',
      message: 'The most recent return is positive.',
      value: 0.01,
    });

    expect(findEvidence(evidence, 'rsi_14')).toEqual({
      feature: 'rsi_14',
      direction: 'POSITIVE',
      message: 'RSI indicates positive momentum.',
      value: 65,
    });
  });

  it('identifies negative trend and momentum evidence', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        close: 90,
        sma_10: 100,
        sma_20: 105,
        return_1: -0.02,
        rsi_14: 35,
        volume_change_1: -0.10,
      }),
    );

    expect(findEvidence(evidence, 'sma_10').direction).toBe(
      'NEGATIVE',
    );

    expect(findEvidence(evidence, 'sma_20').direction).toBe(
      'NEGATIVE',
    );

    expect(findEvidence(evidence, 'return_1').direction).toBe(
      'NEGATIVE',
    );

    expect(findEvidence(evidence, 'rsi_14').direction).toBe(
      'NEGATIVE',
    );

    expect(
      findEvidence(evidence, 'volume_change_1').direction,
    ).toBe('NEGATIVE');
  });

  it('identifies elevated volatility as adverse evidence', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        volatility_10: 0.05,
      }),
    );

    expect(findEvidence(evidence, 'volatility_10')).toEqual({
      feature: 'volatility_10',
      direction: 'NEGATIVE',
      message: 'Recent market volatility is elevated.',
      value: 0.05,
    });
  });

  it('identifies controlled volatility as neutral evidence', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        volatility_10: 0.01,
      }),
    );

    expect(findEvidence(evidence, 'volatility_10')).toEqual({
      feature: 'volatility_10',
      direction: 'NEUTRAL',
      message:
        'Recent market volatility is relatively controlled.',
      value: 0.01,
    });
  });

  it('identifies neutral RSI', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        rsi_14: 50,
      }),
    );

    expect(findEvidence(evidence, 'rsi_14')).toEqual({
      feature: 'rsi_14',
      direction: 'NEUTRAL',
      message: 'RSI is in a neutral momentum range.',
      value: 50,
    });
  });

  it('identifies stable volume', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        volume_change_1: 0.02,
      }),
    );

    expect(
      findEvidence(evidence, 'volume_change_1'),
    ).toEqual({
      feature: 'volume_change_1',
      direction: 'NEUTRAL',
      message:
        'Trading volume is relatively stable versus the previous period.',
      value: 0.02,
    });
  });

  it('skips unavailable optional features', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        sma_10: null,
        sma_20: null,
        return_1: null,
        volatility_10: null,
        volume_change_1: null,
        rsi_14: null,
      }),
    );

    expect(evidence).toEqual([]);
  });

  it('accepts zero return as neutral', () => {
    const evidence = buildFeatureEvidence(
      createFeatures({
        return_1: 0,
      }),
    );

    expect(findEvidence(evidence, 'return_1')).toEqual({
      feature: 'return_1',
      direction: 'NEUTRAL',
      message: 'The most recent return is flat.',
      value: 0,
    });
  });

  it('accepts RSI boundary values as neutral', () => {
    const lowerEvidence = buildFeatureEvidence(
      createFeatures({
        rsi_14: 45,
      }),
    );

    const upperEvidence = buildFeatureEvidence(
      createFeatures({
        rsi_14: 55,
      }),
    );

    expect(
      findEvidence(lowerEvidence, 'rsi_14').direction,
    ).toBe('NEUTRAL');

    expect(
      findEvidence(upperEvidence, 'rsi_14').direction,
    ).toBe('NEUTRAL');
  });

  it('rejects a non-finite close value', () => {
    expect(() =>
      buildFeatureEvidence(
        createFeatures({
          close: Number.NaN,
        }),
      ),
    ).toThrow('close must be a finite number');
  });

  it('rejects a non-finite RSI value', () => {
    expect(() =>
      buildFeatureEvidence(
        createFeatures({
          rsi_14: Number.POSITIVE_INFINITY,
        }),
      ),
    ).toThrow('rsi_14 must be a finite number');
  });

  it('rejects a non-finite volatility value', () => {
    expect(() =>
      buildFeatureEvidence(
        createFeatures({
          volatility_10: Number.NaN,
        }),
      ),
    ).toThrow(
      'volatility_10 must be a finite number',
    );
  });

  it('does not modify the supplied feature row', () => {
    const features = createFeatures();
    const original = { ...features };

    buildFeatureEvidence(features);

    expect(features).toEqual(original);
  });
});