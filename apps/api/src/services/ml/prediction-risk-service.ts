import {
  predictSignal,
  type PredictionSignalResult,
} from './prediction-service';
import {
  assessRisk,
  type RiskAssessment,
  type RiskDataStatus,
} from './risk-engine';
import type { ModelPredictionRequest } from './ml-service';

export interface PredictionRiskRequest extends ModelPredictionRequest {
  volatility: number;
  dataStatus: RiskDataStatus;
}

export interface PredictionRiskResult {
  signal: PredictionSignalResult;
  risk: RiskAssessment;
}

export async function predictSignalWithRisk(
  request: PredictionRiskRequest,
): Promise<PredictionRiskResult> {
  const signal = await predictSignal({
    artifactPath: request.artifactPath,
    features: request.features,
  });

  const risk = assessRisk({
    probability: signal.probability,
    volatility: request.volatility,
    dataStatus: request.dataStatus,
  });

  return {
    signal,
    risk,
  };
}