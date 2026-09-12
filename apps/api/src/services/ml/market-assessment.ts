import {
  predictSignalWithRisk,
  type PredictionRiskRequest,
} from './prediction-risk-service';
import {
  buildFeatureEvidence,
  type FeatureEvidence,
} from './feature-evidence';
import type { MarketFeatureRow } from '../market-data/features';

export interface MarketAssessmentRequest
  extends Omit<PredictionRiskRequest, 'features'> {
  modelFeatures: number[];
  features: MarketFeatureRow;
}

export interface MarketAssessment {
  signal: Awaited<
    ReturnType<typeof predictSignalWithRisk>
  >['signal'];
  risk: Awaited<
    ReturnType<typeof predictSignalWithRisk>
  >['risk'];
  evidence: FeatureEvidence[];
}

export async function assessMarket(
  request: MarketAssessmentRequest,
): Promise<MarketAssessment> {
  const predictionRisk = await predictSignalWithRisk({
    artifactPath: request.artifactPath,
    features: request.modelFeatures,
    volatility: request.volatility,
    dataStatus: request.dataStatus,
  });

  const evidence = buildFeatureEvidence(request.features);

  return {
    signal: predictionRisk.signal,
    risk: predictionRisk.risk,
    evidence,
  };
}