import { beforeEach, describe, expect, it, vi } from 'vitest';

import { predictSignalWithRisk } from './prediction-risk-service';
import { predictSignal } from './prediction-service';
import { assessRisk } from './risk-engine';

vi.mock('./prediction-service', () => ({
  predictSignal: vi.fn(),
}));

vi.mock('./risk-engine', () => ({
  assessRisk: vi.fn(),
}));

const mockedPredictSignal = vi.mocked(predictSignal);
const mockedAssessRisk = vi.mocked(assessRisk);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('predictSignalWithRisk', () => {
  it('combines the prediction signal and risk assessment', async () => {
    mockedPredictSignal.mockResolvedValue({
      direction: 'UP',
      confidence: 'HIGH',
      probability: 0.72,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    mockedAssessRisk.mockReturnValue({
      riskLevel: 'MEDIUM',
      rationale: 'market volatility is elevated.',
    });

    const result = await predictSignalWithRisk({
      artifactPath: 'artifacts/model.joblib',
      features: [100, 1000, 0.01],
      volatility: 0.03,
      dataStatus: 'LIVE',
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
    });
  });

  it('forwards only prediction inputs to the prediction service', async () => {
    mockedPredictSignal.mockResolvedValue({
      direction: 'DOWN',
      confidence: 'MEDIUM',
      probability: 0.41,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    mockedAssessRisk.mockReturnValue({
      riskLevel: 'MEDIUM',
      rationale: 'prediction probability is relatively low.',
    });

    await predictSignalWithRisk({
      artifactPath: 'artifacts/model.joblib',
      features: [120, 900, -0.02],
      volatility: 0.01,
      dataStatus: 'LIVE',
    });

    expect(mockedPredictSignal).toHaveBeenCalledWith({
      artifactPath: 'artifacts/model.joblib',
      features: [120, 900, -0.02],
    });
  });

  it('passes prediction probability and risk context to the risk engine', async () => {
    mockedPredictSignal.mockResolvedValue({
      direction: 'UP',
      confidence: 'HIGH',
      probability: 0.81,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    mockedAssessRisk.mockReturnValue({
      riskLevel: 'HIGH',
      rationale: 'Market volatility is elevated.',
    });

    await predictSignalWithRisk({
      artifactPath: 'artifacts/model.joblib',
      features: [150, 2000, 0.03],
      volatility: 0.07,
      dataStatus: 'LIVE',
    });

    expect(mockedAssessRisk).toHaveBeenCalledWith({
      probability: 0.81,
      volatility: 0.07,
      dataStatus: 'LIVE',
    });
  });

  it('supports a DOWN prediction with low risk', async () => {
    mockedPredictSignal.mockResolvedValue({
      direction: 'DOWN',
      confidence: 'HIGH',
      probability: 0.19,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    mockedAssessRisk.mockReturnValue({
      riskLevel: 'LOW',
      rationale:
        'Market volatility is controlled and prediction probability is sufficiently directional.',
    });

    const result = await predictSignalWithRisk({
      artifactPath: 'artifacts/model.joblib',
      features: [90, 800, -0.01],
      volatility: 0.01,
      dataStatus: 'LIVE',
    });

    expect(result.signal.direction).toBe('DOWN');
    expect(result.signal.probability).toBe(0.19);
    expect(result.risk.riskLevel).toBe('LOW');
  });

  it('propagates prediction service errors', async () => {
    mockedPredictSignal.mockRejectedValue(
      new Error('ML prediction service unavailable'),
    );

    await expect(
      predictSignalWithRisk({
        artifactPath: 'artifacts/model.joblib',
        features: [100, 1000, 0.01],
        volatility: 0.02,
        dataStatus: 'LIVE',
      }),
    ).rejects.toThrow('ML prediction service unavailable');

    expect(mockedAssessRisk).not.toHaveBeenCalled();
  });

  it('does not call the risk engine when prediction fails', async () => {
    mockedPredictSignal.mockRejectedValue(
      new Error('prediction failed'),
    );

    await expect(
      predictSignalWithRisk({
        artifactPath: 'artifacts/model.joblib',
        features: [100, 1000, 0.01],
        volatility: 0.02,
        dataStatus: 'LIVE',
      }),
    ).rejects.toThrow('prediction failed');

    expect(mockedAssessRisk).not.toHaveBeenCalled();
  });
});