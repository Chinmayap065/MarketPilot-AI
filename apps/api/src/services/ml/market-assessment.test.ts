import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assessMarket,
} from './market-assessment';
import {
  predictSignalWithRisk,
} from './prediction-risk-service';
import {
  buildFeatureEvidence,
} from './feature-evidence';

vi.mock('./prediction-risk-service', () => ({
  predictSignalWithRisk: vi.fn(),
}));

vi.mock('./feature-evidence', () => ({
  buildFeatureEvidence: vi.fn(),
}));

const mockedPredictSignalWithRisk =
  vi.mocked(predictSignalWithRisk);

const mockedBuildFeatureEvidence =
  vi.mocked(buildFeatureEvidence);

beforeEach(() => {
  vi.clearAllMocks();
});

const marketFeatures = {
  timestamp: '2026-09-12T10:00:00.000Z',
  close: 105,
  volume: 1000,
  return_1: 0.01,
  log_return_1: 0.00995,
  sma_10: 100,
  sma_20: 98,
  price_to_sma_10: 1.05,
  price_to_sma_20: 1.0714,
  volatility_10: 0.03,
  volume_change_1: 0.10,
  rsi_14: 65,
};

describe('assessMarket', () => {
  it('combines prediction, risk, and feature evidence', async () => {
    mockedPredictSignalWithRisk.mockResolvedValue({
      signal: {
        direction: 'UP',
        confidence: 'HIGH',
        probability: 0.72,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'MEDIUM',
        rationale: 'market volatility is elevated.',
      },
    });

    mockedBuildFeatureEvidence.mockReturnValue([
      {
        feature: 'sma_10',
        direction: 'POSITIVE',
        message:
          'Price is above the 10-period moving average.',
        value: 100,
      },
      {
        feature: 'volatility_10',
        direction: 'NEGATIVE',
        message: 'Recent market volatility is elevated.',
        value: 0.03,
      },
    ]);

    const result = await assessMarket({
      artifactPath: 'artifacts/model.joblib',
      modelFeatures: [105, 1000, 0.01],
      volatility: 0.03,
      dataStatus: 'LIVE',
      features: marketFeatures,
    });

    expect(result).toEqual({
      signal: {
        direction: 'UP',
        confidence: 'HIGH',
        probability: 0.72,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'MEDIUM',
        rationale: 'market volatility is elevated.',
      },
      evidence: [
        {
          feature: 'sma_10',
          direction: 'POSITIVE',
          message:
            'Price is above the 10-period moving average.',
          value: 100,
        },
        {
          feature: 'volatility_10',
          direction: 'NEGATIVE',
          message: 'Recent market volatility is elevated.',
          value: 0.03,
        },
      ],
    });
  });

  it('passes only model features to prediction-risk orchestration', async () => {
    mockedPredictSignalWithRisk.mockResolvedValue({
      signal: {
        direction: 'DOWN',
        confidence: 'MEDIUM',
        probability: 0.41,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'MEDIUM',
        rationale:
          'prediction probability is relatively low.',
      },
    });

    mockedBuildFeatureEvidence.mockReturnValue([]);

    await assessMarket({
      artifactPath: 'artifacts/model.joblib',
      modelFeatures: [120, 900, -0.02],
      volatility: 0.01,
      dataStatus: 'LIVE',
      features: marketFeatures,
    });

    expect(
      mockedPredictSignalWithRisk,
    ).toHaveBeenCalledWith({
      artifactPath: 'artifacts/model.joblib',
      features: [120, 900, -0.02],
      volatility: 0.01,
      dataStatus: 'LIVE',
    });
  });

  it('passes the complete market feature row to the evidence engine', async () => {
    mockedPredictSignalWithRisk.mockResolvedValue({
      signal: {
        direction: 'UP',
        confidence: 'HIGH',
        probability: 0.81,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'LOW',
        rationale:
          'Market volatility is controlled and prediction probability is sufficiently directional.',
      },
    });

    mockedBuildFeatureEvidence.mockReturnValue([]);

    await assessMarket({
      artifactPath: 'artifacts/model.joblib',
      modelFeatures: [105, 1000, 0.01],
      volatility: 0.01,
      dataStatus: 'LIVE',
      features: marketFeatures,
    });

    expect(
      mockedBuildFeatureEvidence,
    ).toHaveBeenCalledWith(marketFeatures);
  });

  it('supports a DOWN signal with HIGH risk', async () => {
    mockedPredictSignalWithRisk.mockResolvedValue({
      signal: {
        direction: 'DOWN',
        confidence: 'HIGH',
        probability: 0.18,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'HIGH',
        rationale: 'Market data is stale or unavailable.',
      },
    });

    mockedBuildFeatureEvidence.mockReturnValue([
      {
        feature: 'sma_20',
        direction: 'NEGATIVE',
        message:
          'Price is below the 20-period moving average.',
        value: 110,
      },
    ]);

    const result = await assessMarket({
      artifactPath: 'artifacts/model.joblib',
      modelFeatures: [90, 800, -0.02],
      volatility: 0.04,
      dataStatus: 'STALE',
      features: marketFeatures,
    });

    expect(result.signal.direction).toBe('DOWN');
    expect(result.signal.probability).toBe(0.18);
    expect(result.risk.riskLevel).toBe('HIGH');
    expect(result.evidence).toHaveLength(1);
  });

  it('propagates prediction-risk errors', async () => {
    mockedPredictSignalWithRisk.mockRejectedValue(
      new Error('prediction service unavailable'),
    );

    await expect(
      assessMarket({
        artifactPath: 'artifacts/model.joblib',
        modelFeatures: [105, 1000, 0.01],
        volatility: 0.02,
        dataStatus: 'LIVE',
        features: marketFeatures,
      }),
    ).rejects.toThrow(
      'prediction service unavailable',
    );

    expect(
      mockedBuildFeatureEvidence,
    ).not.toHaveBeenCalled();
  });

  it('does not mutate the supplied market features', async () => {
    mockedPredictSignalWithRisk.mockResolvedValue({
      signal: {
        direction: 'UP',
        confidence: 'HIGH',
        probability: 0.72,
        model: {
          name: 'logistic_regression',
          version: 'v1',
        },
        horizon: 1,
      },
      risk: {
        riskLevel: 'LOW',
        rationale:
          'Market volatility is controlled and prediction probability is sufficiently directional.',
      },
    });

    mockedBuildFeatureEvidence.mockReturnValue([]);

    const original = { ...marketFeatures };

    await assessMarket({
      artifactPath: 'artifacts/model.joblib',
      modelFeatures: [105, 1000, 0.01],
      volatility: 0.01,
      dataStatus: 'LIVE',
      features: marketFeatures,
    });

    expect(marketFeatures).toEqual(original);
  });
});