import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  assessRisk,
  type RiskAssessmentInput,
} from './risk-engine';

describe('assessRisk', () => {
  it('returns LOW risk for controlled volatility and strong probability', () => {
    expect(
      assessRisk({
        probability: 0.72,
        volatility: 0.01,
        dataStatus: 'LIVE',
      }),
    ).toEqual({
      riskLevel: 'LOW',
      rationale:
        'Market volatility is controlled and prediction probability is sufficiently directional.',
    });
  });

  it('returns MEDIUM risk for moderate volatility', () => {
    expect(
      assessRisk({
        probability: 0.72,
        volatility: 0.03,
        dataStatus: 'LIVE',
      }),
    ).toEqual({
      riskLevel: 'MEDIUM',
      rationale:
        'market volatility is elevated.',
    });
  });

  it('returns MEDIUM risk for lower prediction probability', () => {
    expect(
      assessRisk({
        probability: 0.55,
        volatility: 0.01,
        dataStatus: 'LIVE',
      }),
    ).toEqual({
      riskLevel: 'MEDIUM',
      rationale:
        'prediction probability is relatively low.',
    });
  });

  it('returns MEDIUM risk when both volatility and probability contribute', () => {
    expect(
      assessRisk({
        probability: 0.55,
        volatility: 0.03,
        dataStatus: 'LIVE',
      }),
    ).toEqual({
      riskLevel: 'MEDIUM',
      rationale:
        'market volatility is elevated and prediction probability is relatively low.',
    });
  });

  it('returns HIGH risk for high volatility', () => {
    expect(
      assessRisk({
        probability: 0.80,
        volatility: 0.05,
        dataStatus: 'LIVE',
      }),
    ).toEqual({
      riskLevel: 'HIGH',
      rationale:
        'Market volatility is elevated.',
    });
  });

  it('returns HIGH risk for stale data', () => {
    expect(
      assessRisk({
        probability: 0.80,
        volatility: 0.01,
        dataStatus: 'STALE',
      }),
    ).toEqual({
      riskLevel: 'HIGH',
      rationale:
        'Market data is stale or unavailable.',
    });
  });

  it('returns HIGH risk for unavailable data', () => {
    expect(
      assessRisk({
        probability: 0.80,
        volatility: 0.01,
        dataStatus: 'UNAVAILABLE',
      }),
    ).toEqual({
      riskLevel: 'HIGH',
      rationale:
        'Market data is stale or unavailable.',
    });
  });

  it('allows delayed data when other risk conditions are low', () => {
    expect(
      assessRisk({
        probability: 0.75,
        volatility: 0.01,
        dataStatus: 'DELAYED',
      }),
    ).toEqual({
      riskLevel: 'LOW',
      rationale:
        'Market volatility is controlled and prediction probability is sufficiently directional.',
    });
  });

  it('rejects probability below zero', () => {
    expect(() =>
      assessRisk({
        probability: -0.01,
        volatility: 0.01,
        dataStatus: 'LIVE',
      }),
    ).toThrow(
      'risk probability must be between 0 and 1',
    );
  });

  it('rejects probability above one', () => {
    expect(() =>
      assessRisk({
        probability: 1.01,
        volatility: 0.01,
        dataStatus: 'LIVE',
      }),
    ).toThrow(
      'risk probability must be between 0 and 1',
    );
  });

  it('rejects negative volatility', () => {
    expect(() =>
      assessRisk({
        probability: 0.72,
        volatility: -0.01,
        dataStatus: 'LIVE',
      }),
    ).toThrow(
      'risk volatility must be a non-negative finite number',
    );
  });

  it('rejects non-finite volatility', () => {
    expect(() =>
      assessRisk({
        probability: 0.72,
        volatility: Infinity,
        dataStatus: 'LIVE',
      }),
    ).toThrow(
      'risk volatility must be a non-negative finite number',
    );
  });

  it('rejects an invalid data status', () => {
    expect(() =>
      assessRisk({
        probability: 0.72,
        volatility: 0.01,
        dataStatus:
          'INVALID' as RiskAssessmentInput['dataStatus'],
      }),
    ).toThrow(
      'risk data status is invalid',
    );
  });
});