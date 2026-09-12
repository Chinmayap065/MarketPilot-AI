export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type RiskDataStatus =
  | 'LIVE'
  | 'DELAYED'
  | 'STALE'
  | 'UNAVAILABLE';

export interface RiskAssessmentInput {
  probability: number;
  volatility: number;
  dataStatus: RiskDataStatus;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  rationale: string;
}

const MEDIUM_VOLATILITY_THRESHOLD = 0.02;
const HIGH_VOLATILITY_THRESHOLD = 0.05;
const MEDIUM_PROBABILITY_THRESHOLD = 0.60;

function validateProbability(
  probability: number,
): void {
  if (
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    throw new Error(
      'risk probability must be between 0 and 1',
    );
  }
}

function validateVolatility(
  volatility: number,
): void {
  if (
    !Number.isFinite(volatility) ||
    volatility < 0
  ) {
    throw new Error(
      'risk volatility must be a non-negative finite number',
    );
  }
}

function validateDataStatus(
  dataStatus: RiskDataStatus,
): void {
  const validStatuses: RiskDataStatus[] = [
    'LIVE',
    'DELAYED',
    'STALE',
    'UNAVAILABLE',
  ];

  if (!validStatuses.includes(dataStatus)) {
    throw new Error(
      'risk data status is invalid',
    );
  }
}

export function assessRisk(
  input: RiskAssessmentInput,
): RiskAssessment {
  validateProbability(
    input.probability,
  );

  validateVolatility(
    input.volatility,
  );

  validateDataStatus(
    input.dataStatus,
  );

  if (
    input.dataStatus === 'STALE' ||
    input.dataStatus === 'UNAVAILABLE'
  ) {
    return {
      riskLevel: 'HIGH',
      rationale:
        'Market data is stale or unavailable.',
    };
  }

  if (
    input.volatility >=
    HIGH_VOLATILITY_THRESHOLD
  ) {
    return {
      riskLevel: 'HIGH',
      rationale:
        'Market volatility is elevated.',
    };
  }

  if (
    input.volatility >=
    MEDIUM_VOLATILITY_THRESHOLD ||
    input.probability <
      MEDIUM_PROBABILITY_THRESHOLD
  ) {
    const reasons: string[] = [];

    if (
      input.volatility >=
      MEDIUM_VOLATILITY_THRESHOLD
    ) {
      reasons.push(
        'market volatility is elevated',
      );
    }

    if (
      input.probability <
      MEDIUM_PROBABILITY_THRESHOLD
    ) {
      reasons.push(
        'prediction probability is relatively low',
      );
    }

    return {
      riskLevel: 'MEDIUM',
      rationale: `${reasons.join(' and ')}.`,
    };
  }

  return {
    riskLevel: 'LOW',
    rationale:
      'Market volatility is controlled and prediction probability is sufficiently directional.',
  };
}