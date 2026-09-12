import type { MarketAssessment } from './market-assessment';

export type Recommendation =
  | 'POTENTIAL_UPSIDE'
  | 'POTENTIAL_DOWNSIDE'
  | 'WATCH'
  | 'INSUFFICIENT_DATA';

export interface RecommendationResult {
  recommendation: Recommendation;
  rationale: string;
}

const MIN_DIRECTIONAL_PROBABILITY = 0.60;

export function buildRecommendation(
  assessment: MarketAssessment,
): RecommendationResult {
  if (assessment.risk.riskLevel === 'HIGH') {
    return {
      recommendation: 'WATCH',
      rationale:
        'Prediction direction is available, but current risk is high.',
    };
  }

  if (
    assessment.signal.probability <
    MIN_DIRECTIONAL_PROBABILITY
  ) {
    return {
      recommendation: 'WATCH',
      rationale:
        'Prediction probability is not sufficiently directional.',
    };
  }

  if (assessment.signal.direction === 'UP') {
    return {
      recommendation: 'POTENTIAL_UPSIDE',
      rationale:
        'The model indicates a sufficiently directional upside probability with acceptable risk.',
    };
  }

  return {
    recommendation: 'POTENTIAL_DOWNSIDE',
    rationale:
      'The model indicates a sufficiently directional downside probability with acceptable risk.',
  };
}