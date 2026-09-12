import { describe, expect, it } from 'vitest';

import {
  buildRecommendation,
  type Recommendation,
} from './recommendation';
import type { MarketAssessment } from './market-assessment';

function createAssessment(
  overrides: Partial<MarketAssessment> = {},
): MarketAssessment {
  return {
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
    evidence: [],
    ...overrides,
  };
}

describe('buildRecommendation', () => {
  it('returns potential upside for a strong UP signal with low risk', () => {
    const result = buildRecommendation(
      createAssessment(),
    );

    expect(result).toEqual({
      recommendation: 'POTENTIAL_UPSIDE',
      rationale:
        'The model indicates a sufficiently directional upside probability with acceptable risk.',
    });
  });

  it('returns potential downside for a strong DOWN signal with low risk', () => {
    const result = buildRecommendation(
      createAssessment({
        signal: {
          direction: 'DOWN',
          confidence: 'HIGH',
          probability: 0.72,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
    );

    expect(result).toEqual({
      recommendation: 'POTENTIAL_DOWNSIDE',
      rationale:
        'The model indicates a sufficiently directional downside probability with acceptable risk.',
    });
  });

  it('returns WATCH when probability is below the directional threshold', () => {
    const result = buildRecommendation(
      createAssessment({
        signal: {
          direction: 'UP',
          confidence: 'MEDIUM',
          probability: 0.59,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
    );

    expect(result).toEqual({
      recommendation: 'WATCH',
      rationale:
        'Prediction probability is not sufficiently directional.',
    });
  });

  it('accepts exactly the directional probability threshold', () => {
    const result = buildRecommendation(
      createAssessment({
        signal: {
          direction: 'UP',
          confidence: 'MEDIUM',
          probability: 0.60,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
    );

    expect(result.recommendation).toBe(
      'POTENTIAL_UPSIDE',
    );
  });

  it('returns WATCH for HIGH risk even with strong UP probability', () => {
    const result = buildRecommendation(
      createAssessment({
        risk: {
          riskLevel: 'HIGH',
          rationale: 'Market volatility is elevated.',
        },
      }),
    );

    expect(result).toEqual({
      recommendation: 'WATCH',
      rationale:
        'Prediction direction is available, but current risk is high.',
    });
  });

  it('returns WATCH for HIGH risk even with strong DOWN probability', () => {
    const result = buildRecommendation(
      createAssessment({
        signal: {
          direction: 'DOWN',
          confidence: 'HIGH',
          probability: 0.81,
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
      }),
    );

    expect(result.recommendation).toBe('WATCH');
  });

  it('uses probability rather than confidence label for the decision', () => {
    const result = buildRecommendation(
      createAssessment({
        signal: {
          direction: 'UP',
          confidence: 'LOW',
          probability: 0.70,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
    );

    expect(result.recommendation).toBe(
      'POTENTIAL_UPSIDE',
    );
  });

  it('does not use evidence as an independent prediction score', () => {
    const result = buildRecommendation(
      createAssessment({
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
        evidence: [
          {
            feature: 'sma_10',
            direction: 'NEGATIVE',
            message:
              'Price is below the 10-period moving average.',
            value: 110,
          },
          {
            feature: 'rsi_14',
            direction: 'NEGATIVE',
            message:
              'RSI indicates negative momentum.',
            value: 35,
          },
        ],
      }),
    );

    expect(result.recommendation).toBe(
      'POTENTIAL_UPSIDE',
    );
  });

  it('returns only supported recommendation values', () => {
    const assessments: MarketAssessment[] = [
      createAssessment(),
      createAssessment({
        signal: {
          direction: 'DOWN',
          confidence: 'HIGH',
          probability: 0.80,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
      createAssessment({
        signal: {
          direction: 'UP',
          confidence: 'LOW',
          probability: 0.51,
          model: {
            name: 'logistic_regression',
            version: 'v1',
          },
          horizon: 1,
        },
      }),
      createAssessment({
        risk: {
          riskLevel: 'HIGH',
          rationale: 'Market volatility is elevated.',
        },
      }),
    ];

    const validRecommendations: Recommendation[] = [
      'POTENTIAL_UPSIDE',
      'POTENTIAL_DOWNSIDE',
      'WATCH',
      'INSUFFICIENT_DATA',
    ];

    for (const assessment of assessments) {
      const result = buildRecommendation(assessment);

      expect(
        validRecommendations,
      ).toContain(result.recommendation);
    }
  });
});