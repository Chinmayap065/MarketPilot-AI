import {
  predictModel,
  type ModelPredictionRequest,
  type ModelPredictionResult,
} from './ml-service';

import {
  buildPredictionSignal,
  type PredictionSignal,
} from './prediction-signal';

export interface PredictionSignalResult
  extends PredictionSignal {}

export async function predictSignal(
  request: ModelPredictionRequest,
): Promise<PredictionSignalResult> {
  const prediction: ModelPredictionResult =
    await predictModel(request);

  return buildPredictionSignal({
    predictedClass:
      prediction.predictedClass,
    probability:
      prediction.probability,
    modelName:
      prediction.model.name,
    modelVersion:
      prediction.model.version,
    horizon:
      prediction.horizon,
  });
}